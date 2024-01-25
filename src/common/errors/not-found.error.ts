import { ErrorInterface } from "../../interfaces/errors/error.interface";

export class NotFoundError extends Error implements ErrorInterface {
	public code = 404;
	public name = "NotFound";
}
