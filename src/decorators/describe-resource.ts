import { Request } from "express";
import { sortBy } from "lodash";

type ResourceIdOrArn = string | number | { arn: string };

export function DescribeResource<
	TParams = Record<string, any>,
	TBody = Record<string, any>,
	TQuery = Record<string, any>
>(
	resourceName: string,
	resolver: (req: Request<TParams, any, TBody, TQuery>) => ResourceIdOrArn | ResourceIdOrArn[],
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
