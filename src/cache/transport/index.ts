import { RedisCacheTransport } from "./redis-cache-transport";
import { MemoryCacheTransport } from "./memory-cache-transport";

export const cacheTransports = {
	RedisCacheTransport,
	MemoryCacheTransport,
};

export { RedisCacheTransport, MemoryCacheTransport };
