import { RegisteredEvent } from "./index";

export interface EventInterface {
	arn: string;
	data: RegisteredEvent | any;
}
