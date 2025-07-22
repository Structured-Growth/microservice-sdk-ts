export function HashFields(fields: string[]): MethodDecorator {
	return (target, propertyKey, descriptor) => {
		const exists = Reflect.getMetadata(`__action:${String(propertyKey)}`, target) || {};
		Reflect.defineMetadata(
			`__action:${String(propertyKey)}`,
			{
				...exists,
				hashFields: fields,
			},
			target
		);
		return descriptor;
	};
}
