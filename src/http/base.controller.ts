import { Request, Response } from "express";
import { LoggerInterface } from "../logger/interfaces/logger.interface";
import { container } from "tsyringe";
import { EventbusService } from "../eventbus";
import { AuthenticatedAccountInterface, AuthServiceInterface, GuestPrincipalInterface } from "../auth";
import { ServerError } from "../common/errors/server.error";
import { filter, isUndefined } from "lodash";

export abstract class BaseController {
	protected app: any;
	protected appPrefix: string;
	protected logger: LoggerInterface;
	protected request: Request;
	protected response: Response;
	protected eventBus: EventbusService;
	protected authService: AuthServiceInterface;
	protected principal: AuthenticatedAccountInterface | GuestPrincipalInterface;

	constructor() {
		this.app = container.resolve<string>("App");
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

	public async authorize(actionName: string) {
		if (!this.app || !this.app.models) {
			throw new ServerError("App is not initialized");
		}

		const prototype = Object.getPrototypeOf(this);
		const action = Reflect.getMetadata(`__action:${actionName}`, prototype);
		const resources = await Promise.all(
			action.resources.map(async ({ resource, resolver }) => {
				const modelClass: any = this.app.models[resource];
				const id = resolver(this.request);
				this.logger.debug("Resolved resource ID", resource, id || "not resolved");
				if (!id) {
					return;
				}
				const model = await modelClass.findOne({
					where: {
						id,
					},
					rejectOnEmpty: false,
				});

				this.logger.debug("Resolved ARN", model?.arn || "not resolved");

				return model?.arn;
			})
		);

		console.log("Auth request", {
			principal: this.principal.arn,
			action: `${this.appPrefix}:${action.action}`,
			resources: filter(resources, isUndefined),
		});
	}
}
