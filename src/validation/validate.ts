import { ObjectSchema } from "joi";
import { set, get, size, omitBy, isUndefined } from "lodash";

export function validate(
	validator: ObjectSchema,
	data: object
): {
	valid: boolean;
	message?: string;
	errors?: object;
} {
	const { error } = validator.validate(data, {
		abortEarly: false,
		errors: {
			wrap: {
				label: false,
			},
		},
	});
	const errors = {};

	if (error?.details) {
		for (let details of error.details) {
			let key = details.path.join(".");
			let _errors = get(errors, key) || [];
			_errors.push(details.message);
			set(errors, key, _errors);
		}
	}

	return omitBy(
		{
			valid: !error,
			message: error?.message,
			errors: size(errors) ? errors : undefined,
		},
		isUndefined
	) as any;
}
