import { ExtendedSpecConfig, generateSpec } from "tsoa";
import { escape, uniqBy } from "lodash";
import { errorResponses } from "./error-responses";
import { schemas } from "./schemas";

/**
 * Generate API specs from controller definitions.
 * Automatically adds information for policies (action, resource ARNs) and common error responses.
 */
export async function generateApiDocs(app, controllers, appPrefix, specOptions: ExtendedSpecConfig) {
	let metadata = await generateSpec(specOptions);
	metadata.referenceTypeMap = {
		...metadata.referenceTypeMap,
		...schemas,
	};

	metadata.controllers.forEach((controller) => {
		controller.methods.forEach((method) => {
			const instance = new controllers[controller.name]();
			const action = Reflect.getMetadata("__action:" + method.name, instance);

			method.responses.push(...errorResponses);
			method.responses = uniqBy(method.responses, (response) => response.name);

			if (action) {
				method.description =
					method.description +
					[
						"\n",
						`> _Action name_:<br> **${appPrefix}:${action.action}**<br><br>`,
						`> _Resources_:<br> ${
							action.resources
								?.map(({ resource, arnPattern }) => {
									const modelClass = app.models[resource];
									const arn = escape(arnPattern || modelClass?.["arnPattern"] || "external resource");
									return `${resource} <code>${arn}</code>`;
								})
								.join("<br>") || "*"
						}`,
					].join("\n");
			}
		});
	});
	await generateSpec(specOptions, null, null, metadata);
}
