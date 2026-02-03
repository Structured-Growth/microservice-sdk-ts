import { RedisCacheTransport } from "./redis-cache-transport";
import { MemoryCacheTransport } from "./memory-cache-transport";
import { NoCacheTransport } from "./no-cache-transport";

export const cacheTransports = {
	RedisCacheTransport,
	MemoryCacheTransport,
	NoCacheTransport,
};

export { RedisCacheTransport, MemoryCacheTransport, NoCacheTransport };
