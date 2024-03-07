export interface SmsProviderInterface {
	send(phoneNumber: string, text: string): Promise<boolean>;
}
