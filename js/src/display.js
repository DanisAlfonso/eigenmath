const HPAD = 10;
const VPAD = 10;

const TABLE_HSPACE = 12;
const TABLE_VSPACE = 10;

const DELIM_STROKE = 0.09;
const FRAC_STROKE = 0.07;

const LEFT_PAREN = 40;
const RIGHT_PAREN = 41;
const LESS_SIGN = 60;
const EQUALS_SIGN = 61;
const GREATER_SIGN = 62;
const LOWER_F = 102;
const LOWER_N = 110;

const PLUS_SIGN = 177;
const MINUS_SIGN = 178;
const MULTIPLY_SIGN = 179;
const GREATEREQUAL = 180;
const LESSEQUAL = 181;

const EMIT_SPACE = 1;
const EMIT_CHAR = 2;
const EMIT_LIST = 3;
const EMIT_SUPERSCRIPT = 4;
const EMIT_SUBSCRIPT = 5;
const EMIT_SUBEXPR = 6;
const EMIT_SMALL_SUBEXPR = 7;
const EMIT_FRACTION = 8;
const EMIT_SMALL_FRACTION = 9;
const EMIT_TABLE = 10;

var emit_level;
var emit_text_mode;

function
display()
{
	var d, h, p1, w, x, y;

	emit_level = 0;

	p1 = pop();

	if (isstring(p1))
		emit_text_mode = 1;
	else
		emit_text_mode = 0;

	emit_list(p1);

	p1 = pop();

	h = height(p1);
	d = depth(p1);
	w = width(p1);

	x = HPAD;
	y = Math.round(h + VPAD);

	h += d + 2 * VPAD;
	w += 2 * HPAD;

	h = Math.round(h);
	w = Math.round(w);

	h = "height='" + h + "'";
	w = "width='" + w + "'";

	outbuf = "<svg " + h + w + ">";

	draw_formula(x, y, p1);

	outbuf += "</svg><br>";

	stdout.innerHTML += outbuf;
}

function
emit_args(p)
{
	var t;

	p = cdr(p);

	if (!iscons(p)) {
		emit_roman_string("(");
		emit_roman_string(")");
		return;
	}

	t = stack.length;

	emit_expr(car(p));

	p = cdr(p);

	while (iscons(p)) {
		emit_roman_string(",");
		emit_thin_space();
		emit_expr(car(p));
		p = cdr(p);
	}

	emit_update_list(t);

	emit_update_subexpr();
}

function
emit_base(p)
{
	if (isnegativenumber(p) || isfraction(p) || isdouble(p) || car(p) == symbol(ADD) || car(p) == symbol(MULTIPLY) || car(p) == symbol(POWER))
		emit_subexpr(p);
	else
		emit_expr(p);
}

function
emit_denominators(p)
{
	var n, q, s, t;

	t = stack.length;
	n = count_denominators(p);
	p = cdr(p);

	while (iscons(p)) {

		q = car(p);
		p = cdr(p);

		if (!isdenominator(q))
			continue;

		if (stack.length > t)
			emit_medium_space();

		if (isrational(q)) {
			s = bignum_itoa(q.b);
			emit_roman_string(s);
			continue;
		}

		if (isminusone(caddr(q))) {
			q = cadr(q);
			if (car(q) == symbol(ADD) && n == 1)
				emit_expr(q); // parens not needed
			else
				emit_factor(q);
		} else {
			emit_base(cadr(q));
			emit_numeric_exponent(caddr(q)); // sign is not emitted
		}
	}

	emit_update_list(t);
}

