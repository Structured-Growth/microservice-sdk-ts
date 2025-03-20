import { container } from "tsyringe";
import { Request, Response } from "express";
import * as hyperid from "hyperid";
import { Logger } from "../logger";
import { asyncLocalStorage } from "../common/async-local-storage";
import { ValidationError } from "../common/errors/validation.error";
import * as i18n from "i18n";
import * as path from "path";
import { signedInternalFetch } from "../fetch";
import { assumedRoleIdType } from "aws-sdk/clients/sts";

const generator = hyperid({ urlSafe: true });

container.register("i18n", {
	useValue: () => {
		const store = asyncLocalStorage.getStore();
		return store?.i18n;
	},
});

i18n.configure({
	locales: process.env.DEFAULT_AVAILABLE_LANGUAGES?.split(",") || ["en"],
	defaultLocale: process.env.DEFAULT_LANGUAGE || "en-US",
	updateFiles: false,
	queryParameter: "lang",
	objectNotation: true,
	directory: path.join(process.cwd(), "src", "i18n", "locales"),
	api: {
		t: "t",
	},
});

const translationSetCache: Record<string, object> = {};
const translationSetCacheExpiration: Record<string, number> = {};
const translationSetFetching: Record<string, Promise<any> | null> = {};

async function loadTranslations(lang: string) {
	try {
		if (!translationSetCache[lang] || (translationSetCacheExpiration[lang] && Date.now() < translationSetCacheExpiration[lang])) {

			if (!translationSetFetching[lang]) {
				translationSetFetching[lang] = new Promise(async (resolve, reject) => {
					const url = `${process.env.TRANSLATE_API_URL}/v1/translation-set/${process.env.TRANSLATE_API_CLIENT_ID}/${lang}`;
					const response = await signedInternalFetch(url, {
						method: "get",
						headers: {
							"Content-Type": "application/json",
						},
					});

					if (!response.ok) throw new Error(`Error loading translation (${response.status})`);
					translationSetCache[lang] = await response.json() as any;
					translationSetCacheExpiration[lang] = Date.now() + 60000;
				});
			}
			await translationSetFetching[lang];
		}

		return translationSetCache[lang];
	} catch (err) {
		console.error(`Error loading translation from API: ${err}`);
		return {};
	}
}

export function handleRequest(
	controllerClass,
	method: string,
	options: {
		logRequestBody?: boolean;
		logResponses?: boolean;
	} = {}
) {
	const logger = container.resolve<Logger>("Logger");
	logger.module = "Http";

	return async function (req: Request, res: Response) {
		const DEFAULT_LANGUAGE = process.env.DEFAULT_LANGUAGE || "en-US";
		const supportedLngs = process.env.DEFAULT_AVAILABLE_LANGUAGES?.split(",") || ["en"];
		const TRANSLATE_API_URL = process.env.TRANSLATE_API_URL;
		const TRANSLATE_API_CLIENT_ID = process.env.TRANSLATE_API_CLIENT_ID;

		const i18nInstance = Object.create(i18n);
		const acceptLanguageHeader = req.headers["Accept-Language"];
		const acceptLanguage = Array.isArray(acceptLanguageHeader)
			? acceptLanguageHeader[0]?.split(",")[0].split(";")[0]
			: acceptLanguageHeader?.split(",")[0].split(";")[0];

		const lang = supportedLngs.includes(acceptLanguage) ? acceptLanguage : DEFAULT_LANGUAGE;
		console.log("Lang: ", lang);
		i18nInstance.setLocale(lang);

		if (lang !== DEFAULT_LANGUAGE && TRANSLATE_API_URL && TRANSLATE_API_CLIENT_ID) {
			const translations = await loadTranslations(lang);

			if (Object.keys(translations).length > 0) {
				i18nInstance.__ = (key: string) => {
					console.log("key: ", key);
					const keys = key.split(".");
					let result = translations;

					for (const k of keys) {
						result = result?.[k];
						if (result === undefined) return undefined;
					}

					return result;
				};
			}
		} else {
			i18nInstance.setLocale(DEFAULT_LANGUAGE);
		}

		const store = {
			id: generator(),
			i18n: i18nInstance,
		};

		await asyncLocalStorage.run(store, async () => {
			const controller = new controllerClass();
			const authenticationEnabled = container.resolve<boolean>("authenticationEnabled");
			const authorizationEnabled = container.resolve<boolean>("authorizationEnabled");
			const startTime = new Date().getTime();
			const { params, query, body } = req;
			let msg = options.logRequestBody ? JSON.stringify({ query, body }) : "";
			let result;

			try {
				controller.init(req, res);
				// authenticate principal via OAuth Server
				if (authenticationEnabled === true && controller.authenticationEnabled) {
					await controller.authenticate();
				}
				// authorize request via Policies Service
				if (authorizationEnabled === true && controller.authorizationEnabled) {
					await controller.authorize(method);
				}
				result = await controller[method]?.call(controller, ...Object.values(params), query, body);
				res.json(result);
				options.logResponses && (msg += " " + JSON.stringify(result));
			} catch (e) {
				console.error(e);
				res.status([400, 401, 402, 403, 404, 422].includes(e.code) ? e.code : 500);
				result = {
					code: e.code,
					name: e.name,
					message: e.message,
				};
				if (e instanceof ValidationError) {
					result.validation = e.validation || {};
				}
				if (res.statusCode === 500) {
					msg = e.message;
					msg += "\n" + e.stack;
				}
				res.json(result);
				options.logResponses && (msg += " " + JSON.stringify(result));
			} finally {
				const endTime = new Date().getTime();
				logger.debug(req.method, res.statusCode, req.path, `${endTime - startTime}ms`, msg || "");
			}
		});
	};
}
