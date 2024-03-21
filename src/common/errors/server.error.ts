import { ErrorInterface } from "../../interfaces";

export class ServerError extends Error implements ErrorInterface {
	public code = 500;
	public name = "ServerError";
}
