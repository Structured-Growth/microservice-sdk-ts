import { Sequelize } from "sequelize";
import * as pg from "pg";
import { container } from "tsyringe";
import { Logger } from "../logger/logger";

/**
 * Creates a database connection optimized for using inside AWS Lambda environment.
 */
export async function connectDatabase(
	host: string,
	username: string,
	password: string,
	database: string,
	port: number = 5432,
	enableLogging: boolean = false
): Promise<Sequelize> {
	// avoid connection pinning inside lambda environment
	const extraOptions = process.env.AWS_LAMBDA_FUNCTION_NAME
		? {
				dialectOptions: {
					clientMinMessages: "ignore", // disable SET query to avoid connection pinning
				},
				pool: {
					max: 1,
					min: 0,
				},
				bindParam: false, // use replacements instead of prepared statements to avoid connection pinning
				standardConformingStrings: false, // disable SET query to avoid connection pinning
				keepDefaultTimezone: true, // disable SET query to avoid connection pinning
		  }
		: {};

	const sequelize = new Sequelize({
		host,
		port,
		username,
		password,
		database,
		dialect: "postgres",
		dialectModule: pg,
		...extraOptions,
	});

	const logger = container.resolve<Logger>("Logger");
	logger.module = "DB";
	// @ts-ignore
	sequelize.options.logging = enableLogging ? (msg) => logger.debug(msg) : false;

	await sequelize.authenticate();
	logger.debug("Connected to", database);

	return sequelize;
}
