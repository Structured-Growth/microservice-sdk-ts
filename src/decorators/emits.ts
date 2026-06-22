import { registerEmit } from "../emits";

function registerMethodEmit(target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) {
	const targetFn = descriptor?.value || target?.[propertyKey];

	if (typeof targetFn !== "function") {
		return descriptor;
	}

	return targetFn;
}

export function Emits<T = unknown>(event: string): MethodDecorator {
	return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
		const targetFn = registerMethodEmit(target, propertyKey, descriptor);

		if (typeof targetFn === "function") {
			registerEmit(targetFn, {
				event,
				targetName: String(propertyKey),
				className: target?.constructor?.name,
			});
		}

		return descriptor;
	};
}
