import * as joi from "joi";

export const FirstNameValidator = joi
	.string()
	.trim()
	.min(2)
	.max(50)
	.regex(/^[a-zA-Z0-9\']*$/)
	.label("First name")
	.messages({
		"string.pattern.base":
			"First name must consist of letters",
	});
