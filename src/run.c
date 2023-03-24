char *trace1;
char *trace2;

void
run(char *buf)
{
	if (setjmp(jmpbuf0))
		return;

	if (zero == NULL)
		init();

	set_symbol(symbol(TRACE), zero, symbol(NIL));

	prep();

	run_loop(buf);
}

void
run_loop(char *buf)
{
	char *s, *save_trace1, *save_trace2;
	struct atom *p1;

	save_trace1 = trace1;
	save_trace2 = trace2;

	s = buf;

	for (;;) {

		gc_check();

		s = scan_input(s); // also updates trace1 and trace2

		if (s == NULL)
			break; // end of input

		dupl();
		evalf();

		// update last

		dupl();
		p1 = pop();

		if (p1 != symbol(NIL))
			set_symbol(symbol(LAST), p1, symbol(NIL));

		print_result();
	}

	trace1 = save_trace1;
	trace2 = save_trace2;
}

void
init(void)
{
	init_symbol_table();

	prep();

	init_bignums();

	push_symbol(POWER);
	push_integer(-1);
	push_rational(1, 2);
	list(3);
	imaginaryunit = pop();

	initscript();
}

void
prep(void)
{
	interrupt = 0;

	tos = 0;
	tof = 0;
	toj = 0;

	eval_level = 0;
	loop_level = 0;
	expanding = 1;
	drawing = 0;
	journaling = 0;
}

char *
scan_input(char *s)
{
	trace1 = s;
	s = scan(s);
	if (s) {
		trace2 = s;
		trace_input();
	}
	return s;
}

void
eval_run(struct atom *p1)
{
	push(cadr(p1));
	evalf();
	p1 = pop();

	if (!isstr(p1))
		stopf("run: file name expected");

	run_file(p1->u.str);

	push_symbol(NIL);
}

void
run_file(char *filename)
{
	char *buf;
	struct atom *p;

	loop_level++;

	p = alloc_str();

	buf = read_file(filename);

	if (buf == NULL)
		stopf("run: cannot read file");

	p->u.str = buf; // if stop occurs, buf is freed on next gc

	push(p); // protect buf from garbage collection

	run_loop(buf);

	pop();

	loop_level--;
}

void
trace_input(void)
{
	char c, *s;
	if (iszero(get_binding(symbol(TRACE))))
		return;
	c = 0;
	s = trace1;
	outbuf_init();
	while (*s && s < trace2) {
		c = *s++;
		outbuf_putc(c);
	}
	if (c != '\n')
		outbuf_puts("\n");
	printbuf(outbuf, BLUE);
}

// suppress blank lines

void
print_input_line(void)
{
	char c, *s;
	c = '\n';
	s = trace1;
	outbuf_init();
	while (*s && s < trace2) {
		if (*s == '\n' && c == '\n') {
			s++;
			continue;
		}
		c = *s++;
		outbuf_putc(c);
	}
	if (c != '\n')
		outbuf_puts("\n");
	printbuf(outbuf, RED);
}

void
print_scan_line(char *s)
{
	trace2 = s;
	print_input_line();
}

char *init_script_tab[] = {
"i = sqrt(-1)",
"last = 0",
"trace = 0",
"tty = 0",
"cross(a,b)=(dot(a[2],b[3])-dot(a[3],b[2]),dot(a[3],b[1])-dot(a[1],b[3]),dot(a[1],b[2])-dot(a[2],b[1]))",
"curl(u) = (d(u[3],y)-d(u[2],z),d(u[1],z)-d(u[3],x),d(u[2],x)-d(u[1],y))",
"div(u) = d(u[1],x)+d(u[2],y)+d(u[3],z)",
"laguerre(x,n,m) = (n + m)! sum(k,0,n,(-x)^k / ((n - k)! (m + k)! k!))",
"legendre(f,n,m,x) = eval(1 / (2^n n!) (1 - x^2)^(m/2) d((x^2 - 1)^n,x,n + m),x,f)",
"hermite(x,n) = (-1)^n exp(x^2) d(exp(-x^2),x,n)",
"binomial(n,k) = n! / k! / (n - k)!",
"choose(n,k) = n! / k! / (n - k)!",
};

void
initscript(void)
{
	int i, n;
	char *s;
	n = sizeof init_script_tab / sizeof (char *);
	for (i = 0; i < n; i++) {
		s = init_script_tab[i];
		scan(s);
		evalf();
		pop();
	}
}

void
stopf(char *s)
{
	if (journaling)
		longjmp(jmpbuf1, 1);

	print_input_line();
	snprintf(strbuf, STRBUFLEN, "Stop: %s\n", s);
	printbuf(strbuf, RED);
	longjmp(jmpbuf0, 1);
}

// kaput stops even in eval_nonstop()

void
kaput(char *s)
{
	journaling = 0;
	stopf(s);
}
