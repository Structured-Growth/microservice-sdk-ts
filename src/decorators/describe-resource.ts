import { Request } from "express";
import { sortBy } from "lodash";

type ResourceIdOrArn = string | number | { arn: string };

export function DescribeResource<TParams, TBody, TQuery>(
	resourceName: string,
	resolver: (
		req: Request<TParams | Record<string, any>, any, TBody | Record<string, any>, TQuery | Record<string, any>>
	) => ResourceIdOrArn | ResourceIdOrArn[],
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
