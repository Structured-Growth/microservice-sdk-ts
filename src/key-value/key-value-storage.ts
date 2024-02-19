import { autoInjectable, inject } from "tsyringe";
import { KeyValueStorageDriverInterface } from "./interfaces/key-value-storage-driver.interface";
import { ValueInterface } from "./interfaces/value.interface";

@autoInjectable()
export class KeyValueStorage implements KeyValueStorageDriverInterface {
	constructor(@inject("KeyValueStorageDriver") private driver: KeyValueStorageDriverInterface) {}

	create(key: string, value: string, expiresInMinutes: number): Promise<ValueInterface> {
		return this.driver.create(key, value, expiresInMinutes);
	}

	read(key: string): Promise<ValueInterface> {
		return this.driver.read(key);
	}

	update(key: string, value: string): Promise<ValueInterface> {
		return this.driver.update(key, value);
	}

	delete(key: string): Promise<void> {
		return this.driver.delete(key);
	}
}
