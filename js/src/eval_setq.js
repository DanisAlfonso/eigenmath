function
eval_setq(p1)
{
	var p2;

	push_symbol(NIL); // return value

	if (caadr(p1) == symbol(INDEX)) {
		setq_indexed(p1);
		return;
	}

	if (iscons(cadr(p1))) {
		setq_usrfunc(p1);
		return;
	}

	if (!isusersymbol(cadr(p1)))
		stopf("user symbol expected");

	push(caddr(p1));
	evalf();
	p2 = pop();

	set_symbol(cadr(p1), p2, symbol(NIL));
}

// Example: a[1] = b
//
// p1----->cons--->cons------------------->cons
//         |       |                       |
//         setq    cons--->cons--->cons    b
//                 |       |       |
//                 index   a       1
//
// caadr(p1) = index
// cadadr(p1) = a
// caddr(p1) = b

function
setq_indexed(p1)
{
	var h, LVAL, RVAL, S;

	S = cadadr(p1);

	if (!isusersymbol(S))
		stopf("user symbol expected");

	push(S);
	evalf();

	push(caddr(p1));
	evalf();

	RVAL = pop();
	LVAL = pop();

	h = stack.length;

	p1 = cddadr(p1);

	while (iscons(p1)) {
		push(car(p1));
		evalf();
		p1 = cdr(p1);
	}

	set_component(LVAL, RVAL, h);

	set_symbol(S, LVAL, symbol(NIL));
}

function
set_component(LVAL, RVAL, h)
{
	var i, k, m, n, t;

	if (!istensor(LVAL))
		stopf("index error");

	// n is number of indices

	n = stack.length - h;

	if (n < 1 || n > LVAL.dim.length)
		stopf("index error");

	// k is combined index

	k = 0;

	for (i = 0; i < n; i++) {
		push(stack[h + i]);
		t = pop_integer();
		if (t < 1 || t > LVAL.dim[i])
			stopf("index error");
		k = k * LVAL.dim[i] + t - 1;
	}

	stack.length = h; // pop all

	if (istensor(RVAL)) {
		m = RVAL.dim.length;
		if (n + m != LVAL.dim.length)
			stopf("index error");
		for (i = 0; i < m; i++)
			if (LVAL.dim[n + i] != RVAL.dim[i])
				stopf("index error");
		m = RVAL.elem.length;
		for (i = 0; i < m; i++)
			LVAL.elem[m * k + i] = RVAL.elem[i];
	} else {
		if (n != LVAL.dim.length)
			stopf("index error");
		LVAL.elem[k] = RVAL;
	}
}

// Example:
//
//      f(x,y)=x^y
//
// For this definition, p1 points to the following structure.
//
//     p1
//      |
//   ___v__    ______                        ______
//  |CONS  |->|CONS  |--------------------->|CONS  |
//  |______|  |______|                      |______|
//      |         |                             |
//   ___v__    ___v__    ______    ______    ___v__    ______    ______
//  |SETQ  |  |CONS  |->|CONS  |->|CONS  |  |CONS  |->|CONS  |->|CONS  |
//  |______|  |______|  |______|  |______|  |______|  |______|  |______|
//                |         |         |         |         |         |
//             ___v__    ___v__    ___v__    ___v__    ___v__    ___v__
//            |SYM f |  |SYM x |  |SYM y |  |POWER |  |SYM x |  |SYM y |
//            |______|  |______|  |______|  |______|  |______|  |______|
//
// We have
//
//	caadr(p1) points to f
//	cdadr(p1) points to the list (x y)
//	caddr(p1) points to (power x y)

function
setq_usrfunc(p1)
{
	var A, B, C, F;

	F = caadr(p1); // function name
	A = cdadr(p1); // function args
	B = caddr(p1); // function body

	if (!isusersymbol(F))
		stopf("user symbol expected");

	if (lengthf(A) > 9)
		stopf("more than 9 arguments");

	push(B);
	convert_body(A);
	C = pop();

	set_symbol(F, B, C);
}

function
convert_body(A)
{
	if (!iscons(A))
		return;

	push(car(A));
	push_symbol(ARG1);
	subst();

	A = cdr(A);
	if (!iscons(A))
		return;

	push(car(A));
	push_symbol(ARG2);
	subst();

	A = cdr(A);
	if (!iscons(A))
		return;

	push(car(A));
	push_symbol(ARG3);
	subst();

	A = cdr(A);
	if (!iscons(A))
		return;

	push(car(A));
	push_symbol(ARG4);
	subst();

	A = cdr(A);
	if (!iscons(A))
		return;

	push(car(A));
	push_symbol(ARG5);
	subst();

	A = cdr(A);

	if (!iscons(A))
		return;

	push(car(A));
	push_symbol(ARG6);
	subst();

	A = cdr(A);
	if (!iscons(A))
		return;

	push(car(A));
	push_symbol(ARG7);
	subst();

	A = cdr(A);
	if (!iscons(A))
		return;

	push(car(A));
	push_symbol(ARG8);
	subst();

	A = cdr(A);
	if (!iscons(A))
		return;

	push(car(A));
	push_symbol(ARG9);
	subst();
}
