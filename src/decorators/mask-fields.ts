export function MaskFields(fields: string[]): MethodDecorator {
	return (target, propertyKey, descriptor) => {
		const exists = Reflect.getMetadata(`__action:${String(propertyKey)}`, target) || {};
		Reflect.defineMetadata(
			`__action:${String(propertyKey)}`,
			{
				...exists,
				maskFields: fields,
			},
			target
		);
		return descriptor;
	};
}
