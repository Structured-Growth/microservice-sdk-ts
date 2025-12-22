import { autoInjectable, inject } from "tsyringe";
import { LoggerInterface } from "../logger/interfaces/logger.interface";
import { CacheTransportInterface } from "./interfaces/cache-transport.interface";

@autoInjectable()
export class Cache {
	constructor(
		@inject("Logger") private logger: LoggerInterface,
		@inject("CacheTransport") private transport: CacheTransportInterface
	) {}

	public async get<T = string>(key: string): Promise<T | null> {
		return this.transport.get<T>(key);
	}

	public async set(key: string, value: string | object, ttlSec?: number): Promise<boolean> {
		return this.transport.set(key, value, ttlSec);
	}

	public async del(key: string): Promise<boolean> {
		return this.transport.del(key);
	}

	public async incrBy(key: string, increment = 1): Promise<number> {
		return this.transport.incrBy(key, increment);
	}

	public async expire(key: string, ttlSec: number): Promise<boolean> {
		return this.transport.expire(key, ttlSec);
	}

	public async mget<T = string>(keys: string[]): Promise<(T | null)[]> {
		return this.transport.mget<T>(keys);
	}

	public async mset(entries: Record<string, string | object>, ttlSec?: number): Promise<boolean> {
		return this.transport.mset(entries, ttlSec);
	}

	public async setWithTags(key: string, value: string | object, tags: string[], ttlSec?: number): Promise<boolean> {
		return this.transport.setWithTags(key, value, tags, ttlSec);
	}

	public async msetWithTags(
		entries: Record<string, string | object>,
		tags: string[],
		ttlSec?: number
	): Promise<boolean> {
		return this.transport.msetWithTags(entries, tags, ttlSec);
	}

	public async addTags(key: string, tags: string[]): Promise<boolean> {
		return this.transport.addTags(key, tags);
	}

	public async maddTags(keys: string[], tags: string[]): Promise<number> {
		return this.transport.maddTags(keys, tags);
	}

	public async removeTags(key: string, tags: string[]): Promise<boolean> {
		return this.transport.removeTags(key, tags);
	}

	public async delWithTags(key: string): Promise<boolean> {
		return this.transport.delWithTags(key);
	}

	public async getKeysByTag(tag: string): Promise<string[]> {
		return this.transport.getKeysByTag(tag);
	}

	public async invalidateTag(tag: string): Promise<number> {
		return this.transport.invalidateTag(tag);
	}
}
