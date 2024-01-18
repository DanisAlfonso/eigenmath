void
eval_simplify(struct atom *p1)
{
	push(cadr(p1));
	evalg();
	simplify();
}

void
simplify(void)
{
	struct atom *p1;
	p1 = pop();
	if (istensor(p1))
		simplify_tensor(p1);
	else
		simplify_scalar(p1);
}

void
simplify_tensor(struct atom *p1)
{
	int i, n;
	p1 = copy_tensor(p1);
	push(p1); // make visible to gc
	n = p1->u.tensor->nelem;
	for (i = 0; i < n; i++) {
		push(p1->u.tensor->elem[i]);
		simplify();
		p1->u.tensor->elem[i] = pop();
	}
}

void
simplify_scalar(struct atom *p1)
{
	int h;

	// already simple?

	if (!iscons(p1)) {
		push(p1);
		return;
	}

	fpush(p1); // make visible to gc

	h = tos;
	push(car(p1));
	p1 = cdr(p1);

	while (iscons(p1)) {
		push(car(p1));
		simplify();
		p1 = cdr(p1);
	}

	fpop();

	list(tos - h);
	evalg();

	simplify_pass1();
	simplify_pass2(); // try exponential form
	simplify_pass3(); // try polar form
}

void
simplify_pass1(void)
{
	struct atom *p1, *NUM, *DEN, *R, *T;

	p1 = pop();

	// already simple?

	if (!iscons(p1)) {
		push(p1);
		return;
	}

	if (car(p1) == symbol(ADD)) {
		push(p1);
		rationalize();
		T = pop();
		if (car(T) == symbol(ADD)) {
			push(p1); // no change
			return;
		}
	} else
		T = p1;

	push(T);
	numerator();
	NUM = pop();

	push(T);
	denominator();
	evalf(); // to expand denominator
	DEN = pop();

	// if DEN is a sum then rationalize it

	if (car(DEN) == symbol(ADD)) {
		push(DEN);
		rationalize();
		T = pop();
		if (car(T) != symbol(ADD)) {
			// update NUM
			push(T);
			denominator();
			evalf(); // to expand denominator
			push(NUM);
			multiply();
			NUM = pop();
			// update DEN
			push(T);
			numerator();
			DEN = pop();
		}
	}

	// are NUM and DEN congruent sums?

	if (car(NUM) != symbol(ADD) || car(DEN) != symbol(ADD) || lengthf(NUM) != lengthf(DEN)) {
		// no, but NUM over DEN might be simpler than p1
		push(NUM);
		push(DEN);
		divide();
		T = pop();
		if (complexity(T) < complexity(p1))
			p1 = T;
		push(p1);
		return;
	}

	push(cadr(NUM)); // push first term of numerator
	push(cadr(DEN)); // push first term of denominator
	divide();

	R = pop(); // provisional ratio

	push(R);
	push(DEN);
	multiply();

	push(NUM);
	subtract();

	T = pop();

	if (iszero(T))
		p1 = R;

	push(p1);
}

// try exponential form

void
simplify_pass2(void)
{
	struct atom *p1, *p2;

	p1 = pop();

	// already simple?

	if (!iscons(p1)) {
		push(p1);
		return;
	}

	push(p1);
	circexp();
	rationalize();
	evalf(); // to normalize
	p2 = pop();

	if (complexity(p1) <= complexity(p2))
		push(p1);
	else
		push(p2);
}

// try polar form

void
simplify_pass3(void)
{
	struct atom *p1, *p2;

	p1 = pop();

	if (car(p1) != symbol(ADD) || !findf(p1, imaginaryunit)) {
		push(p1);
		return;
	}

	push(p1);
	polar();
	p2 = pop();

	if (complexity(p1) <= complexity(p2))
		push(p1);
	else
		push(p2);
}

int
complexity(struct atom *p)
{
	int n = 1;

	while (iscons(p)) {
		n += complexity(car(p));
		p = cdr(p);
	}

	return n;
}
