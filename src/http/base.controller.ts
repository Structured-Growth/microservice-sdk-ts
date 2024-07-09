import { Request, Response } from "express";
import { LoggerInterface } from "../logger/interfaces/logger.interface";
import { container } from "tsyringe";
import { EventbusService } from "../eventbus";
import { AuthServiceInterface, GuestPrincipalInterface, PolicyService } from "../auth";
import { ServerError } from "../common/errors/server.error";
import { ForbiddenError } from "../common/errors/forbidden.error";
import { PrincipalInterface } from "../auth/interfaces/principal.interface";
import { PrincipalTypeEnum } from "../auth/interfaces/principal-type.enum";
import { isObject } from "lodash";

export abstract class BaseController {
	public authenticationEnabled = true;
	public authorizationEnabled = true;
	protected app: any;
	protected appPrefix: string;
	protected logger: LoggerInterface;
	protected request: Request;
	protected response: Response;
	protected eventBus: EventbusService;
	protected authService: AuthServiceInterface;
	protected policyService: PolicyService;
	protected principal: PrincipalInterface | GuestPrincipalInterface = {
		arn: "*",
		type: PrincipalTypeEnum.GUEST,
	};

	constructor() {
		this.app = container.resolve<string>("App");
		this.appPrefix = container.resolve<string>("appPrefix");
		this.logger = container.resolve<LoggerInterface>("Logger");
		this.logger.module = this.constructor.name || "Controller";
		this.eventBus = container.resolve<EventbusService>("EventbusService");
		this.authService = container.resolve<AuthServiceInterface>("AuthService");
		this.policyService = container.resolve<PolicyService>("PolicyService");
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
			if (!token) {
				this.principal = {
					arn: "*",
					type: PrincipalTypeEnum.GUEST,
				};
				return;
			}
			this.principal = await this.authService.authenticateByAccessToken(token);
			this.logger.debug(`Authentication principal: ${this.principal.arn}`);
		} catch (e) {
			this.logger.info(`Authentication failed: ${e.message}`);
			this.principal = {
				arn: "*",
				type: PrincipalTypeEnum.GUEST,
			};
		}
	}

	/**
	 * Check if principal is authorized to perform an action on resources.
	 *
	 * @throws ForbiddenError if principal is not authorized
	 */
	public async authorize(actionName: string): Promise<void> {
		if (!this.app || !this.app.models) {
			throw new ServerError("App is not initialized");
		}

		const prototype = Object.getPrototypeOf(this);
		const action = Reflect.getMetadata(`__action:${actionName}`, prototype);

		if (!action) {
			throw new ServerError("Action is not described. Use DescribeAction decorator.");
		}

		const resources = (
			await Promise.all(
				action.resources?.map(async ({ resource, resolver }) => {
					const modelClass: any = this.app.models[resource];
					const id = resolver(this.request);
					this.logger.debug("Resolved resource ID", resource, id || "not resolved");

					if (!id) {
						return;
					}

					if (isObject(id) && id["arn"]) {
						this.logger.debug("ARN resolved locally: ", id["arn"]);
						return id["arn"];
					}

					if (!modelClass) {
						this.logger.warn("Model class not found for resource:", resource);
						return;
					}

					const model = await modelClass?.findOne({
						where: { id },
						rejectOnEmpty: false,
					});
					this.logger.debug("Resolved resource ARN", model?.arn || "not resolved");

					return model?.arn;
				}) || []
			)
		).filter((el) => !!el);

		const actionArn = `${this.appPrefix}:${action.action}`;
		const { effect } = await this.policyService.check(this.principal.arn, this.principal.type, actionArn, resources);

		this.logger.debug("Policy effect:", effect);

		if (effect !== "allow") {
			throw new ForbiddenError(
				`Principal ${this.principal.arn} is not authorized to perform action ${actionArn} on resource ${resources.join(
					", "
				)}`
			);
		}
	}
}
