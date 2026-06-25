import * as fs from "node:fs";
import * as path from "node:path";
import { EmitsManifestEntryInterface } from "./emits-manifest.interface";

export const EMITS_MANIFEST_PATH = path.resolve(process.cwd(), ".docs/emits.v1.json");

export function readGeneratedEmitsManifest(): EmitsManifestEntryInterface[] {
	if (!fs.existsSync(EMITS_MANIFEST_PATH)) {
		return [];
	}

	try {
		const content = fs.readFileSync(EMITS_MANIFEST_PATH, "utf8");
		const data = JSON.parse(content);
		return Array.isArray(data) ? data : [];
	} catch (error) {
		console.warn(`Failed to read emits manifest at ${EMITS_MANIFEST_PATH}:`, error);
		return [];
	}
}
