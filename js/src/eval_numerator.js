function
eval_numerator(p1)
{
	push(cadr(p1));
	evalf();
	numerator();
}

function
numerator()
{
	numden();
	swap();
	pop(); // discard denominator
}
