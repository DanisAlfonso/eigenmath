void
eval_polar(struct atom *p1)
{
	push(cadr(p1));
	evalf();
	polar();
}

void
polar(void)
{
	int i, n;
	struct atom *p1, *p2;

	p1 = pop();

	if (istensor(p1)) {
		p1 = copy_tensor(p1);
		n = p1->u.tensor->nelem;
		for (i = 0; i < n; i++) {
			push(p1->u.tensor->elem[i]);
			polar();
			p1->u.tensor->elem[i] = pop();
		}
		push(p1);
		return;
	}

	push(p1);
	mag();
	push(p1);
	arg();
	p2 = pop();
	if (isdouble(p2)) {
		push_double(p2->u.d / M_PI);
		push_symbol(PI);
		push(imaginaryunit);
		multiply_factors(3);
	} else {
		// the result of arg is arctan
		push(p2);
		push(imaginaryunit);
		multiply();
	}
	expfunc();
	multiply();
}
