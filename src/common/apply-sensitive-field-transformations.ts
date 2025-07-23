import { cloneDeep } from "lodash";
import * as crypto from "crypto";

function hashValue(value: any): string {
	return value == null ? "" : crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function applySensitiveFieldTransformations(
	source: { body?: any; query?: any; params?: any },
	maskFields: string[],
	hashFields: string[]
): { body?: any; query?: any; params?: any } {
	console.log("SOURCE: ", source);
	if (!maskFields.length && !hashFields.length) return source;

	const result = cloneDeep(source);
	const targets: Array<keyof typeof source> = ["body", "query", "params"];

	for (const target of targets) {
		const section = result[target];
		if (!section || typeof section !== "object") continue;

		for (const key of maskFields) {
			const value = section[key];
			if (value === undefined || value === null) continue;

			if (Array.isArray(value)) {
				section[key] = value.map((v) => "*".repeat(String(v).length));
			} else {
				section[key] = "*".repeat(String(value).length);
			}
		}

		for (const key of hashFields) {
			const value = section[key];
			if (value === undefined || value === null) continue;

			if (Array.isArray(value)) {
				section[key] = value.map((v) => hashValue(v));
			} else {
				section[key] = hashValue(value);
			}
		}
	}

	return result;
}
