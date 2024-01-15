import "reflect-metadata";
import {container} from "tsyringe";
import {LoggerInterface, registerConsoleLogger} from "../src";

registerConsoleLogger();

const logger = container.resolve<LoggerInterface>('Logger');
logger.info("Logger works!");