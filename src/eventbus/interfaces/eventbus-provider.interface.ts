export interface EventbusProviderInterface {
	publish(subject: string, message: object, resources?: string[]): Promise<boolean>;
}
