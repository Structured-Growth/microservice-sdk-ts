import { RegisteredEvent } from "./index";

export interface EventInterface {
	arn: string;
	resources?: string[];
	data: RegisteredEvent | any;
}
