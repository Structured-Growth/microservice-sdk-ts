export interface EmitsManifestEntryInterface {
	event: string;
	resources: {
		resource: string;
		arnPattern: string;
	}[];
	payloadSchema: string;
	className: string;
	targetName: string;
}
