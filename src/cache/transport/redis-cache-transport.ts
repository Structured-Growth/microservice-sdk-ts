import { autoInjectable, injectWithTransform } from "tsyringe";
import { LoggerTransform } from "../../logger/log-context.transform";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";
import { CacheTransportInterface } from "../interfaces/cache-transport.interface";
import Redis, { Cluster as RedisCluster, type Redis as RedisClient, type Cluster as ClusterClient } from "ioredis";

@autoInjectable()
export class RedisCacheTransport implements CacheTransportInterface {
	private redis!: RedisClient | ClusterClient;
	private prefix: string;
	private isCluster: boolean;

	constructor(
		@injectWithTransform("Logger", LoggerTransform, { module: "RedisCacheTransport" })
		private logger: LoggerInterface
	) {
		this.prefix = (process.env.REDIS_KEY_PREFIX || "").trim();

		const clusterNodes = (process.env.REDIS_CLUSTER_NODES || "")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);

		this.isCluster = clusterNodes.length > 0;

		const username = process.env.REDIS_USERNAME;
		const password = process.env.REDIS_PASSWORD;
		const tlsEnabled = process.env.REDIS_TLS === "true";

		if (this.isCluster) {
			const nodes = clusterNodes.map((n) => {
				const [host, portStr] = n.split(":");
				return { host, port: Number(portStr || "6379") };
			});

			this.redis = new RedisCluster(nodes, {
				redisOptions: {
					username,
					password,
					tls: tlsEnabled ? {} : undefined,
					maxRetriesPerRequest: 1,
					offlineQueue: false,
					connectTimeout: 5000,
				},
			});

			this.logger.info(`Redis cluster mode enabled with ${nodes.length} node(s).`);
		} else {
			const url = process.env.REDIS_URL;
			if (!url) {
				this.redis = new Redis({
					host: "127.0.0.1",
					port: 6379,
					username,
					password,
					db: Number(process.env.REDIS_DB ?? "0"),
					tls: tlsEnabled ? {} : undefined,
					maxRetriesPerRequest: 1,
					offlineQueue: false,
					connectTimeout: 5000,
				});
				this.logger.warn("REDIS_URL not provided; using localhost:6379.");
			} else {
				this.redis = new Redis(url, {
					username,
					password,
					db: Number(process.env.REDIS_DB ?? "0"),
					tls: url.startsWith("rediss://") || tlsEnabled ? {} : undefined,
					maxRetriesPerRequest: 1,
					offlineQueue: false,
					connectTimeout: 5000,
				});
			}
		}

