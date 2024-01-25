import { BelongsToOrgInterface } from "./belongs-to-org.interface";
import { BelongsToAccountInterface } from "./belongs-to-account.interface";
import { HasArnInterface } from "./has-arn.interface";
import { HasTimestampsInterface } from "./has-timestamps.interface";

export interface DefaultModelInterface
	extends HasTimestampsInterface,
		HasArnInterface,
		BelongsToOrgInterface,
		BelongsToAccountInterface {
	id?: number | any;
}
