import { ValidationErrorInterface } from "../../interfaces/errors/validation-error.interface";

export class ValidationError extends Error implements ValidationErrorInterface {
	public code = 422;
	public name = "ValidationError";
	public validation;

	constructor(validation: object, message = "Validation failed", code = 422) {
		super(message);
		this.code = code;
		this.validation = validation;
	}
}
