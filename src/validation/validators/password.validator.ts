import * as joi from "joi";

export const PasswordValidator = joi
	.string()
	.min(12)
	.max(50)
	.regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*<>/\\\[\]{}?+=])^.*$/)
	.label("Password")
	.messages({
		"string.pattern.base":
			"Password must include upper and lower case, number and special character (! @ # $ % ^ & * < >)",
	});
