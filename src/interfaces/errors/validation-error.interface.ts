import { ErrorInterface } from "./error.interface";

export interface ValidationErrorInterface extends ErrorInterface {
	validation: object;
}
