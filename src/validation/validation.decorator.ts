import { validate } from "./validate";
import { ValidationError } from "../common/errors/validation.error";

export function ValidateFuncArgs(validator): Function {
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		const method = descriptor.value;
		const argNames = $args(method);
		descriptor.value = function () {
			const result = validate(
				validator,
				argNames.reduce((acc, name, index) => {
					acc[name] = arguments[index];
					return acc;
				}, {})
			);

			if (!result.valid) {
				throw new ValidationError(result.errors, result.message);
			}

			return method.apply(this, arguments);
		};
	};
}

function $args(func) {
	return (func + "")
		.replace(/[/][/].*$/gm, "") // strip single-line comments
		.replace(/\s+/g, "") // strip white space
		.replace(/[/][*][^/*]*[*][/]/g, "") // strip multi-line comments
		.split("){", 1)[0]
		.replace(/^[^(]*[(]/, "") // extract the parameters
		.replace(/=[^,]+/g, "") // strip any ES6 defaults
		.split(",")
		.filter(Boolean); // split & filter [""]
}
