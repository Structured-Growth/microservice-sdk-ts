import { ErrorInterface } from "../../interfaces";

export class BadRequestError extends Error implements ErrorInterface {
	public code = 400;
	public name = "BadRequest";
}
