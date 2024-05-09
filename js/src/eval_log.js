function
eval_log(p1)
{
	push(cadr(p1));
	evalf();
	logfunc();
}

function
logfunc()
{
	var d, h, i, n, p1, p2;

	p1 = pop();

	if (istensor(p1)) {
		p1 = copy_tensor(p1);
		n = p1.elem.length;
		for (i = 0; i < n; i++) {
			push(p1.elem[i]);
			logfunc();
			p1.elem[i] = pop();
		}
		push(p1);
		return;
	}

	if (hasdouble(p1)) {
		push(p1);
		floatfunc();
		p1 = pop();
	}

	if (iszero(p1)) {
		push_symbol(LOG);
		push_integer(0);
		list(2);
		return;
	}

	if (isdouble(p1)) {
		push(p1);
		d = pop_double();
		if (d > 0.0) {
			push_double(Math.log(d));
			return;
		}
	}

	// log(z) -> log(mag(z)) + i arg(z)

	if (isdouble(p1) || isdoublez(p1)) {
		push(p1);
		magfunc();
		logfunc();
		push(p1);
		argfunc();
		push(imaginaryunit);
		multiply();
		add();
		return;
	}

	// log(1) -> 0

	if (isplusone(p1)) {
		push_integer(0);
		return;
	}

	// log(e) -> 1

	if (p1 == symbol(EXP1)) {
		push_integer(1);
		return;
	}

	if (isnegativenumber(p1)) {
		push(p1);
		negate();
		logfunc();
		push(imaginaryunit);
		push_symbol(PI);
		multiply();
		add();
		return;
	}

	// log(10) -> log(2) + log(5)

	if (isrational(p1)) {
		h = stack.length;
		push(p1);
		factor_factor();
		for (i = h; i < stack.length; i++) {
			p2 = stack[i];
			if (car(p2) == symbol(POWER)) {
				push(caddr(p2)); // exponent
				push_symbol(LOG);
				push(cadr(p2)); // base
				list(2);
				multiply();
			} else {
				push_symbol(LOG);
				push(p2);
				list(2);
			}
			stack[i] = pop();
		}
		add_terms(stack.length - h);
		return;
	}

	// log(a ^ b) -> b log(a)

	if (car(p1) == symbol(POWER)) {
		push(caddr(p1));
		push(cadr(p1));
		logfunc();
		multiply();
		return;
	}

	// log(a * b) -> log(a) + log(b)

	if (car(p1) == symbol(MULTIPLY)) {
		h = stack.length;
		p1 = cdr(p1);
		while (iscons(p1)) {
			push(car(p1));
			logfunc();
			p1 = cdr(p1);
		}
		add_terms(stack.length - h);
		return;
	}

	push_symbol(LOG);
	push(p1);
	list(2);
}
