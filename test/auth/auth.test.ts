import "reflect-metadata";
import { config } from "dotenv";
import { container } from "tsyringe";
import { AuthService } from "../../src";
import { assert } from "chai";

config({ path: ".env" });

describe("Auth service", () => {
	before(() => {
		container.register("appPrefix", { useValue: process.env.APP_PREFIX || "microservice-sdk" });
		container.register("region", { useValue: process.env.REGION || "us-west-2" });
		container.register("oAuthServiceGetUserUrl", {
			useValue: process.env.OAUTH_SERVICE_GET_USER_URL || "https://dev.auth.starlionrc.com/api/v1/oauth/user",
		});
		container.register("AuthService", AuthService);
	});

	it("Should return error with expired access token", async () => {
		const authService = container.resolve<AuthService>("AuthService");
		try {
			const result = await authService.getAuthenticatedUser(
				"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcmluY2lwYWwiOnsib3JnSWQiOjEsInJlZ2lvbiI6InVzIiwidHlwZSI6IkFjY291bnQiLCJhcm4iOiJzZy1hY2NvdW50LWFwaTp1czoxOjM1IiwidGFncyI6W10sImFjY291bnRJZCI6MzV9LCJpYXQiOjE3MTg2MTgyNjB9.ZEK8xjcFKQk1LgGJWY1Z9x7wnAwSPKQ-ZWr0CWXodrQ"
			);
		} catch (e) {
			assert.equal(e.name, "Unauthorized");
			assert.equal(e.code, 401);
		}
	});
});
