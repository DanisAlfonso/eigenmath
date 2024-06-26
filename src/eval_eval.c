void
eval_eval(struct atom *p1)
{
	push(cadr(p1));
	evalf();
	p1 = cddr(p1);
	while (iscons(p1)) {
		push(car(p1));
		evalf();
		push(cadr(p1));
		evalf();
		asubst();
		p1 = cddr(p1);
	}
}

// arithmetic subst

void
asubst(void)
{
	int h, i, n;
	struct atom *p1, *p2, *p3;

	p3 = pop(); // new expr
	p2 = pop(); // old expr
	p1 = pop(); // expr

	if (p2 == symbol(NIL) || p3 == symbol(NIL)) {
		push(p1);
		return;
	}

	if (istensor(p1)) {
		p1 = copy_tensor(p1);
		n = p1->u.tensor->nelem;
		for (i = 0; i < n; i++) {
			push(p1->u.tensor->elem[i]);
			push(p2);
			push(p3);
			asubst();
			p1->u.tensor->elem[i] = pop();
		}
		push(p1);
		return;
	}

	if (equal(p1, p2)) {
		push(p3);
		return;
	}

	if (!iscons(p1)) {
		push(p1);
		return;
	}

	// depth first

	h = tos;

	push(car(p1)); // func name
	p1 = cdr(p1);

	while (iscons(p1)) {
		push(car(p1));
		push(p2);
		push(p3);
		asubst();
		p1 = cdr(p1);
	}

	list(tos - h);

	evalf(); // normalize

	p1 = pop();

	if (car(p1) == symbol(ADD) && car(p2) == symbol(ADD) && addcmp(p1, p2)) {
		push(p1);
		push(p2);
		subtract();
		push(p3);
		add();
		return;
	}

	if (car(p1) == symbol(MULTIPLY) && car(p2) == symbol(MULTIPLY) && mulcmp(p1, p2)) {
		push(p1);
		push(p2);
		divide();
		push(p3);
		multiply();
		return;
	}

	if (isexponential(p1) && isexponential(p2) && expcmp(p1, p2)) {
		push(p1);
		push(p2);
		divide();
		push(p3);
		multiply();
		return;
	}

	push(p1);
}

int
addcmp(struct atom *p1, struct atom *p2)
{
	while (iscons(p1) && iscons(p2)) {
		if (equal(car(p1), car(p2)))
			p2 = cdr(p2);
		p1 = cdr(p1);
	}
	if (iscons(p2))
		return 0;
	else
		return 1;
}

int
mulcmp(struct atom *p1, struct atom *p2)
{
	while (iscons(p1) && iscons(p2)) {
		if (equal(car(p1), car(p2)) || (isexponential(car(p1)) && isexponential(car(p2)) && expcmp(car(p1), car(p2))))
			p2 = cdr(p2);
		p1 = cdr(p1);
	}
	if (iscons(p2))
		return 0;
	else
		return 1;
}

int
expcmp(struct atom *p1, struct atom *p2)
{
	p1 = caddr(p1);
	p2 = caddr(p2);
	if (car(p1) != symbol(ADD))
		return 0;
	if (car(p2) == symbol(ADD))
		return addcmp(p1, p2);
	p1 = cdr(p1);
	while (iscons(p1)) {
		if (equal(car(p1), p2))
			return 1;
		p1 = cdr(p1);
	}
	return 0;
}
