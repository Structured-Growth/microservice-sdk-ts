export function DescribeAction(action: string): Function {
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		const exists = Reflect.getMetadata(`__action:${propertyKey}`, target) || {};
		Reflect.defineMetadata(
			`__action:${propertyKey}`,
			{
				...exists,
				action,
			},
			target
		);
		return descriptor;
	};
}
