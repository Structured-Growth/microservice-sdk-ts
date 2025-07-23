import { cloneDeep } from "lodash";
import * as crypto from "crypto";

function hashValue(value: any): string {
	return value == null ? "" : crypto.createHash("sha256").update(String(value)).digest("hex");
}

function sanitizeObject(obj: any, maskFields: string[], hashFields: string[]): any {
	if (Array.isArray(obj)) {
		return obj.map((item) => sanitizeObject(item, maskFields, hashFields));
	}

	if (typeof obj !== "object" || obj === null) {
		return obj;
	}

	const result = { ...obj };

	for (const key in result) {
		const value = result[key];

		if (maskFields.includes(key) && value != null) {
			if (Array.isArray(value)) {
				result[key] = value.map((v) => "*".repeat(String(v).length));
			} else {
				result[key] = "*".repeat(String(value).length);
			}
			continue;
		}

		if (hashFields.includes(key) && value != null) {
			if (Array.isArray(value)) {
				result[key] = value.map((v) => hashValue(v));
			} else {
				result[key] = hashValue(value);
			}
			continue;
		}

		if (typeof value === "object") {
			result[key] = sanitizeObject(value, maskFields, hashFields);
		}
	}

	return result;
}

export function applySensitiveFieldTransformations(
	source: { body?: any; query?: any; params?: any },
	maskFields: string[],
	hashFields: string[]
): { body?: any; query?: any; params?: any } {
	if (!maskFields.length && !hashFields.length) return source;

	const result = cloneDeep(source);
	const targets: Array<keyof typeof source> = ["body", "query", "params"];

	for (const target of targets) {
		const section = result[target];
		if (!section || typeof section !== "object") continue;

		result[target] = sanitizeObject(section, maskFields, hashFields);
	}

	return result;
}
