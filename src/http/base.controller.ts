import { Request, Response } from "express";
import { LoggerInterface } from "../logger/interfaces/logger.interface";
import { container } from "tsyringe";
import { EventbusService } from "../eventbus";
import { AuthServiceInterface, GuestPrincipalInterface, PolicyService } from "../auth";
import { ServerError } from "../common/errors/server.error";
import { ForbiddenError } from "../common/errors/forbidden.error";
import { PrincipalInterface } from "../auth/interfaces/principal.interface";
import { PrincipalTypeEnum } from "../auth/interfaces/principal-type.enum";
import { flatten, isArray, isObject } from "lodash";
import { UnauthorizedError } from "../common/errors/unauthorized.error";

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

		// resolve resources from action
		let resources = await Promise.all(
			action.resources?.map(async ({ resource, resolver }) => {
				const modelClass: any = this.app.models[resource];
				const id = resolver.call(this, this.request, this.response);
				this.logger.debug("Resolved resource ID", resource, id || "not resolved");
				const ids: (number | string | { arn: string })[] = isArray(id) ? id : [id];

				return await Promise.all(
					ids
						.filter((i) => !!i)
						.map(async (id) => {
							const result: {
								resource: string;
								id: string | number | null;
								arn: string | null;
							} = {
								resource,
								id: null,
								arn: null,
							};

							if (isObject(id) && id["arn"]) {
								this.logger.debug("ARN resolved locally: ", id["arn"]);
								result.arn = id["arn"];
								return result;
							} else {
								result.id = id as string | number;
							}

							if (modelClass) {
								const model = await modelClass?.findOne({
									where: { id },
									rejectOnEmpty: false,
								});
								this.logger.debug("Resolved resource ARN", model?.arn || "not resolved");
								if (model) {
									result.arn = model.arn;
								}
							}

							return result;
						})
				);
			}) || []
		);

		resources = flatten(resources).filter((el) => !!el);

		const actionArn = `${this.appPrefix}:${action.action}`;
		const { effect } = await this.policyService.check(this.principal.arn, this.principal.type, actionArn, resources);

		this.logger.debug("Policy effect:", effect);

		if (effect !== "allow") {
			const resourceStr = resources.map((resource) => `${resource.resource} ${resource.id}`).join(", ");

			if (this.principal.arn === "*") {
				throw new UnauthorizedError(
					`Principal ${this.principal.arn} is not authorized to perform action ${actionArn} on resources: ${resourceStr}`
				);
			} else {
				throw new ForbiddenError(
					`Principal ${this.principal.arn} is not authorized to perform action ${actionArn} on resources: ${resourceStr}`
				);
			}
		}
	}
}
