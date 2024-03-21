export interface EventbusInterface {
	/**
	 * Publish a message
	 */
	publish(subject: string, message: object): Promise<boolean>;
}
