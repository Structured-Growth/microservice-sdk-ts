export interface CacheTransportInterface {
	get<T = string>(key: string): Promise<T | null>;
	set(key: string, value: string | object, ttlSec?: number): Promise<boolean>;
	del(key: string): Promise<boolean>;
	incrBy(key: string, increment?: number): Promise<number>;
	expire(key: string, ttlSec: number): Promise<boolean>;
	mget<T = string>(keys: string[]): Promise<(T | null)[]>;
	mset(entries: Record<string, string | object>, ttlSec?: number): Promise<boolean>;
}
