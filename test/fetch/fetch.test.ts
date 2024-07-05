import "reflect-metadata";
import { config } from "dotenv";
import { signedFetch } from "../../src/fetch";
import { container } from "tsyringe";
import {signedInternalFetch} from "../../src/fetch/fetch";
import {AuthService} from "../../src";

config({ path: ".env" });

describe("Send signed event", () => {
	before(() => {
		container.register("appPrefix", { useValue: process.env.APP_PREFIX || "microservice-sdk" });
		container.register("region", { useValue: process.env.REGION || "us-west-2" });
		container.register("oAuthServerUrl", { useValue: "https://dev.auth.starlionrc.com" });
		container.register("oAuthServiceGetUserUrl", { useValue: "https://dev.auth.starlionrc.com/api/v1/oauth/user" });
		container.register("OAuthClientId", { useValue: "c2f048d4d44b36425d12d6a920d62f8e" });
		container.register("OAuthClientSecret", {
			useValue: "93276f14cf33eb8dc0b7228f1f788d42226a87a859784857b0e7f839cc7b123a",
		});
		container.register("AuthService", AuthService);
		container.register("internalAuthenticationEnabled", { useValue: true });
		container.register("internalAuthenticationJwtSecret", { useValue: "random" });
	});

	it("Must sign request", async () => {
		const result = await signedFetch("https://dev.api.starlionrc.com/account-api/v1/accounts/1");
		const result2 = await signedFetch("https://dev.api.starlionrc.com/account-api/v1/accounts/2");

		console.log(await result.json());
		console.log(await result2.json());
	});

	it("Must sign request internally", async () => {
		const result = await signedInternalFetch("https://dev.api.starlionrc.com/account-api/v1/accounts/1");
		const result2 = await signedInternalFetch("https://dev.api.starlionrc.com/account-api/v1/accounts/2");

		console.log(await result.json());
		console.log(await result2.json());
	});
});