function
emit_double(p)
{
	var i, j, k, s, t;

	s = fmtnum(p.d);

	k = 0;

	while (k < s.length && s.charAt(k) != "." && s.charAt(k) != "E" && s.charAt(k) != "e")
		k++;

	emit_roman_string(s.substring(0, k));

	// handle trailing zeroes

	if (s.charAt(k) == ".") {

		i = k++;

		while (k < s.length && s.charAt(k) != "E" && s.charAt(k) != "e")
			k++;

		j = k;

		while (s.charAt(j - 1) == "0")
			j--;

		if (j - i > 1)
			emit_roman_string(s.substring(i, j));
	}

	if (s.charAt(k) != "E" && s.charAt(k) != "e")
		return;

	k++;

	emit_roman_char(MULTIPLY_SIGN);

	emit_roman_string("10");

	// superscripted exponent

	emit_level++;

	t = stack.length;

	// sign of exponent

	if (s.charAt(k) == "+")
		k++;
	else if (s.charAt(k) == "-") {
		emit_roman_char(MINUS_SIGN);
		emit_thin_space();
		k++;
	}

	// skip leading zeroes in exponent

	while (s.charAt(k) == "0")
		k++;

	emit_roman_string(s.substring(k));

	emit_update_list(t);

	emit_level--;

	emit_update_superscript();
}

function
emit_exponent(p)
{
	if (isnum(p) && !isnegativenumber(p)) {
		emit_numeric_exponent(p); // sign is not emitted
		return;
	}

	emit_level++;
	emit_list(p);
	emit_level--;

	emit_update_superscript();
}

function
emit_expr(p)
{
	if (isnegativeterm(p) || (car(p) == symbol(ADD) && isnegativeterm(cadr(p)))) {
		emit_roman_char(MINUS_SIGN);
		emit_thin_space();
	}

	if (car(p) == symbol(ADD))
		emit_expr_nib(p);
	else
		emit_term(p);
}

function
emit_expr_nib(p)
{
	p = cdr(p);
	emit_term(car(p));
	p = cdr(p);
	while (iscons(p)) {
		if (isnegativeterm(car(p)))
			emit_infix_operator(MINUS_SIGN);
		else
			emit_infix_operator(PLUS_SIGN);
		emit_term(car(p));
		p = cdr(p);
	}
}

function
emit_factor(p)
{
	if (isrational(p)) {
		emit_rational(p);
		return;
	}

	if (isdouble(p)) {
		emit_double(p);
		return;
	}

	if (issymbol(p)) {
		emit_symbol(p);
		return;
	}

	if (isstring(p)) {
		emit_string(p);
		return;
	}

	if (istensor(p)) {
		emit_tensor(p);
		return;
	}

	if (iscons(p)) {
		if (car(p) == symbol(POWER))
			emit_power(p);
		else if (car(p) == symbol(ADD) || car(p) == symbol(MULTIPLY))
			emit_subexpr(p);
		else
			emit_function(p);
		return;
	}
}

function
emit_fraction(p)
{
	emit_numerators(p);
	emit_denominators(p);
	emit_update_fraction();
}

function
emit_function(p)
{
	// d(f(x),x)

	if (car(p) == symbol(DERIVATIVE)) {
		emit_roman_string("d");
		emit_args(p);
		return;
	}

	// n!

	if (car(p) == symbol(FACTORIAL)) {
		p = cadr(p);
		if (isposint(p) || issymbol(p))
			emit_expr(p);
		else
			emit_subexpr(p);
		emit_roman_string("!");
		return;
	}

	// A[1,2]

	if (car(p) == symbol(INDEX)) {
		p = cdr(p);
		if (issymbol(car(p)))
			emit_symbol(car(p));
		else
			emit_subexpr(car(p));
		emit_indices(p);
		return;
	}

	if (car(p) == symbol(SETQ) || car(p) == symbol(TESTEQ)) {
		emit_expr(cadr(p));
		emit_infix_operator(EQUALS_SIGN);
		emit_expr(caddr(p));
		return;
	}

	if (car(p) == symbol(TESTGE)) {
		emit_expr(cadr(p));
		emit_infix_operator(GREATEREQUAL);
		emit_expr(caddr(p));
		return;
	}

	if (car(p) == symbol(TESTGT)) {
		emit_expr(cadr(p));
		emit_infix_operator(GREATER_SIGN);
		emit_expr(caddr(p));
		return;
	}

	if (car(p) == symbol(TESTLE)) {
		emit_expr(cadr(p));
		emit_infix_operator(LESSEQUAL);
		emit_expr(caddr(p));
		return;
	}

	if (car(p) == symbol(TESTLT)) {
		emit_expr(cadr(p));
		emit_infix_operator(LESS_SIGN);
		emit_expr(caddr(p));
		return;
	}

	// default

	if (issymbol(car(p)))
		emit_symbol(car(p));
	else
		emit_subexpr(car(p));

	emit_args(p);
}

