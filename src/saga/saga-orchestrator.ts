import { autoInjectable, injectWithTransform } from "tsyringe";
import { LoggerInterface } from "../logger/interfaces/logger.interface";
import { LoggerTransform } from "../logger/log-context.transform";

export interface SagaStep<TInputObject> {
	maxRetries: number;

	execute(input: TInputObject): Promise<TInputObject>;

	compensate(): Promise<void>;
}

/**
 * Implementation of Saga pattern for distributed transactions
 */
@autoInjectable()
export class SagaOrchestrator<TInputObject = object> {
	private steps: SagaStep<TInputObject>[] = [];
	private executedSteps: SagaStep<TInputObject>[] = [];
	private input: TInputObject;

	constructor(@injectWithTransform("Logger", LoggerTransform, { module: "Saga" }) private logger?: LoggerInterface) {}

	public setInput(input: TInputObject) {
		this.input = input;
	}

	public addStep(step: SagaStep<TInputObject>) {
		this.steps.push(step);
	}

	public async execute() {
		for (const step of this.steps) {
			try {
				await this.executeStep(step);
			} catch (error) {
				this.logger.error(`Step ${step.constructor.name} failed...`, error.message);
				await this.compensate();
				throw error;
			}
		}

		return this.input;
	}

	private async executeStep(step: SagaStep<TInputObject>) {
		const maxRetires = step.maxRetries || 1;
		for (let retry = 1; retry <= maxRetires; retry++) {
			this.logger.info(`Executing ${step.constructor.name} step... Attempt ${retry} of ${maxRetires}`);
			try {
				const result = await step.execute(this.input);
				if (result) {
					this.input = result;
				}
				this.executedSteps.push(step);
				break;
			} catch (e) {
				this.logger.error(`Step ${step.constructor.name} failed.`, e.message);
				if (retry === maxRetires) {
					throw e;
				}
			}
		}
	}

	private async compensate() {
		for (const step of this.executedSteps.reverse()) {
			await this.compensateStep(step);
		}
	}

	private async compensateStep(step: SagaStep<TInputObject>) {
		const maxRetires = step.maxRetries || 1;
		for (let retry = 1; retry <= maxRetires; retry++) {
			this.logger.info(`Compensating step ${step.constructor.name}... Attempt ${retry} of ${maxRetires}`);
			try {
				await step.compensate();
				break;
			} catch (e) {
				this.logger.error(`Step ${step.constructor.name} compensation failed.`, e.message);
				if (retry === maxRetires) {
					// nothing to do..
				}
			}
		}
	}
}
