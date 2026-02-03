import { autoInjectable, injectWithTransform } from "tsyringe";
import { LoggerTransform } from "../../logger/log-context.transform";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";
import { CacheTransportInterface } from "../interfaces/cache-transport.interface";

/**
 * NoCacheTransport is a "cache disabled" transport.
 *
 * - get/mget always return nulls (cache miss)
 * - write operations are no-ops and return success
 * - tag operations are no-ops
 *
 * Useful when you want to completely disable caching on a service
 * without changing business logic code that depends on Cache.
 */
@autoInjectable()
export class NoCacheTransport implements CacheTransportInterface {
	constructor(
		@injectWithTransform("Logger", LoggerTransform, { module: "NoCacheTransport" })
		private logger: LoggerInterface
	) {}

	public async get<T = string>(_key: string): Promise<T | null> {
		return null;
	}

	public async set(_key: string, _value: string | object, _ttlSec?: number): Promise<boolean> {
		return true;
	}

	public async del(_key: string): Promise<boolean> {
		return true;
	}

	public async incrBy(_key: string, increment = 1): Promise<number> {
		return Number.isFinite(increment) ? Math.floor(increment) : 1;
	}

	public async expire(_key: string, _ttlSec: number): Promise<boolean> {
		return true;
	}

	public async mget<T = string>(keys: string[]): Promise<(T | null)[]> {
		return new Array(keys.length).fill(null);
	}

	public async mset(_entries: Record<string, string | object>, _ttlSec?: number): Promise<boolean> {
		return true;
	}

	public async setWithTags(_key: string, _value: string | object, _tags: string[], _ttlSec?: number): Promise<boolean> {
		return true;
	}

	public async msetWithTags(
		_entries: Record<string, string | object>,
		_tags: string[],
		_ttlSec?: number
	): Promise<boolean> {
		return true;
	}

	public async addTags(_key: string, _tags: string[]): Promise<boolean> {
		return true;
	}

	public async maddTags(_keys: string[], _tags: string[]): Promise<number> {
		return 0;
	}

	public async removeTags(_key: string, _tags: string[]): Promise<boolean> {
		return true;
	}

	public async delWithTags(_key: string): Promise<boolean> {
		return true;
	}

	public async getKeysByTag(_tag: string): Promise<string[]> {
		return [];
	}

	public async invalidateTag(_tag: string): Promise<number> {
		return 0;
	}
}
