import { config } from "dotenv";
import { pick, keys } from "lodash";
import * as joi from "joi";
import { autoInjectable, injectWithTransform } from "tsyringe";
import { LoggerTransform } from "../logger/log-context.transform";
import { Logger } from "../logger/logger";

@autoInjectable()
export class ConfigLoader {
	constructor(
		@injectWithTransform("Logger", LoggerTransform, { module: "ConfigLoader" })
		private logger?: Logger
	) {}

	public loadAndValidate(path: string, rules: object): void {
		config({ path });
		const schema = joi.object(rules);

		const { error: validationError } = schema.validate(pick(process.env, keys(rules)), {
			abortEarly: false,
		});

		if (validationError) {
			this.logger.error(`Invalid configuration:\n${validationError.message}`);
			process.exit(1);
		} else {
			this.logger.info("Configuration is valid");
		}
	}
}
