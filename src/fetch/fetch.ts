import { OAuth2Client, OAuth2Fetch } from "@badgateway/oauth2-client";
import { container } from "tsyringe";
import { TokenResponse } from "@badgateway/oauth2-client/src/messages";
import { OAuth2Token } from "@badgateway/oauth2-client/src/token";

const client = new OAuth2Client({
	server: "",
	clientId: "",
	clientSecret: "",
	tokenEndpoint: "api/v1/oauth/token",
	authorizationEndpoint: "api/v1/oauth/authorize",
	authenticationMethod: "client_secret_post",
});

client.tokenResponseToOAuth2Token = (resp: Promise<TokenResponse>): Promise<OAuth2Token> => {
	return resp.then((body) => {
		return {
			accessToken: body.access_token,
			expiresAt: body["access_token_expires_at"] ? new Date(body["access_token_expires_at"]).getTime() : null,
			refreshToken: null,
		};
	});
};

const fetchWrapper = new OAuth2Fetch({
	client: client,
	scheduleRefresh: false,
	getNewToken: async () => {
		return client.clientCredentials();
	},
});

export function signedFetch(requestInfo, init?) {
	client.settings.server = container.resolve<string>("oAuthServerUrl");
	client.settings.clientId = container.resolve<string>("OAuthClientId");
	client.settings.clientSecret = container.resolve<string>("OAuthClientSecret");

	return fetchWrapper.fetch(requestInfo, init);
}
