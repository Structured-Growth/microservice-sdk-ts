import { container } from "tsyringe";
import { uniqBy } from "lodash";
import { EmitRegistrationInterface } from "./emit-registration.interface";

const emitsRegistry = new Map<Function, EmitRegistrationInterface[]>();

function resolveAppPrefix(): string | undefined {
	try {
		if (container.isRegistered("appPrefix")) {
			return container.resolve<string>("appPrefix");
		}
	} catch (e) {}

	return process.env.APP_PREFIX;
}

function resolveEventName(event: string): string {
	const appPrefix = resolveAppPrefix();

	if (!appPrefix || event.startsWith(`${appPrefix}:`)) {
		return event;
	}

	return `${appPrefix}:${event}`;
}

function upsertEmit(target: Function, emit: EmitRegistrationInterface) {
	const registered = emitsRegistry.get(target) || [];
	emitsRegistry.set(
		target,
		uniqBy(
			[...registered, emit],
			(item) => `${item.className || ""}:${item.targetName}:${item.event}:${item.payloadSchema || ""}`
		)
	);
}

export function registerEmit(target: Function, emit: EmitRegistrationInterface) {
	upsertEmit(target, emit);
}

export function getRegisteredEmits(): EmitRegistrationInterface[] {
	return Array.from(emitsRegistry.values())
		.flat()
		.map((emit) => ({
			...emit,
			event: resolveEventName(emit.event),
		}));
}

export function clearRegisteredEmits() {
	emitsRegistry.clear();
}
