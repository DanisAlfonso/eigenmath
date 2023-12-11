void
eval_subst(struct atom *p1)
{
	push(cadddr(p1));
	evalf();
	push(caddr(p1));
	evalf();
	push(cadr(p1));
	evalf();
	subst();
	evalf(); // normalize
}

// cannot do any evalf in subst because subst is used by func defn

void
subst(void)
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
			subst();
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

	while (iscons(p1)) {
		push(car(p1));
		push(p2);
		push(p3);
		subst();
		p1 = cdr(p1);
	}

	list(tos - h);
}
