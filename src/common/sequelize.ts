import * as pg from "pg";
import { container } from "tsyringe";
import { Logger } from "../logger/logger";

/**
 * Creates a database connection optimized for using inside AWS Lambda environment.
 */
export async function connectDatabase(
	Sequelize,
	config: {
		host: string;
		username: string;
		password: string;
		database: string;
		port: number;
		schema?: string;
		pool?: Partial<{
			max: number;
			min: number;
			acquire: number;
			idle: number;
			evict: number;
			maxUses: number;
		}>;
		dialectOptions?: Record<string, any>;
		benchmark?: boolean;
		logging?: any;
		migrationStorageTableSchema?: string;
		migrationStorageTableName?: string;
	},
	enableLogging: boolean = false
) {
	const logger = container.resolve<Logger>("Logger");
	logger.module = "DB";

	const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

	const lambdaDialectOptions = isLambda
		? {
				clientMinMessages: "ignore",
		  }
		: {};

	const lambdaOverrides = isLambda
		? {
				pool: { max: 1, min: 0 },
				bindParam: false,
				standardConformingStrings: false,
				keepDefaultTimezone: true,
		  }
		: {};

	const sequelize = new Sequelize({
		dialect: "postgres",
		dialectModule: pg,
		host: config.host,
		port: config.port,
		username: config.username,
		password: config.password,
		database: config.database,
		schema: config.schema,
		pool: isLambda ? { ...lambdaOverrides.pool } : config.pool,
		dialectOptions: {
			...(config.dialectOptions ?? {}),
			...(isLambda ? lambdaDialectOptions : {}),
		},
		benchmark: config.benchmark ?? true,
		logging: false,
		...(isLambda
			? {
					bindParam: lambdaOverrides.bindParam,
					standardConformingStrings: lambdaOverrides.standardConformingStrings,
					keepDefaultTimezone: lambdaOverrides.keepDefaultTimezone,
			  }
			: {}),
	});

	// @ts-ignore
	sequelize.options.logging = enableLogging ? (msg) => logger.debug(msg) : false;

	await sequelize.authenticate();
	logger.debug("Connected to", config.database);

	return sequelize;
}
