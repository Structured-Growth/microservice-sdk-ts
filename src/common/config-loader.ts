import { config } from "dotenv";
import { pick, keys } from "lodash";
import * as joi from "joi";
import { autoInjectable } from "tsyringe";

@autoInjectable()
export class ConfigLoader {
	public loadAndValidate(path: string, rules: object): void {
		config({ path });
		const schema = joi.object(rules);

		const { error: validationError } = schema.validate(pick(process.env, keys(rules)), {
			abortEarly: false,
		});

		if (validationError) {
			console.error(`Invalid configuration:\n${validationError.message}`);
			process.exit(1);
		}
	}
}
