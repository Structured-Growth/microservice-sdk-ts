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

	it("setWithTags/getKeysByTag: stores tags and returns keys by tag", async () => {
		await cache.setWithTags("u:1:settings", { theme: "dark" }, ["user:1", "settings"]);
		await cache.setWithTags("u:1:policies", ["p1"], ["user:1", "policies"]);

		const keysUser = await cache.getKeysByTag("user:1");
		assert.sameMembers(keysUser, ["u:1:settings", "u:1:policies"]);

		const keysSettings = await cache.getKeysByTag("settings");
		assert.sameMembers(keysSettings, ["u:1:settings"]);
	});

	it("addTags: attaches tags only if key exists and is not expired", async () => {
		const okMissing = await cache.addTags("nope", ["t1"]);
		assert.isFalse(okMissing);

		await cache.set("k-exp", "x", 0.01);
		await sleep(20);
		const okExpired = await cache.addTags("k-exp", ["t2"]);
		assert.isFalse(okExpired);

		await cache.set("k-ok", "y");
		const ok = await cache.addTags("k-ok", ["t3"]);
		assert.isTrue(ok);

		const keys = await cache.getKeysByTag("t3");
		assert.deepEqual(keys, ["k-ok"]);
	});

	it("removeTags: detaches only specified tags and keeps others", async () => {
		await cache.setWithTags("k-tags", "v", ["a", "b", "c"]);

		await cache.removeTags("k-tags", ["b"]);

		assert.deepEqual(await cache.getKeysByTag("a"), ["k-tags"]);
		assert.deepEqual(await cache.getKeysByTag("c"), ["k-tags"]);
		assert.deepEqual(await cache.getKeysByTag("b"), []);
	});

	it("delWithTags: removes key and cleans tag indexes", async () => {
		await cache.setWithTags("k-delwt", "v", ["t-del"]);

		assert.deepEqual(await cache.getKeysByTag("t-del"), ["k-delwt"]);

		const existed = await cache.delWithTags("k-delwt");
		assert.isTrue(existed);

		assert.isNull(await cache.get("k-delwt"));
		assert.deepEqual(await cache.getKeysByTag("t-del"), []);
	});

	it("del: removes key and cleans tag indexes (no dangling keys in tagIndex/tagRefs)", async () => {
		await cache.setWithTags("k-del", "v", ["t1"]);
		assert.deepEqual(await cache.getKeysByTag("t1"), ["k-del"]);

		const existed = await cache.del("k-del");
		assert.isTrue(existed);

		assert.isNull(await cache.get("k-del"));
		assert.deepEqual(await cache.getKeysByTag("t1"), []);
	});

	it("getKeysByTag: skips expired keys and cleans tag refs via gcOne", async () => {
		await cache.setWithTags("k-live", "v", ["tg"], 0.1);
		await cache.setWithTags("k-expired", "v", ["tg"], 0.01);

		await sleep(30);

		const keys = await cache.getKeysByTag("tg");
		assert.deepEqual(keys, ["k-live"]);

		const keys2 = await cache.getKeysByTag("tg");
		assert.deepEqual(keys2, ["k-live"]);
	});

	it("invalidateTag: deletes all keys with a tag and returns count", async () => {
		await cache.setWithTags("k1", "v1", ["user:10"]);
		await cache.setWithTags("k2", "v2", ["user:10"]);
		await cache.setWithTags("k3", "v3", ["user:11"]);

		const n = await cache.invalidateTag("user:10");
		assert.strictEqual(n, 2);

		assert.isNull(await cache.get("k1"));
		assert.isNull(await cache.get("k2"));
		assert.strictEqual(await cache.get("k3"), "v3");

		assert.deepEqual(await cache.getKeysByTag("user:10"), []);
		assert.deepEqual(await cache.getKeysByTag("user:11"), ["k3"]);
	});

	it("msetWithTags: sets multiple keys and attaches common tags", async () => {
		const ok = await cache.msetWithTags(
			{
				"u:2:settings": { a: 1 },
				"u:2:policies": ["p1", "p2"],
			},
			["user:2"],
			0.2
		);

		assert.isTrue(ok);

		const keys = await cache.getKeysByTag("user:2");
		assert.sameMembers(keys, ["u:2:settings", "u:2:policies"]);

		const [s, p] = await cache.mget<any>(["u:2:settings", "u:2:policies"]);
		assert.deepEqual(s, { a: 1 });
		assert.deepEqual(p, ["p1", "p2"]);
	});

	it("msetWithTags: respects TTL and expired keys disappear from tag results", async () => {
		await cache.msetWithTags({ a: "1", b: "2" }, ["tg-ttl"], 0.02);

		await sleep(10);
		assert.sameMembers(await cache.getKeysByTag("tg-ttl"), ["a", "b"]);

		await sleep(25);
		assert.deepEqual(await cache.getKeysByTag("tg-ttl"), []);
	});

	it("maddTags: adds tags for existing keys and returns count (if implemented)", async () => {
		await cache.mset({ kA: "A", kB: "B" });

		const n = await cache.maddTags(["kA", "kB", "kC"], ["tg-madd"]);
		assert.strictEqual(n, 2);

		assert.sameMembers(await cache.getKeysByTag("tg-madd"), ["kA", "kB"]);
	});
});
