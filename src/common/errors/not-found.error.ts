import { ErrorInterface } from "../../interfaces";

export class NotFoundError extends Error implements ErrorInterface {
	public code = 404;
	public name = "NotFound";
}
