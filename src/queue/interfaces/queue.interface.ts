export interface QueueInterface {
	/**
	 * Publish a job
	 */
	publish(queueName: string, subject: string, message: object): Promise<boolean>;

	/**
	 * Subscribe to new jobs
	 */
	subscribe(
		queueName: string,
		handler: (message: { source: string; subject: string; message: object }) => Promise<void> | void
	): void;
}