		this.redis.on("error", (err: any) => this.logger.error("Redis error:", err));
		this.redis.on("connect", () => this.logger.info("Redis connected."));
		this.redis.on("ready", () => this.logger.info("Redis ready."));
	}

	private k(key: string): string {
		return this.prefix ? `${this.prefix}:${key}` : key;
	}

	private toStr(value: string | object): string {
		return typeof value === "string" ? value : JSON.stringify(value);
	}

	private maybeParse<T>(raw: string | null): T | null {
		if (raw == null) return null;
		const s = String(raw);
		if (!s) return "" as unknown as T;
		try {
			return JSON.parse(s) as T;
		} catch {
			return s as unknown as T;
		}
	}

	private tagKey(tag: string): string {
		const t = String(tag).trim();
		return this.k(`tag:${t}`);
	}

	private tagRefsKey(key: string): string {
		return this.k(`tagrefs:${key}`);
	}

	private normalizeTags(tags: string[]): string[] {
		return (tags || []).map((t) => String(t).trim()).filter(Boolean);
	}

	private async cleanupTagsForKey(key: string, p?: any): Promise<void> {
		const refsKey = this.tagRefsKey(key);
		let tags: string[] = [];
		try {
			tags = (await (this.redis as any).smembers(refsKey).catch(() => [])) as string[];
		} catch {
			tags = [];
		}

		const pipe = p ?? (this.redis as any).pipeline();

		if (Array.isArray(tags) && tags.length > 0) {
			for (const tag of tags) {
				pipe.srem(this.tagKey(tag), key);
			}
		}
		pipe.del(refsKey);

		if (!p) {
			const res = await pipe.exec();
			const hasErr = res?.some(([err]: [any]) => !!err);
			if (hasErr) this.logger.warn(`[RedisCacheTransport] cleanupTagsForKey(${key}) pipeline had errors`);
		}
	}

	public async get<T = string>(key: string): Promise<T | null> {
		try {
			const res = await (this.redis as any).get(this.k(key));
			return this.maybeParse<T>(res);
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] get(${key}) failed:`, err);
			return null;
		}
	}

	public async set(key: string, value: string | object, ttlSec?: number): Promise<boolean> {
		try {
			const k = this.k(key);
			const v = this.toStr(value);

			const hasTtl = Number.isFinite(ttlSec) && (ttlSec as number) > 0;
			const ttl = hasTtl ? Math.floor(ttlSec as number) : undefined;

			const res = hasTtl ? await (this.redis as any).set(k, v, "EX", ttl) : await (this.redis as any).set(k, v);

			if (res !== "OK") {
				this.logger.warn(`[RedisCacheTransport] set(${key}) returned non-OK: ${String(res)}`);
				return false;
			}
			return true;
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] set(${key}) failed`);
			return false;
		}
	}

	public async del(key: string): Promise<boolean> {
		return this.delWithTags(key);
	}

	public async incrBy(key: string, increment = 1): Promise<number> {
		try {
			const inc = Number.isFinite(increment) ? Math.floor(increment) : 1;

			const newVal = await (this.redis as any).incrby(this.k(key), inc);

			if (typeof newVal !== "number") {
				this.logger.warn(`[RedisCacheTransport] incrBy(${key}, ${inc}) returned non-number: ${String(newVal)}`);
				return NaN;
			}

			return newVal;
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] incrBy(${key}, ${increment}) failed`);
			return NaN;
		}
	}

	public async expire(key: string, ttlSec: number): Promise<boolean> {
		try {
			const hasTtl = Number.isFinite(ttlSec) && ttlSec > 0;
			if (!hasTtl) {
				this.logger.warn(`[RedisCacheTransport] expire(${key}) skipped due to invalid ttlSec: ${ttlSec}`);
				return false;
			}
			const ttl = Math.floor(ttlSec);

			const res = await (this.redis as any).expire(this.k(key), ttl);
			return res === 1;
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] expire(${key}, ${ttlSec}) failed`, err);
			return false;
		}
	}

	public async mget<T = string>(keys: string[]): Promise<(T | null)[]> {
		if (!Array.isArray(keys) || keys.length === 0) return [];

		try {
			if (this.isCluster) {
				const results = await Promise.all(keys.map((key) => (this.redis as any).get(this.k(key)).catch(() => null)));
				return results.map((v) => this.maybeParse<T>(v));
			}

			const prefixed = keys.map((k) => this.k(k));
			const res: unknown = await (this.redis as any).mget(prefixed);

			if (!Array.isArray(res)) {
				this.logger.warn(`[RedisCacheTransport] mget returned non-array response: ${typeof res}`);
				return Array(keys.length).fill(null);
			}

			return (res as (string | null)[]).map((v) => this.maybeParse<T>(v));
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] mget failed`);
			return Array(keys.length).fill(null);
		}
	}

	public async mset(entries: Record<string, string | object>, ttlSec?: number): Promise<boolean> {
		try {
			if (!entries || Object.keys(entries).length === 0) return true;

			const hasTtl = Number.isFinite(ttlSec) && (ttlSec as number) > 0;
			const ttl = hasTtl ? Math.floor(ttlSec as number) : undefined;

			if (this.isCluster) {
				const results = await Promise.allSettled(
					Object.entries(entries).map(([k, v]) =>
						(this.redis as any).set(this.k(k), this.toStr(v), ...(ttl ? ["EX", ttl] : [])).catch((err: any) => {
							this.logger.error(`[RedisCacheTransport] mset(cluster) set(${k}) failed:`, err);
							return null;
						})
					)
				);

				const okCount = results.filter((r) => r.status === "fulfilled").length;
				return okCount === Object.keys(entries).length;
			}

			const kv: string[] = [];
			for (const [k, v] of Object.entries(entries)) {
				kv.push(this.k(k), this.toStr(v));
			}
			const res = await (this.redis as any).mset(kv);
			if (res !== "OK") {
				this.logger.warn(`[RedisCacheTransport] mset returned unexpected response: ${String(res)}`);
				return false;
			}

			if (ttl) {
				const p = (this.redis as any).pipeline();
				for (const k of Object.keys(entries)) p.expire(this.k(k), ttl);
				const results = await p.exec();
				const hasErr = results?.some(([err]: [any]) => !!err);
				if (hasErr) this.logger.warn(`[RedisCacheTransport] mset: one or more expire commands failed`);
			}

			return true;
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] mset failed`, err);
			return false;
		}
	}

	public async setWithTags(key: string, value: string | object, tags: string[], ttlSec?: number): Promise<boolean> {
		try {
			const normTags = this.normalizeTags(tags);
			const kData = this.k(key);
			const v = this.toStr(value);

			const hasTtl = Number.isFinite(ttlSec) && (ttlSec as number) > 0;
			const ttl = hasTtl ? Math.floor(ttlSec as number) : undefined;

			const p = (this.redis as any).pipeline();

			await this.cleanupTagsForKey(key, p);

			if (ttl) p.set(kData, v, "EX", ttl);
			else p.set(kData, v);

			if (normTags.length > 0) {
				for (const tag of normTags) {
					p.sadd(this.tagKey(tag), key);
				}
				p.sadd(this.tagRefsKey(key), ...normTags);

				if (ttl) p.expire(this.tagRefsKey(key), ttl);
			}

			const res = await p.exec();
			const hasErr = res?.some(([err]: [any]) => !!err);
			if (hasErr) {
				this.logger.warn(`[RedisCacheTransport] setWithTags(${key}) pipeline had errors`);
				return false;
			}
			return true;
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] setWithTags(${key}) failed:`, err);
			return false;
		}
	}

	public async msetWithTags(
		entries: Record<string, string | object>,
		tags: string[],
		ttlSec?: number
	): Promise<boolean> {
		try {
			if (!entries || Object.keys(entries).length === 0) return true;

			const normTags = this.normalizeTags(tags);
			const hasTtl = Number.isFinite(ttlSec) && (ttlSec as number) > 0;
			const ttl = hasTtl ? Math.floor(ttlSec as number) : undefined;

			const p = (this.redis as any).pipeline();

			for (const [key, value] of Object.entries(entries)) {
				await this.cleanupTagsForKey(key, p);

				const kData = this.k(key);
				const v = this.toStr(value);

				if (ttl) p.set(kData, v, "EX", ttl);
				else p.set(kData, v);

				if (normTags.length > 0) {
					for (const tag of normTags) p.sadd(this.tagKey(tag), key);
					p.sadd(this.tagRefsKey(key), ...normTags);
					if (ttl) p.expire(this.tagRefsKey(key), ttl);
				}
			}

			const res = await p.exec();
			const hasErr = res?.some(([err]: [any]) => !!err);
			if (hasErr) {
				this.logger.warn(`[RedisCacheTransport] msetWithTags pipeline had errors`);
				return false;
			}
			return true;
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] msetWithTags failed:`, err);
			return false;
		}
	}

	public async addTags(key: string, tags: string[]): Promise<boolean> {
		try {
			const normTags = this.normalizeTags(tags);
			if (normTags.length === 0) return true;

			const exists = await (this.redis as any).exists(this.k(key));
			if (exists !== 1) return false;

			const p = (this.redis as any).pipeline();
			for (const tag of normTags) {
				p.sadd(this.tagKey(tag), key);
			}
			p.sadd(this.tagRefsKey(key), ...normTags);

			const res = await p.exec();
			const hasErr = res?.some(([err]: [any]) => !!err);
			return !hasErr;
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] addTags(${key}) failed:`, err);
			return false;
		}
	}

	public async maddTags(keys: string[], tags: string[]): Promise<number> {
		try {
			const normTags = this.normalizeTags(tags);
			if (!Array.isArray(keys) || keys.length === 0) return 0;
			if (normTags.length === 0) return 0;

			let count = 0;
			const p = (this.redis as any).pipeline();

			for (const key of keys) {
				const exists = await (this.redis as any).exists(this.k(key)).catch(() => 0);
				if (exists !== 1) continue;

				for (const tag of normTags) p.sadd(this.tagKey(tag), key);
				p.sadd(this.tagRefsKey(key), ...normTags);
				count++;
			}

			if (count === 0) return 0;

			const res = await p.exec();
			const hasErr = res?.some(([err]: [any]) => !!err);
			if (hasErr) this.logger.warn(`[RedisCacheTransport] maddTags pipeline had errors`);

			return count;
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] maddTags failed:`, err);
			return 0;
		}
	}

	public async removeTags(key: string, tags: string[]): Promise<boolean> {
		try {
			const normTags = this.normalizeTags(tags);
			if (normTags.length === 0) return true;

			const p = (this.redis as any).pipeline();
			for (const tag of normTags) {
				p.srem(this.tagKey(tag), key);
			}
			p.srem(this.tagRefsKey(key), ...normTags);

			const res = await p.exec();
			const hasErr = res?.some(([err]: [any]) => !!err);
			return !hasErr;
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] removeTags(${key}) failed:`, err);
			return false;
		}
	}

	public async delWithTags(key: string): Promise<boolean> {
		try {
			const p = (this.redis as any).pipeline();

			p.del(this.k(key));

			await this.cleanupTagsForKey(key, p);

			const res = await p.exec();
			const hasErr = res?.some(([err]: [any]) => !!err);
			if (hasErr) {
				this.logger.warn(`[RedisCacheTransport] delWithTags(${key}) pipeline had errors`);
				return false;
			}

			return true;
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] delWithTags(${key}) failed:`, err);
			return false;
		}
	}

	public async getKeysByTag(tag: string): Promise<string[]> {
		try {
			const t = String(tag).trim();
			if (!t) return [];

			const tKey = this.tagKey(t);

			const res = await (this.redis as any).smembers(tKey);
			const keys = Array.isArray(res) ? res.map(String).filter(Boolean) : [];
			if (keys.length === 0) return [];

			const alive: string[] = [];
			const dead: string[] = [];

			if (this.isCluster) {
				for (const key of keys) {
					const ex = await (this.redis as any).exists(this.k(key)).catch(() => 0);
					if (ex === 1) alive.push(key);
					else dead.push(key);
				}
			} else {
				const p = (this.redis as any).pipeline();
				for (const key of keys) p.exists(this.k(key));

				const execRes = await p.exec();
				for (let i = 0; i < keys.length; i++) {
					const [, ex] = execRes?.[i] ?? [];
					if (ex === 1) alive.push(keys[i]);
					else dead.push(keys[i]);
				}
			}

			if (dead.length > 0) {
				await (this.redis as any).srem(tKey, ...dead).catch(() => null);
			}

			return alive;
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] getKeysByTag(${tag}) failed:`, err);
			return [];
		}
	}

	public async invalidateTag(tag: string): Promise<number> {
		try {
			const t = String(tag).trim();
			const keys = await this.getKeysByTag(t);
			const tKey = this.tagKey(t);

			if (keys.length === 0) {
				await (this.redis as any).del(tKey).catch(() => null);
				return 0;
			}

			const p1 = (this.redis as any).pipeline();
			for (const key of keys) {
				p1.smembers(this.tagRefsKey(key));
			}
			const res1 = await p1.exec();

			const keyToTags = new Map<string, string[]>();
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				const [err, tags] = res1?.[i] ?? [];
				const list = !err && Array.isArray(tags) ? tags.map(String).filter(Boolean) : [];
				keyToTags.set(key, list);
			}

			const p2 = (this.redis as any).pipeline();

			for (const key of keys) {
				p2.del(this.k(key));

				const refTags = keyToTags.get(key) ?? [];
				for (const refTag of refTags) {
					p2.srem(this.tagKey(refTag), key);
				}

				p2.del(this.tagRefsKey(key));

				p2.srem(tKey, key);
			}

			p2.del(tKey);

			const res2 = await p2.exec();
			const hasErr = res2?.some(([err]: [any]) => !!err);
			if (hasErr) this.logger.warn(`[RedisCacheTransport] invalidateTag(${tag}) pipeline had errors`);

			return keys.length;
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] invalidateTag(${tag}) failed:`, err);
			return 0;
		}
	}
}