function
emit_indices(p)
{
	emit_roman_string("[");

	p = cdr(p);

	if (iscons(p)) {
		emit_expr(car(p));
		p = cdr(p);
		while (iscons(p)) {
			emit_roman_string(",");
			emit_thin_space();
			emit_expr(car(p));
			p = cdr(p);
		}
	}

	emit_roman_string("]");
}

function
emit_infix_operator(char_num)
{
	emit_thick_space();
	emit_roman_char(char_num);
	emit_thick_space();
}

function
emit_italic_char(char_num)
{
	var d, font_num, h, w;

	if (emit_level == 0)
		font_num = ITALIC_FONT;
	else
		font_num = SMALL_ITALIC_FONT;

	h = get_cap_height(font_num);
	d = get_char_depth(font_num, char_num);
	w = get_char_width(font_num, char_num);

	push_double(EMIT_CHAR);
	push_double(h);
	push_double(d);
	push_double(w);
	push_double(font_num);
	push_double(char_num);

	list(6);

	if (char_num == LOWER_F)
		emit_thin_space();
}

function
emit_italic_string(s)
{
	var i;
	for (i = 0; i < s.length; i++)
		emit_italic_char(s.charCodeAt(i));
}

function
emit_list(p)
{
	var t = stack.length;
	emit_expr(p);
	emit_update_list(t);
}

function
emit_matrix(p, d, k)
{
	var i, j, m, n, span;

	if (d == p.dim.length) {
		emit_list(p.elem[k]);
		return;
	}

	// compute element span

	span = 1;

	n = p.dim.length;

	for (i = d + 2; i < n; i++)
		span *= p.dim[i];

	n = p.dim[d];		// number of rows
	m = p.dim[d + 1];	// number of columns

	for (i = 0; i < n; i++)
		for (j = 0; j < m; j++)
			emit_matrix(p, d + 2, k + (i * m + j) * span);

	emit_update_table(n, m);
}

function
emit_medium_space()
{
	var w;

	if (emit_level == 0)
		w = 0.5 * get_char_width(ROMAN_FONT, LOWER_N);
	else
		w = 0.5 * get_char_width(SMALL_ROMAN_FONT, LOWER_N);

	push_double(EMIT_SPACE);
	push_double(0.0);
	push_double(0.0);
	push_double(w);

	list(4);
}

function
emit_numerators(p)
{
	var n, q, s, t;

	t = stack.length;
	n = count_numerators(p);
	p = cdr(p);

	while (iscons(p)) {

		q = car(p);
		p = cdr(p);

		if (!isnumerator(q))
			continue;

		if (stack.length > t)
			emit_medium_space();

		if (isrational(q)) {
			s = bignum_itoa(q.a);
			emit_roman_string(s);
			continue;
		}

		if (car(q) == symbol(ADD) && n == 1)
			emit_expr(q); // parens not needed
		else
			emit_factor(q);
	}

	if (stack.length == t)
		emit_roman_string("1"); // no numerators

	emit_update_list(t);
}

// p is rational or double, sign is not emitted

function
emit_numeric_exponent(p)
{
	var s, t;

	emit_level++;

	t = stack.length;

	if (isrational(p)) {
		s = bignum_itoa(p.a);
		emit_roman_string(s);
		if (isfraction(p)) {
			emit_roman_string("/");
			s = bignum_itoa(p.b);
			emit_roman_string(s);
		}
	} else
		emit_double(p);

	emit_update_list(t);

	emit_level--;

	emit_update_superscript();
}

function
emit_power(p)
{
	if (cadr(p) == symbol(EXP1)) {
		emit_roman_string("exp");
		emit_args(cdr(p));
		return;
	}

	if (isimaginaryunit(p)) {
		if (isimaginaryunit(get_binding(symbol(J_LOWER)))) {
			emit_italic_string("j");
			return;
		}
		if (isimaginaryunit(get_binding(symbol(I_LOWER)))) {
			emit_italic_string("i");
			return;
		}
	}

	if (isnegativenumber(caddr(p))) {
		emit_reciprocal(p);
		return;
	}

	emit_base(cadr(p));
	emit_exponent(caddr(p));
}

