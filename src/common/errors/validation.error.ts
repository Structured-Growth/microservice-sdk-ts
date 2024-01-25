import { ValidationErrorInterface } from "../../interfaces/errors/validation-error.interface";

export class ValidationError extends Error implements ValidationErrorInterface {
	public code = 422;
	public name = "ValidationError";

	constructor(public validation: Record<string, string[]>) {
		super();
	}
}
