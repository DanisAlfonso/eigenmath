void
eval_arg(struct atom *p1)
{
	push(cadr(p1));
	evalf();
	polar(); // normalize
	arg();
}

// may return a denormalized angle

void
arg(void)
{
	int i, n;
	struct atom *p1, *num, *den;

	p1 = pop();

	if (istensor(p1)) {
		p1 = copy_tensor(p1);
		n = p1->u.tensor->nelem;
		for (i = 0; i < n; i++) {
			push(p1->u.tensor->elem[i]);
			arg();
			p1->u.tensor->elem[i] = pop();
		}
		push(p1);
		return;
	}

	push(p1);
	numden();
	num = pop();
	den = pop();
	push(num);
	arg_nib();
	push(den);
	arg_nib();
	subtract();

	if (isdoublesomewhere(p1))
		floatfunc();
}

void
arg_nib(void)
{
	int h;
	struct atom *p1, *RE, *IM;

	p1 = pop();

	if (isrational(p1)) {
		if (isnegativenumber(p1)) {
			push_symbol(PI);
			negate();
		} else
			push_integer(0);
		return;
	}

	if (isdouble(p1)) {
		if (isnegativenumber(p1))
			push_double(-M_PI);
		else
			push_double(0.0);
		return;
	}

	// (-1) ^ expr

	if (car(p1) == symbol(POWER) && isminusone(cadr(p1))) {
		push_symbol(PI);
		push(caddr(p1));
		multiply();
		return;
	}

	// e ^ expr

	if (car(p1) == symbol(POWER) && cadr(p1) == symbol(EXP1)) {
		push(caddr(p1));
		imag();
		return;
	}

	if (car(p1) == symbol(MULTIPLY)) {
		h = tos;
		p1 = cdr(p1);
		while (iscons(p1)) {
			push(car(p1));
			arg();
			p1 = cdr(p1);
		}
		add_terms(tos - h);
		return;
	}

	if (car(p1) == symbol(ADD)) {
		push(p1);
		rect(); // convert polar and clock forms
		p1 = pop();
		push(p1);
		real();
		RE = pop();
		push(p1);
		imag();
		IM = pop();
		push(IM);
		push(RE);
		arctan();
		return;
	}

	push_integer(0); // p1 is real
}
