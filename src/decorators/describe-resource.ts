import { Request } from "express";
import { sortBy } from "lodash";

export function DescribeResource(
	resourceName: string,
	resolver: (req: Request) => string | number | { arn: string },
	arnPattern?: string
): Function {
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		const exists = Reflect.getMetadata(`__action:${propertyKey}`, target) || {};
		Reflect.defineMetadata(
			`__action:${propertyKey}`,
			{
				...exists,
				resources: sortBy(
					[
						...(exists.resources || []),
						{
							resource: resourceName,
							arnPattern: arnPattern,
							resolver,
						},
					],
					(resource) => resource.resource
				),
			},
			target
		);
		return descriptor;
	};
}