function
emit_rational(p)
{
	var s, t;

	if (isinteger(p)) {
		s = bignum_itoa(p.a);
		emit_roman_string(s);
		return;
	}

	emit_level++;

	t = stack.length;
	s = bignum_itoa(p.a);
	emit_roman_string(s);
	emit_update_list(t);

	t = stack.length;
	s = bignum_itoa(p.b);
	emit_roman_string(s);
	emit_update_list(t);

	emit_level--;

	emit_update_fraction();
}

// p = y^x where x is a negative number

function
emit_reciprocal(p)
{
	var t;

	emit_roman_string("1"); // numerator

	t = stack.length;

	if (isminusone(caddr(p)))
		emit_expr(cadr(p));
	else {
		emit_base(cadr(p));
		emit_numeric_exponent(caddr(p)); // sign is not emitted
	}

	emit_update_list(t);

	emit_update_fraction();
}

function
emit_roman_char(char_num)
{
	var d, font_num, h, w;

	if (emit_level == 0)
		font_num = ROMAN_FONT;
	else
		font_num = SMALL_ROMAN_FONT;

	h = get_cap_height(font_num);
	if (emit_text_mode)
		d = get_descent(font_num);
	else
		d = get_char_depth(font_num, char_num);
	w = get_char_width(font_num, char_num);

	push_double(EMIT_CHAR);
	push_double(h);
	push_double(d);
	push_double(w);
	push_double(font_num);
	push_double(char_num);

	list(6);
}

function
emit_roman_string(s)
{
	var i;
	for (i = 0; i < s.length; i++)
		emit_roman_char(s.charCodeAt(i));
}

function
emit_string(p)
{
	emit_roman_string(p.string);
}

function
emit_subexpr(p)
{
	emit_list(p);
	emit_update_subexpr();
}

function
emit_symbol(p)
{
	var k, s, t;

	if (p == symbol(EXP1)) {
		emit_roman_string("exp(1)");
		return;
	}

	s = printname(p);

	if (iskeyword(p) || p == symbol(LAST) || p == symbol(TRACE) || p == symbol(TTY)) {
		emit_roman_string(s);
		return;
	}

	k = emit_symbol_fragment(s, 0);

	if (k == s.length)
		return;

	// emit subscript

	emit_level++;

	t = stack.length;

	while (k < s.length)
		k = emit_symbol_fragment(s, k);

	emit_update_list(t);

	emit_level--;

	emit_update_subscript();
}

const symbol_name_tab = [

	"Alpha",
	"Beta",
	"Gamma",
	"Delta",
	"Epsilon",
	"Zeta",
	"Eta",
	"Theta",
	"Iota",
	"Kappa",
	"Lambda",
	"Mu",
	"Nu",
	"Xi",
	"Omicron",
	"Pi",
	"Rho",
	"Sigma",
	"Tau",
	"Upsilon",
	"Phi",
	"Chi",
	"Psi",
	"Omega",

	"alpha",
	"beta",
	"gamma",
	"delta",
	"epsilon",
	"zeta",
	"eta",
	"theta",
	"iota",
	"kappa",
	"lambda",
	"mu",
	"nu",
	"xi",
	"omicron",
	"pi",
	"rho",
	"sigma",
	"tau",
	"upsilon",
	"phi",
	"chi",
	"psi",
	"omega",

	"hbar",
];

const symbol_italic_tab = [
	0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,
	1,1,1,1,1,1,1,1,
	1,1,1,1,1,1,1,1,
	1,1,1,1,1,1,1,1,
	0,
];

function
emit_symbol_fragment(s, k)
{
	var char_num, i, n, t;

	n = symbol_name_tab.length;

	for (i = 0; i < n; i++) {
		t = symbol_name_tab[i];
		if (s.startsWith(t, k))
			break;
	}

	if (i == n) {
		if (isdigit(s.charAt(k)))
			emit_roman_char(s.charCodeAt(k));
		else
			emit_italic_char(s.charCodeAt(k));
		return k + 1;
	}

	char_num = i + 128;

	if (symbol_italic_tab[i])
		emit_italic_char(char_num);
	else
		emit_roman_char(char_num);

	return k + t.length;
}

