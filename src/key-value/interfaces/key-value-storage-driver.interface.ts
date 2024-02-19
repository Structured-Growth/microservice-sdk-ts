import { ValueInterface } from "./value.interface";

export interface KeyValueStorageDriverInterface {
	create(key: string, value: string, expiresInMinutes: number): Promise<ValueInterface>;

	read(key: string): Promise<ValueInterface | null>;

	update(key: string, value: string): Promise<ValueInterface>;

	delete(key: string): Promise<void>;
}
