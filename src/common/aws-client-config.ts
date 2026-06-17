type AwsClientConfig = {
	region: string;
	endpoint?: string;
	credentials?: {
		accessKeyId: string;
		secretAccessKey: string;
	};
};

export function buildAwsClientConfig(region: string, endpointEnvName: string): AwsClientConfig {
	const endpoint = process.env[endpointEnvName];

	if (!endpoint) {
		return { region };
	}

	return {
		region,
		endpoint,
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
		},
	};
}
