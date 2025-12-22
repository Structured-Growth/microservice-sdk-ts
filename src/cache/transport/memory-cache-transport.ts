import { autoInjectable, injectWithTransform } from "tsyringe";
import { LoggerTransform } from "../../logger/log-context.transform";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";
import { CacheTransportInterface } from "../interfaces/cache-transport.interface";

type Entry = { value: string; expiresAt?: number };

@autoInjectable()
export class MemoryCacheTransport implements CacheTransportInterface {
	private store = new Map<string, Entry>();

	private tagIndex = new Map<string, Set<string>>();
	private tagRefs = new Map<string, Set<string>>();

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
			this.cleanupTagsForKey(key);
		}
	}

	private normalizeTags(tags: string[]): string[] {
		return (tags || []).map((t) => String(t).trim()).filter(Boolean);
	}

	private cleanupTagsForKey(key: string) {
		const tags = this.tagRefs.get(key);
		if (!tags) return;
		for (const tag of tags) {
			const set = this.tagIndex.get(tag);
			if (set) {
				set.delete(key);
				if (set.size === 0) this.tagIndex.delete(tag);
			}
		}
		this.tagRefs.delete(key);
	}

	private attachTags(key: string, tags: string[]) {
		const norm = this.normalizeTags(tags);
		if (norm.length === 0) return;

		let refs = this.tagRefs.get(key);
		if (!refs) {
			refs = new Set<string>();
			this.tagRefs.set(key, refs);
		}

		for (const tag of norm) {
			refs.add(tag);

			let keys = this.tagIndex.get(tag);
			if (!keys) {
				keys = new Set<string>();
				this.tagIndex.set(tag, keys);
			}
			keys.add(key);
		}
	}

	private detachTags(key: string, tags: string[]) {
		const norm = this.normalizeTags(tags);
		if (norm.length === 0) return;

		const refs = this.tagRefs.get(key);
		for (const tag of norm) {
			const keys = this.tagIndex.get(tag);
			if (keys) {
				keys.delete(key);
				if (keys.size === 0) this.tagIndex.delete(tag);
			}
			refs?.delete(tag);
		}
		if (refs && refs.size === 0) this.tagRefs.delete(key);
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
		const existed = this.store.delete(key);
		this.cleanupTagsForKey(key);
		return existed;
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

	public async setWithTags(key: string, value: string | object, tags: string[], ttlSec?: number): Promise<boolean> {
		await this.set(key, value, ttlSec);

		this.cleanupTagsForKey(key);

		this.attachTags(key, tags);

		return true;
	}

	public async msetWithTags(
		entries: Record<string, string | object>,
		tags: string[],
		ttlSec?: number
	): Promise<boolean> {
		for (const [k, v] of Object.entries(entries)) {
			await this.set(k, v, ttlSec);
			this.cleanupTagsForKey(k);
			this.attachTags(k, tags);
		}
		return true;
	}

	public async addTags(key: string, tags: string[]): Promise<boolean> {
		this.gcOne(key);
		if (!this.store.has(key)) return false;
		this.attachTags(key, tags);
		return true;
	}

	public async maddTags(keys: string[], tags: string[]): Promise<number> {
		let count = 0;
		for (const k of keys) {
			this.gcOne(k);
			if (!this.store.has(k)) continue;
			this.attachTags(k, tags);
			count++;
		}
		return count;
	}

	public async removeTags(key: string, tags: string[]): Promise<boolean> {
		this.detachTags(key, tags);
		return true;
	}

	public async delWithTags(key: string): Promise<boolean> {
		const existed = this.store.delete(key);
		this.cleanupTagsForKey(key);
		return existed;
	}

	public async getKeysByTag(tag: string): Promise<string[]> {
		const t = String(tag).trim();
		if (!t) return [];
		const keys = this.tagIndex.get(t);
		if (!keys) return [];
		const out: string[] = [];
		for (const k of keys) {
			this.gcOne(k);
			if (this.store.has(k)) out.push(k);
		}
		return out;
	}

	public async invalidateTag(tag: string): Promise<number> {
		const keys = await this.getKeysByTag(tag);
		for (const k of keys) {
			await this.delWithTags(k);
		}
		this.tagIndex.delete(String(tag).trim());
		return keys.length;
	}
}
