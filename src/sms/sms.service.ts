import {inject, injectable} from "tsyringe";
import { SmsProviderInterface } from "./interfaces/sms-provider.interface";

@injectable()
export class SmsService implements SmsProviderInterface {
	constructor(@inject("SmsProvider") private provider: SmsProviderInterface) {}

	public async send(phoneNumber: string, text: string): Promise<boolean> {
		return this.provider.send(phoneNumber, text);
	}
}
