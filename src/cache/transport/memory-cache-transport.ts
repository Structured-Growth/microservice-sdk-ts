import { autoInjectable, injectWithTransform } from "tsyringe";
import { LoggerTransform } from "../../logger/log-context.transform";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";
import { CacheTransportInterface } from "../interfaces/cache-transport.interface";

type Entry = { value: string; expiresAt?: number };

@autoInjectable()
export class MemoryCacheTransport implements CacheTransportInterface {
	private store = new Map<string, Entry>();

	constructor(
		@injectWithTransform("Logger", LoggerTransform, { module: "MemoryCacheTransport" })
		private logger: LoggerInterface
	) {}

	private now() {
		return Date.now();
	}

	private gcOne(key: string) {
		const e = this.store.get(key);
		if (!e) return;
		if (e.expiresAt && e.expiresAt <= this.now()) {
			this.store.delete(key);
		}
	}

	public async get<T = string>(key: string): Promise<T | null> {
		this.gcOne(key);
		const e = this.store.get(key);
		if (!e) return null;
		try {
			return JSON.parse(e.value) as T;
		} catch {
			return e.value as unknown as T;
		}
	}

	public async set(key: string, value: string | object, ttlSec?: number): Promise<boolean> {
		const v = typeof value === "string" ? value : JSON.stringify(value);
		const expiresAt = ttlSec && ttlSec > 0 ? this.now() + ttlSec * 1000 : undefined;
		this.store.set(key, { value: v, expiresAt });
		return true;
	}

	public async del(key: string): Promise<boolean> {
		return this.store.delete(key);
	}

	public async incrBy(key: string, increment = 1): Promise<number> {
		const cur = await this.get<string>(key);
		const n = Number(cur ?? 0) + increment;
		await this.set(key, String(n));
		return n;
	}

	public async expire(key: string, ttlSec: number): Promise<boolean> {
		const e = this.store.get(key);
		if (!e) return false;
		e.expiresAt = this.now() + ttlSec * 1000;
		this.store.set(key, e);
		return true;
	}

	public async mget<T = string>(keys: string[]): Promise<(T | null)[]> {
		const res: (T | null)[] = [];
		for (const k of keys) res.push(await this.get<T>(k));
		return res;
	}

	public async mset(entries: Record<string, string | object>, ttlSec?: number): Promise<boolean> {
		for (const [k, v] of Object.entries(entries)) {
			await this.set(k, v, ttlSec);
		}
		return true;
	}
}