function
emit_tensor(p)
{
	if (p.dim.length % 2 == 1)
		emit_vector(p); // odd rank
	else
		emit_matrix(p, 0, 0); // even rank
}

function
emit_term(p)
{
	if (car(p) == symbol(MULTIPLY))
		emit_term_nib(p);
	else
		emit_factor(p);
}

function
emit_term_nib(p)
{
	if (find_denominator(p)) {
		emit_fraction(p);
		return;
	}

	// no denominators

	p = cdr(p);

	if (isminusone(car(p)) && !isdouble(car(p)))
		p = cdr(p); // sign already emitted

	emit_factor(car(p));

	p = cdr(p);

	while (iscons(p)) {
		emit_medium_space();
		emit_factor(car(p));
		p = cdr(p);
	}
}

function
emit_thick_space()
{
	var w;

	if (emit_level == 0)
		w = get_char_width(ROMAN_FONT, LOWER_N);
	else
		w = get_char_width(SMALL_ROMAN_FONT, LOWER_N);

	push_double(EMIT_SPACE);
	push_double(0.0);
	push_double(0.0);
	push_double(w);

	list(4);
}

function
emit_thin_space()
{
	var w;

	if (emit_level == 0)
		w = 0.25 * get_char_width(ROMAN_FONT, LOWER_N);
	else
		w = 0.25 * get_char_width(SMALL_ROMAN_FONT, LOWER_N);

	push_double(EMIT_SPACE);
	push_double(0.0);
	push_double(0.0);
	push_double(w);

	list(4);
}

function
emit_update_fraction()
{
	var d, font_num, h, m, opcode, p1, p2, v, w;

	p2 = pop(); // denominator
	p1 = pop(); // numerator

	h = height(p1) + depth(p1);
	d = height(p2) + depth(p2);
	w = Math.max(width(p1), width(p2));

	if (emit_level == 0) {
		opcode = EMIT_FRACTION;
		font_num = ROMAN_FONT;
	} else {
		opcode = EMIT_SMALL_FRACTION;
		font_num = SMALL_ROMAN_FONT;
	}

	m = get_operator_height(font_num);

	v = 0.75 * m; // extra vertical space

	h += v + m;
	d += v - m;

	w += get_char_width(font_num, LOWER_N) / 2; // make horizontal line a bit wider

	push_double(opcode);
	push_double(h);
	push_double(d);
	push_double(w);
	push(p1);
	push(p2);

	list(6);
}

function
emit_update_list(t)
{
	var d, h, i, p1, w;

	if (stack.length - t == 1)
		return;

	h = 0;
	d = 0;
	w = 0;

	for (i = t; i < stack.length; i++) {
		p1 = stack[i];
		h = Math.max(h, height(p1));
		d = Math.max(d, depth(p1));
		w += width(p1);
	}

	list(stack.length - t);
	p1 = pop();

	push_double(EMIT_LIST);
	push_double(h);
	push_double(d);
	push_double(w);
	push(p1);

	list(5);
}

function
emit_update_subexpr()
{
	var d, font_num, h, m, opcode, p1, w;

	p1 = pop();

	h = height(p1);
	d = depth(p1);
	w = width(p1);

	if (emit_level == 0) {
		opcode = EMIT_SUBEXPR;
		font_num = ROMAN_FONT;
	} else {
		opcode = EMIT_SMALL_SUBEXPR;
		font_num = SMALL_ROMAN_FONT;
	}

	h = Math.max(h, get_cap_height(font_num));
	d = Math.max(d, get_descent(font_num));

	// delimiters have vertical symmetry (h - m == d + m)

	if (h > get_cap_height(font_num) || d > get_descent(font_num)) {
		m = get_operator_height(font_num);
		h = Math.max(h, d + 2 * m) + 0.5 * m; // plus a little extra
		d = h - 2 * m; // by symmetry
	}

	w += 2 * get_char_width(font_num, LEFT_PAREN);

	push_double(opcode);
	push_double(h);
	push_double(d);
	push_double(w);
	push(p1);

	list(5);
}

