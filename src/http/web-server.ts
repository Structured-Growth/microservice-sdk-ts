import * as express from "express";
import * as cors from "cors";
import * as bodyParser from "body-parser";
import * as multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export function webServer(routes) {
	const server = express();
	server.use(cors());
	server.use(bodyParser.json());

	server.use((req, res, next) => {
		const contentType = req.headers["content-type"] || "";
		if (contentType.includes("multipart/form-data")) {
			upload.any()(req, res, next);
		} else {
			next();
		}
	});

	routes.forEach((router) => server.use(router));

	return server;
}
