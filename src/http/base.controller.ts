import { Request, Response } from "express";
import { LoggerInterface } from "../logger/interfaces/logger.interface";
import { container } from "tsyringe";
import { EventbusService } from "../eventbus";
import { AuthenticatedAccountInterface, AuthServiceInterface, GuestPrincipalInterface } from "../auth";

export abstract class BaseController {
	protected appPrefix: string;
	protected logger: LoggerInterface;
	protected request: Request;
	protected response: Response;
	protected eventBus: EventbusService;
	protected authService: AuthServiceInterface;
	protected principal: AuthenticatedAccountInterface | GuestPrincipalInterface;

	constructor() {
		this.appPrefix = container.resolve<string>("appPrefix");
		this.logger = container.resolve<LoggerInterface>("Logger");
		this.logger.module = this.constructor.name || "Controller";
		this.eventBus = container.resolve<EventbusService>("EventbusService");
		this.authService = container.resolve<AuthServiceInterface>("AuthService");
	}

	public init(request: Request, response: Response) {
		this.request = request;
		this.response = response;
	}

	/**
	 * Try to get user info by access token from the request.
	 */
	public async authenticate() {
		try {
			const headers = this.request?.headers;
			const authHeader: string = headers?.["Authorization"]?.toString() || headers?.["authorization"]?.toString() || "";
			const token = authHeader.substring(7); // remove "Bearer "
			this.principal = await this.authService.getAuthenticatedUser(token);
		} catch (e) {
			this.logger.info(`Authentication failed: ${e.message}`);
			this.principal = {
				arn: "*",
			};
		}
	}
}
