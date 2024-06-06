void
eval_taylor(struct atom *p1)
{
	int h, i, n;
	struct atom *F, *X, *A, *C;

	push(cadr(p1));
	evalf();
	F = pop();

	push(caddr(p1));
	evalf();
	X = pop();

	push(cadddr(p1));
	evalf();
	n = pop_integer();

	p1 = cddddr(p1);

	if (iscons(p1)) {
		push(car(p1));
		evalf();
	} else
		push_integer(0); // default expansion point

	A = pop();

	h = tos;

	push(F);	// f(a)
	push(X);
	push(A);
	subst();
	evalf();

	push_integer(1);
	C = pop();

	for (i = 1; i <= n; i++) {

		push(F);	// f = f'
		push(X);
		derivative();
		F = pop();

		if (car(F) == symbol(DERIVATIVE))
			stopf("taylor: derivative err");

		if (iszero(F))
			break;

		push(C);	// c = c * (x - a)
		push(X);
		push(A);
		subtract();
		multiply();
		C = pop();

		push(F);	// f(a)
		push(X);
		push(A);
		subst();
		evalf();

		push(C);
		multiply();
		push_integer(i);
		factorial();
		divide();
	}

	add_terms(tos - h);
}
