import * as joi from "joi";

export const LastNameValidator = joi
	.string()
	.min(2)
	.max(50)
	.regex(/^[a-zA-Z0-9\']*$/)
	.label("Last name")
	.messages({
		"string.pattern.base":
			"Last name must consist of letters",
	});