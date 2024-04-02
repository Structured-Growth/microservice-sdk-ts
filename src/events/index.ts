import { EventSingUpDataInterface } from "./registered-events/event-sign-up";
import { EventTestDataInterface } from "./registered-events/event-test";

export { EventInterface } from "./event.interface";
export { EventSingUpDataInterface, EventSignUp } from "./registered-events/event-sign-up";
export { EventTestDataInterface, EventTest } from "./registered-events/event-test";

export type RegisteredEvent = EventSingUpDataInterface | EventTestDataInterface;
