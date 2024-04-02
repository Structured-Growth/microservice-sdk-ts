export interface EventbusProviderInterface {
	publish(subject: string, message: object): Promise<boolean>;
}
