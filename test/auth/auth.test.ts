import "reflect-metadata";
import { config } from "dotenv";
import { container } from "tsyringe";
import { AuthService } from "../../src";
import { assert } from "chai";
import { PrincipalTypeEnum } from "../../src/auth/interfaces/principal-type.enum";

config({ path: ".env" });

describe("Auth service", () => {
	before(() => {
		container.register("appPrefix", { useValue: process.env.APP_PREFIX || "microservice-sdk" });
		container.register("region", { useValue: process.env.REGION || "us-west-2" });
		container.register("oAuthServiceGetUserUrl", {
			useValue: process.env.OAUTH_SERVICE_GET_USER_URL || "http://localhost:3000/api/v1/oauth/user",
		});
		container.register("AuthService", AuthService);
		container.register("internalAuthenticationEnabled", { useValue: true });
		container.register("internalAuthenticationJwtSecret", { useValue: "random" });
	});

	it("Should authenticate with internally generated access token", async () => {
		const authService = container.resolve<AuthService>("AuthService");
		const jwtToken = authService.generateInternalAccessToken();

		const result = await authService.authenticateByAccessToken(jwtToken);
		assert.equal(result.type, PrincipalTypeEnum.SERVICE);
		assert.equal(result.arn, container.resolve("appPrefix"));
	});

	it("Should return error with internally generated access token if internal auth is disabled", async () => {
		const authService = container.resolve<AuthService>("AuthService");
		const jwtToken = authService.generateInternalAccessToken();
		container.register("internalAuthenticationEnabled", { useValue: false });

		try {
			const result = await authService.authenticateByAccessToken(jwtToken);
		} catch (e) {
			assert.equal(e.name, "Unauthorized");
			assert.equal(e.code, 401);
		}
	});

	it("Should return with valid but expired access token", async () => {
		const authService = container.resolve<AuthService>("AuthService");

		try {
			const result = await authService.authenticateByAccessToken(
				"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcmluY2lwYWwiOnsib3JnSWQiOjEsInJlZ2lvbiI6InVzIiwidHlwZSI6IkFjY291bnQiLCJhcm4iOiJzZy1hY2NvdW50LWFwaTp1czoxOjM1IiwidGFncyI6W10sImFjY291bnRJZCI6MzV9LCJpYXQiOjE3MTg2MTgyNjB9.ZEK8xjcFKQk1LgGJWY1Z9x7wnAwSPKQ-ZWr0CWXodrQ"
			);
		} catch (e) {
            assert.equal(e.name, "Unauthorized");
			assert.equal(e.code, 401);
		}
	});

	it("Should return error with invalid access token", async () => {
		const authService = container.resolve<AuthService>("AuthService");

		try {
			const result = await authService.authenticateByAccessToken("123467");
		} catch (e) {
			assert.equal(e.name, "Unauthorized");
			assert.equal(e.code, 401);
		}
	});
});
