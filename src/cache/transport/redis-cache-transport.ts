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
		try {
			const res = await (this.redis as any).del(this.k(key));

			if (typeof res !== "number") {
				this.logger.warn(`[RedisCacheTransport] del(${key}) returned unexpected type: ${typeof res}`);
				return false;
			}

			return res > 0;
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] del(${key}) failed`);
			return false;
		}
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

			if (res === 1) return true;

			this.logger.info(`[RedisCacheTransport] expire(${key}, ${ttl}) returned 0 (key may not exist).`);
			return false;
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] expire(${key}, ${ttlSec}) failed`);
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

			const kv: string[] = [];
			for (const [k, v] of Object.entries(entries)) {
				try {
					kv.push(this.k(k), this.toStr(v));
				} catch (convErr: any) {
					this.logger.warn(`[RedisCacheTransport] mset: failed to serialize value for key "${k}": ${convErr.message}`);
				}
			}
			if (kv.length === 0) return true;

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

			const res = await (this.redis as any).mset(kv);
			if (res !== "OK") {
				this.logger.warn(`[RedisCacheTransport] mset returned unexpected response: ${String(res)}`);
				return false;
			}

			if (ttl) {
				const pipeline = (this.redis as any).pipeline();
				for (const k of Object.keys(entries)) {
					pipeline.expire(this.k(k), ttl);
				}

				const results = await pipeline.exec();
				const hasError = results?.some(([err]: [any]) => !!err);

				if (hasError) {
					this.logger.warn(`[RedisCacheTransport] mset: one or more expire commands failed`);
				}
			}

			return true;
		} catch (err: any) {
			this.logger.error(`[RedisCacheTransport] mset failed`);
			return false;
		}
	}
}
