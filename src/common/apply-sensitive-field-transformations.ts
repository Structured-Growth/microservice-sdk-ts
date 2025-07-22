import { cloneDeep } from "lodash";
import * as crypto from "crypto";

function hashValue(value: any): string {
	if (typeof value === "undefined" || value === null) return "";
	return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function applySensitiveFieldTransformations(
	source: { body?: any; query?: any; params?: any },
	maskFields: string[],
	hashFields: string[]
): { body?: any; query?: any; params?: any } {
	console.log("SOURCE: ", source);
	const result = cloneDeep(source);

	const targets: Array<keyof typeof source> = ["body", "query", "params"];

	for (const target of targets) {
		const section = result[target];
		if (!section) continue;

		for (const key of maskFields) {
			const value = section[key];
			if (value !== undefined && value !== null) {
				const str = String(value);
				section[key] = "*".repeat(str.length);
			}
		}

		for (const key of hashFields) {
			if (key in section) {
				section[key] = hashValue(section[key]);
			}
		}
	}

	return result;
}
