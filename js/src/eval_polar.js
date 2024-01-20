function
eval_polar(p1)
{
	push(cadr(p1));
	evalf();
	polar();
}

function
polar()
{
	var i, n, p1, p2;

	p1 = pop();

	if (istensor(p1)) {
		p1 = copy_tensor(p1);
		n = p1.elem.length;
		for (i = 0; i < n; i++) {
			push(p1.elem[i]);
			polar();
			p1.elem[i] = pop();
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
		push_double(p2.d / Math.PI);
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