function
emit_update_subscript()
{
	var d, dx, dy, font_num, h, p1, t, w;

	p1 = pop();

	if (emit_level == 0)
		font_num = ROMAN_FONT;
	else
		font_num = SMALL_ROMAN_FONT;

	t = get_char_width(font_num, LOWER_N) / 6;

	h = get_cap_height(font_num);
	d = depth(p1);
	w = t + width(p1);

	dx = t;
	dy = h / 2;

	d += dy;

	push_double(EMIT_SUBSCRIPT);
	push_double(h);
	push_double(d);
	push_double(w);
	push_double(dx);
	push_double(dy);
	push(p1);

	list(7);
}

function
emit_update_superscript()
{
	var d, dx, dy, font_num, h, p1, p2, t, w, y;

	p2 = pop(); // exponent
	p1 = pop(); // base

	if (emit_level == 0)
		font_num = ROMAN_FONT;
	else
		font_num = SMALL_ROMAN_FONT;

	t = get_char_width(font_num, LOWER_N) / 6;

	h = height(p2);
	d = depth(p2);
	w = t + width(p2);

	// y is height of base

	y = height(p1);

	// adjust

	y -= (h + d) / 2;

	y = Math.max(y, get_xheight(font_num));

	dx = t;
	dy = -(y + d);

	h = y + h + d;
	d = 0;

	if (opcode(p1) == EMIT_SUBSCRIPT) {
		dx = -width(p1) + t;
		w = Math.max(0, w - width(p1));
	}

	push(p1); // base

	push_double(EMIT_SUPERSCRIPT);
	push_double(h);
	push_double(d);
	push_double(w);
	push_double(dx);
	push_double(dy);
	push(p2);

	list(7);
}

function
emit_update_table(n, m)
{
	var d, h, i, j, p1, p2, p3, p4, t, total_height, total_width, w;

	total_height = 0;
	total_width = 0;

	t = stack.length - n * m;

	// max height for each row

	for (i = 0; i < n; i++) { // for each row
		h = 0;
		for (j = 0; j < m; j++) { // for each column
			p1 = stack[t + i * m + j];
			h = Math.max(h, height(p1));
		}
		push_double(h);
		total_height += h;
	}

	list(n);
	p2 = pop();

	// max depth for each row

	for (i = 0; i < n; i++) { // for each row
		d = 0;
		for (j = 0; j < m; j++) { // for each column
			p1 = stack[t + i * m + j];
			d = Math.max(d, depth(p1));
		}
		push_double(d);
		total_height += d;
	}

	list(n);
	p3 = pop();

	// max width for each column

	for (j = 0; j < m; j++) { // for each column
		w = 0;
		for (i = 0; i < n; i++) { // for each row
			p1 = stack[t + i * m + j];
			w = Math.max(w, width(p1));
		}
		push_double(w);
		total_width += w;
	}

	list(m);
	p4 = pop();

	// padding

	total_height += n * 2 * TABLE_VSPACE;
	total_width += m * 2 * TABLE_HSPACE;

	// h, d, w for entire table

	h = total_height / 2 + get_operator_height(ROMAN_FONT);
	d = total_height - h;
	w = total_width + 2 * get_char_width(ROMAN_FONT, LEFT_PAREN);

	list(n * m);
	p1 = pop();

	push_double(EMIT_TABLE);
	push_double(h);
	push_double(d);
	push_double(w);
	push_double(n);
	push_double(m);
	push(p1);
	push(p2);
	push(p3);
	push(p4);

	list(10);
}

function
emit_vector(p)
{
	var i, n, span;

	// compute element span

	span = 1;

	n = p.dim.length;

	for (i = 1; i < n; i++)
		span *= p.dim[i];

	n = p.dim[0]; // number of rows

	for (i = 0; i < n; i++)
		emit_matrix(p, 1, i * span);

	emit_update_table(n, 1); // n rows, 1 column
}

function
opcode(p)
{
	return car(p).d;
}

function
height(p)
{
	return cadr(p).d;
}

function
depth(p)
{
	return caddr(p).d;
}

function
width(p)
{
	return cadddr(p).d;
}

function
val1(p)
{
	return car(p).d;
}

function
val2(p)
{
	return cadr(p).d;
}
