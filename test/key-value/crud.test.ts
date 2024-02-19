import "reflect-metadata";
import { config } from "dotenv";
import { container, Lifecycle } from "tsyringe";
import { KeyValueStorage, keyValueStorageDrivers, KeyValueStorageInterface } from "../../src/key-value";
import { logWriters, Logger } from "../../src";
import { assert } from "chai";

config({ path: ".env" });

describe("Create items in DynamoDB", () => {
	let kvStorage: KeyValueStorageInterface;

	before(() => {
		container.register("region", { useValue: process.env.REGION || "us-west-2" });
		container.register("LogWriter", logWriters.ConsoleLogWriter, { lifecycle: Lifecycle.Singleton });
		container.register("Logger", Logger);
		container.register("KeyValueStorageDriver", keyValueStorageDrivers.DynamoDbKvStorageDriver);
		container.register("KeyValueStorage", KeyValueStorage);
		kvStorage = container.resolve<KeyValueStorageInterface>("KeyValueStorage");
	});

	it("Must create item", async () => {
		const result = await kvStorage.create("test-key-1", "test-string", 30);
		assert.equal(result.key, "test-key-1");
		assert.equal(result.value, "test-string");
		assert.isNotNaN(new Date(result.expiresAt).getTime());
	});

	it("Must read item", async () => {
		const result = await kvStorage.read("test-key-1");
		assert.equal(result.key, "test-key-1");
		assert.equal(result.value, "test-string");
		assert.isNotNaN(new Date(result.expiresAt).getTime());
	});

	it("Must update item", async () => {
		const result = await kvStorage.update("test-key-1", "test-string-2");
		assert.equal(result.key, "test-key-1");
		assert.equal(result.value, "test-string-2");
		assert.isNotNaN(new Date(result.expiresAt).getTime());
	});

	it("Must delete item", async () => {
		const result = await kvStorage.delete("test-key-1");
		assert.isUndefined(result);
		const exists = await kvStorage.read("test-key-1");
		assert.isNull(exists);
	});
});
