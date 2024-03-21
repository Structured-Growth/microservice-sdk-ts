import { AwsSqsQueueProvider } from "./aws-sqs-queue-provider";
import { TestQueueProvider } from "./test-queue-provider";

export const queueProviders = {
	AwsSqsQueueProvider,
	TestQueueProvider,
};

export { AwsSqsQueueProvider, TestQueueProvider };
