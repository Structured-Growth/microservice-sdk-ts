import { autoInjectable, inject } from "tsyringe";
import { LoggerInterface } from "../logger/interfaces/logger.interface";
import { CacheTransportInterface } from "./interfaces/cache-transport.interface";
import { CacheInterface } from "./interfaces/cache.interface";

@autoInjectable()
export class CacheService implements CacheInterface {
	constructor(
		@inject("Logger") private logger: LoggerInterface,
		@inject("CacheTransport") private transport: CacheTransportInterface
	) {}

	/**
	 * Retrieve a value from cache by key.
	 *
	 * @param key Cache key
	 * @returns Parsed value or null if the key does not exist or has expired
	 */
	public async get<T = string>(key: string): Promise<T | null> {
		return this.transport.get<T>(key);
	}

	/**
	 * Store a value in cache.
	 *
	 * @param key Cache key
	 * @param value String or object (objects will be serialized)
	 * @param ttlSec Time-to-live in seconds (optional)
	 * @returns true if the value was successfully stored
	 */
	public async set(key: string, value: string | object, ttlSec?: number): Promise<boolean> {
		return this.transport.set(key, value, ttlSec);
	}

	/**
	 * Delete a key from cache.
	 *
	 * @param key Cache key
	 * @returns true if the key existed and was removed
	 */
	public async del(key: string): Promise<boolean> {
		return this.transport.del(key);
	}

	/**
	 * Increment a numeric cache value.
	 * If the key does not exist, it is treated as 0.
	 *
	 * @param key Cache key
	 * @param increment Increment value (default: 1)
	 * @returns New numeric value
	 */
	public async incrBy(key: string, increment = 1): Promise<number> {
		return this.transport.incrBy(key, increment);
	}

	/**
	 * Set or update TTL for an existing cache key.
	 *
	 * @param key Cache key
	 * @param ttlSec Time-to-live in seconds
	 * @returns true if TTL was successfully updated
	 */
	public async expire(key: string, ttlSec: number): Promise<boolean> {
		return this.transport.expire(key, ttlSec);
	}

	/**
	 * Retrieve multiple cache values by their keys.
	 *
	 * @param keys List of cache keys
	 * @returns Array of values (order is preserved)
	 */
	public async mget<T = string>(keys: string[]): Promise<(T | null)[]> {
		return this.transport.mget<T>(keys);
	}

	/**
	 * Store multiple values in cache.
	 *
	 * @param entries Object in the form { key: value }
	 * @param ttlSec Common TTL for all keys (optional)
	 * @returns true if all entries were stored successfully
	 */
	public async mset(entries: Record<string, string | object>, ttlSec?: number): Promise<boolean> {
		return this.transport.mset(entries, ttlSec);
	}

	/**
	 * Store a value in cache and associate it with tags.
	 *
	 * Tags are used to group cache entries and invalidate them in bulk.
	 *
	 * @param key Cache key
	 * @param value Value to store
	 * @param tags List of tags
	 * @param ttlSec Time-to-live in seconds (optional)
	 */
	public async setWithTags(key: string, value: string | object, tags: string[], ttlSec?: number): Promise<boolean> {
		return this.transport.setWithTags(key, value, tags, ttlSec);
	}

	/**
	 * Store multiple values in cache and associate them with tags.
	 *
	 * All keys will be linked to the same set of tags.
	 *
	 * @param entries Object { key: value }
	 * @param tags Shared tags
	 * @param ttlSec Time-to-live in seconds (optional)
	 */
	public async msetWithTags(
		entries: Record<string, string | object>,
		tags: string[],
		ttlSec?: number
	): Promise<boolean> {
		return this.transport.msetWithTags(entries, tags, ttlSec);
	}

	/**
	 * Add tags to an existing cache key.
	 *
	 * @param key Cache key
	 * @param tags Tags to add
	 * @returns true if the key exists and tags were added
	 */
	public async addTags(key: string, tags: string[]): Promise<boolean> {
		return this.transport.addTags(key, tags);
	}

	/**
	 * Add tags to multiple cache keys.
	 *
	 * @param keys List of cache keys
	 * @param tags Tags to add
	 * @returns Number of keys that were updated
	 */
	public async maddTags(keys: string[], tags: string[]): Promise<number> {
		return this.transport.maddTags(keys, tags);
	}

	/**
	 * Remove specific tags from a cache key.
	 *
	 * @param key Cache key
	 * @param tags Tags to remove
	 */
	public async removeTags(key: string, tags: string[]): Promise<boolean> {
		return this.transport.removeTags(key, tags);
	}

	/**
	 * Delete a cache key along with all associated tags.
	 *
	 * @param key Cache key
	 * @returns true if deletion was successful
	 */
	public async delWithTags(key: string): Promise<boolean> {
		return this.transport.delWithTags(key);
	}

	/**
	 * Get all cache keys associated with a specific tag.
	 *
	 * @param tag Tag name
	 * @returns List of active cache keys
	 */
	public async getKeysByTag(tag: string): Promise<string[]> {
		return this.transport.getKeysByTag(tag);
	}

	/**
	 * Invalidate all cache entries associated with a tag.
	 *
	 * Commonly used when underlying data changes
	 * and multiple cache entries must be cleared.
	 *
	 * @param tag Tag name
	 * @returns Number of removed cache keys
	 */
	public async invalidateTag(tag: string): Promise<number> {
		return this.transport.invalidateTag(tag);
	}
}
