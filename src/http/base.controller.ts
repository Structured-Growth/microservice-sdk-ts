import { Request, Response } from "express";
import { LoggerInterface } from "../logger/interfaces/logger.interface";
import { container } from "tsyringe";
import { EventbusService } from "../eventbus";

export abstract class BaseController {
	protected logger: LoggerInterface;
	protected request: Request;
	protected response: Response;
	protected eventBus: EventbusService;
	protected principal: { arn: string } = { arn: "*" }; // todo fix after policies implemented

	constructor() {
		this.logger = container.resolve<LoggerInterface>("Logger");
		this.logger.module = this.constructor.name || "Controller";
		this.eventBus = container.resolve<EventbusService>("EventbusService");
	}

	public init(request: Request, response: Response) {
		this.request = request;
		this.response = response;
	}
}
