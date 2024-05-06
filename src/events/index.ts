import { EventSingUpDataInterface } from "./registered-events/event-sign-up";
import { EventTestDataInterface } from "./registered-events/event-test";
import { EventMutationDataInterface } from "./registered-events/event-mutation";

export { EventInterface } from "./event.interface";
export { EventSingUpDataInterface, EventSignUp } from "./registered-events/event-sign-up";
export { EventTestDataInterface, EventTest } from "./registered-events/event-test";
export { EventMutationDataInterface, EventMutation } from "./registered-events/event-mutation";

export type RegisteredEvent = EventSingUpDataInterface | EventTestDataInterface | EventMutationDataInterface;
