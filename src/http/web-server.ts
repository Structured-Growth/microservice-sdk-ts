import * as express from "express";
import * as cors from "cors";
import * as bodyParser from "body-parser";

export function webServer(routes) {
	const server = express();
	server.use(cors());
	server.use(bodyParser.json());
	routes.forEach((router) => server.use(router));

	return server;
}
