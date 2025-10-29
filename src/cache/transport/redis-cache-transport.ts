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
		const res = await (this.redis as any).get(this.k(key));
		return this.maybeParse<T>(res);
	}

	public async set(key: string, value: string | object, ttlSec?: number): Promise<boolean> {
		const k = this.k(key);
		const v = this.toStr(value);
		const res =
			ttlSec && ttlSec > 0 ? await (this.redis as any).set(k, v, "EX", ttlSec) : await (this.redis as any).set(k, v);
		return res === "OK";
	}

	public async del(key: string): Promise<boolean> {
		const res = await (this.redis as any).del(this.k(key));
		return res > 0;
	}

	public async incrBy(key: string, increment = 1): Promise<number> {
		return (this.redis as any).incrby(this.k(key), increment);
	}

	public async expire(key: string, ttlSec: number): Promise<boolean> {
		const res = await (this.redis as any).expire(this.k(key), ttlSec);
		return res === 1;
	}

	public async mget<T = string>(keys: string[]): Promise<(T | null)[]> {
		if (keys.length === 0) return [];
		const prefixed = keys.map((k) => this.k(k));
		const res: (string | null)[] = await (this.redis as any).mget(prefixed);
		return res.map((v) => this.maybeParse<T>(v));
	}

	public async mset(entries: Record<string, string | object>, ttlSec?: number): Promise<boolean> {
		const kv: string[] = [];
		for (const [k, v] of Object.entries(entries)) kv.push(this.k(k), this.toStr(v));
		if (kv.length === 0) return true;

		const ok = (await (this.redis as any).mset(kv)) === "OK";
		if (!ok) return false;

		if (ttlSec && ttlSec > 0) {
			const pipeline = (this.redis as any).pipeline();
			for (const k of Object.keys(entries)) pipeline.expire(this.k(k), ttlSec);
			await pipeline.exec();
		}
		return true;
	}
}
