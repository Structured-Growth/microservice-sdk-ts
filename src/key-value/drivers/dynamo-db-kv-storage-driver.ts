import * as Dynamodb from "aws-sdk/clients/dynamodb";
import { KeyValueStorageDriverInterface } from "../interfaces/key-value-storage-driver.interface";
import { ValueInterface } from "../interfaces/value.interface";
import { autoInjectable, inject, injectWithTransform } from "tsyringe";
import { LoggerTransform } from "../../logger/log-context.transform";
import { LoggerInterface } from "../../logger/interfaces/logger.interface";

@autoInjectable()
export class DynamoDbKvStorageDriver implements KeyValueStorageDriverInterface {
	private client: Dynamodb;
	private tableName: string;

	constructor(
		@injectWithTransform("Logger", LoggerTransform, { module: "DynamoDbKvStorageDriver" })
		private logger: LoggerInterface,
		@inject("region") private region: string
	) {
		const stage = process.env.STAGE || "dev";
		this.tableName = `key-value-storage-${stage}`;
		this.client = new Dynamodb({
			apiVersion: "2012-08-10",
			region: this.region,
		});
	}

	public async create(key: string, value: string, expiresInMinutes: number): Promise<ValueInterface> {
		const expirationDate = new Date();
		expirationDate.setMinutes(expirationDate.getMinutes() + expiresInMinutes);
		const result = await this.client
			.putItem({
				TableName: this.tableName,
				Item: {
					key: { S: key },
					value: { S: value },
					expiresAt: { N: Math.floor(expirationDate.getTime() / 1000).toString() },
				},
			})
			.promise();
		this.logger.debug(`Item saved`, key);

		return { key, value, expiresAt: expirationDate.toISOString() };
	}

	public async read(key: string): Promise<ValueInterface | null> {
		const result = await this.client
			.getItem({
				TableName: this.tableName,
				Key: {
					key: { S: key },
				},
			})
			.promise();

		if (!result?.Item) {
			return null;
		}

		const item = Dynamodb.Converter.unmarshall(result.Item);

		return item as ValueInterface;
	}

	public async update(key: string, value: string): Promise<ValueInterface> {
		const result = await this.client
			.updateItem({
				TableName: this.tableName,
				Key: {
					key: { S: key },
				},
				UpdateExpression: "SET #field =:value",
				ExpressionAttributeNames: {
					"#field": "value",
				},
				ExpressionAttributeValues: {
					":value": {
						S: value,
					},
				},
				ReturnValues: "ALL_NEW",
			})
			.promise();
		this.logger.debug(`Item updated`, key);
		const item = Dynamodb.Converter.unmarshall(result.Attributes);

		return item as ValueInterface;
	}

	public async delete(key: string): Promise<void> {
		const result = await this.client
			.deleteItem({
				TableName: this.tableName,
				Key: {
					key: { S: key },
				},
			})
			.promise();
		this.logger.debug(`Item deleted`, key);
	}
}
