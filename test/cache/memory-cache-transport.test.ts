import "reflect-metadata";
import { container, Lifecycle } from "tsyringe";
import { assert } from "chai";

import { MemoryCacheTransport } from "../../src";
import { Logger, logWriters } from "../../src";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("MemoryCacheTransport", () => {
	let cache: MemoryCacheTransport;

	before(() => {
		container.register("LogWriter", logWriters.ConsoleLogWriter, { lifecycle: Lifecycle.Singleton });
		container.register("Logger", Logger);
	});

	beforeEach(() => {
		container.register("CacheTransport", { useClass: MemoryCacheTransport });
		cache = container.resolve<MemoryCacheTransport>("CacheTransport");
	});

	it("set/get: stores and returns a string", async () => {
		const ok = await cache.set("k1", "v1");
		assert.isTrue(ok);
		const val = await cache.get("k1");
		assert.strictEqual(val, "v1");
	});

	it("set/get: serializes and deserializes an object", async () => {
		const payload = { a: 1, b: "x" };
		await cache.set("k2", payload);
		const val = await cache.get<typeof payload>("k2");
		assert.deepEqual(val, payload);
	});

	it("get: returns null for a missing key", async () => {
		const val = await cache.get("missing");
		assert.isNull(val);
	});

	it("del: removes existing key and returns proper boolean", async () => {
		await cache.set("k3", "x");
		const d1 = await cache.del("k3");
		const d2 = await cache.del("k3");
		assert.isTrue(d1);
		assert.isFalse(d2);
		assert.isNull(await cache.get("k3"));
	});

	it("incrBy: increments from 0 for a new key and persists as number", async () => {
		const n1 = await cache.incrBy("counter");
		const n2 = await cache.incrBy("counter", 5);
		assert.strictEqual(n1, 1);
		assert.strictEqual(n2, 6);

		const raw = (await cache.get<number>("counter"))!;
		assert.strictEqual(raw, 6);
	});

	it("expire: sets TTL on an existing key", async () => {
		await cache.set("ttl-key", "alive");
		const ok = await cache.expire("ttl-key", 0.03);
		assert.isTrue(ok);

		await sleep(15);
		assert.strictEqual(await cache.get("ttl-key"), "alive");

		await sleep(25);
		assert.isNull(await cache.get("ttl-key"));
	});

	it("expire: returns false for a non-existing key", async () => {
		const ok = await cache.expire("no-key", 0.01);
		assert.isFalse(ok);
	});

	it("set with TTL: key expires after the given time", async () => {
		await cache.set("k4", "tmp", 0.02);
		assert.strictEqual(await cache.get("k4"), "tmp");
		await sleep(30);
		assert.isNull(await cache.get("k4"));
	});

	it("mget: returns values for keys including nulls for missing ones", async () => {
		await cache.set("m1", "a");
		await cache.set("m2", { z: 2 });
		const res = await cache.mget<any>(["m1", "m2", "m3"]);
		assert.deepEqual(res, ["a", { z: 2 }, null]);
	});

	it("mget: returns empty array for empty input", async () => {
		const res = await cache.mget([]);
		assert.deepEqual(res, []);
	});

	it("mset: sets multiple keys without TTL", async () => {
		const ok = await cache.mset({ b1: "x", b2: { p: 9 } });
		assert.isTrue(ok);
		const [v1, v2] = await cache.mget<any>(["b1", "b2"]);
		assert.strictEqual(v1, "x");
		assert.deepEqual(v2, { p: 9 });
	});

	it("mset: sets multiple keys with TTL", async () => {
		await cache.mset({ t1: "x", t2: "y" }, 0.02);
		await sleep(10);
		assert.deepEqual(await cache.mget(["t1", "t2"]), ["x", "y"]);
		await sleep(20);
		assert.deepEqual(await cache.mget(["t1", "t2"]), [null, null]);
	});

	it("get: returns raw string if JSON.parse is not applicable", async () => {
		await cache.set("raw", "not-json");
		const val = await cache.get("raw");
		assert.strictEqual(val, "not-json");
	});
});
