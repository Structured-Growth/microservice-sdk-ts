import { ErrorInterface } from "../../interfaces";

export class UnauthorizedError extends Error implements ErrorInterface {
	public code = 401;
	public name = "Unauthorized";
}
