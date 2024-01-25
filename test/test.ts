import "reflect-metadata";
import { container } from "tsyringe";
import { LoggerInterface } from "../src";

const logger = container.resolve<LoggerInterface>("Logger");
logger.info("Logger works!");
