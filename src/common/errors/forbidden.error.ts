import { ErrorInterface } from "../../interfaces";

export class ForbiddenError extends Error implements ErrorInterface {
	public code = 403;
	public name = "Forbidden";
}
