function
eval_nonstop()
{
	if (journaling) {
		pop();
		push_symbol(NIL);
		return; // not reentrant
	}

	journal = [];
	journaling = 1;
	eval_nonstop_nib();
	journaling = 0;
	journal = [];
}

function
eval_nonstop_nib()
{
	var save_tos, save_tof, save_eval_level, save_expanding;

	try {
		save_tos = stack.length - 1;
		save_tof = frame.length;

		save_eval_level = eval_level;
		save_expanding = expanding;

		evalf();

	} catch (errmsg) {

		undo(); // restore symbol table

		stack.splice(save_tos);
		frame.splice(save_tof);

		eval_level = save_eval_level;
		expanding = save_expanding;

		push_symbol(NIL); // return value
	}
}
