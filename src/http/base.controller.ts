import { Request, Response } from "express";
import { LoggerInterface } from "../logger/interfaces/logger.interface";
import { container } from "tsyringe";

export abstract class BaseController {
	protected logger: LoggerInterface;
	protected request: Request;
	protected response: Response;

	constructor() {
		this.logger = container.resolve<LoggerInterface>("Logger");
		this.logger.module = this.constructor.name || "Controller";
	}

	public init(request: Request, response: Response) {
		this.request = request;
		this.response = response;
	}
}
