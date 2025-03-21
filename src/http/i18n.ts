import * as i18n from "i18n";
import * as path from "path";
import { asyncLocalStorage } from "../common/async-local-storage";
import { signedInternalFetch } from "../fetch";
import { container } from "tsyringe";
import { config } from "dotenv";
config();

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
	directory: process.env.DEFAULT_TRANSLATE_DIRECTORY_PATH
		? path.resolve(process.env.DEFAULT_TRANSLATE_DIRECTORY_PATH)
		: path.join(process.cwd(), "src", "i18n", "locales"),
	api: {
		t: "t",
	},
});

export const translationSetCache: Record<string, object> = {};
const translationSetCacheExpiration: Record<string, number> = {};
export const translationSetFetching: Record<string, Promise<any> | null> = {};

export async function loadTranslations(lang: string) {
	try {
		if (
			!translationSetCache[lang] ||
			(translationSetCacheExpiration[lang] && Date.now() > translationSetCacheExpiration[lang])
		) {
			if (!translationSetFetching[lang]) {
				translationSetFetching[lang] = new Promise(async (resolve, reject) => {
					try {
						const url = `${process.env.TRANSLATE_API_URL}/v1/translation-set/${process.env.TRANSLATE_API_CLIENT_ID}/${lang}`;
						const response = await signedInternalFetch(url, {
							method: "get",
							headers: {
								"Content-Type": "application/json",
							},
						});

						if (!response.ok) throw new Error(`Error loading translation (${response.status})`);

						translationSetCache[lang] = (await response.json()) as any;
						console.log("translationSetCache Response: ", translationSetCache);
						translationSetCacheExpiration[lang] =
							Date.now() + (Number(process.env.DEFAULT_TRANSLATION_CACHE_EXPIRATION) || 3600 * 1000);
						resolve(translationSetCache[lang]);
					} catch (err) {
						reject(err);
					} finally {
						translationSetFetching[lang] = null;
					}
				});
			}
			await translationSetFetching[lang];
		}

		console.log("translationSetCache Final: ", translationSetCache[lang]);
		return translationSetCache[lang];
	} catch (err) {
		console.error(`Error loading translation from API: ${err}`);
		return {};
	}
}

export async function getI18nInstance(req): Promise<typeof i18n> {
	const DEFAULT_LANGUAGE = process.env.DEFAULT_LANGUAGE || "en-US";
	const supportedLngs = process.env.DEFAULT_AVAILABLE_LANGUAGES?.split(",") || ["en"];
	const TRANSLATE_API_URL = process.env.TRANSLATE_API_URL;
	const TRANSLATE_API_CLIENT_ID = process.env.TRANSLATE_API_CLIENT_ID;
	console.log("DEFAULT_LANGUAGE: ", DEFAULT_LANGUAGE);
	console.log("supportedLngs: ", supportedLngs);
	console.log("TRANSLATE_API_URL: ", TRANSLATE_API_URL);
	console.log("TRANSLATE_API_CLIENT_ID: ", TRANSLATE_API_CLIENT_ID);

	const i18nInstance = Object.create(i18n);
	const acceptLanguageHeader = req.headers["Accept-Language"];
	console.log("acceptLanguageHeader: ", acceptLanguageHeader);
	const acceptLanguage = Array.isArray(acceptLanguageHeader)
		? acceptLanguageHeader[0]?.split(",")[0].split(";")[0]
		: acceptLanguageHeader?.split(",")[0].split(";")[0];
	console.log("acceptLanguage: ", acceptLanguage);

	const lang = supportedLngs.includes(acceptLanguage) ? acceptLanguage : DEFAULT_LANGUAGE;
	i18nInstance.setLocale(lang);
	console.log("lang: ", lang);

	console.log("i18nInstance FIRST: ", i18nInstance);

	if (lang !== DEFAULT_LANGUAGE && TRANSLATE_API_URL && TRANSLATE_API_CLIENT_ID) {
		const translations = await loadTranslations(lang);
		console.log("translations: ", translations);

		if (Object.keys(translations).length > 0) {
			i18nInstance.locale = lang;
			i18nInstance.__ = (key: string) => {
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
	console.log("i18nInstance SECOND: ", i18nInstance);
	console.log("i18nInstance SECOND TARGET: ", i18nInstance.__("error.test_error"));
	return i18nInstance;
}
