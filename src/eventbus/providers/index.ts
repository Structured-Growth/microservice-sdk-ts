import { AwsEventBridgeEventbusProvider } from "./aws-event-bridge-eventbus-provider";
import { TestEventbusProvider } from "./test-eventbus-provider";

export const eventBusProviders = {
	AwsEventBridgeEventbusProvider,
	TestEventbusProvider,
};

export { AwsEventBridgeEventbusProvider, TestEventbusProvider };
