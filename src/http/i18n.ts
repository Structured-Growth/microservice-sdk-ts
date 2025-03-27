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

	const i18nInstance = Object.create(i18n);
	const acceptLanguageHeader = req.headers["Accept-Language"] || req.headers["accept-language"];
	const acceptLanguage = Array.isArray(acceptLanguageHeader)
		? acceptLanguageHeader[0]?.split(",")[0].split(";")[0]
		: acceptLanguageHeader?.split(",")[0].split(";")[0];

	const lang = supportedLngs.includes(acceptLanguage) ? acceptLanguage : DEFAULT_LANGUAGE;
	i18nInstance.setLocale(lang);

	if (TRANSLATE_API_URL && TRANSLATE_API_CLIENT_ID) {
		try {
			const translations = await loadTranslations(lang);

			if (Object.keys(translations).length > 0) {
				i18nInstance.locale = lang;
				i18nInstance.__ = (key: string) => {
					const keys = key.split(".");
					let result = translations;

					for (const k of keys) {
						result = result?.[k];
						if (result === undefined) return key;
					}

					return result;
				};
			} else {
				i18nInstance.setLocale(DEFAULT_LANGUAGE);
			}
		} catch (error) {
			console.log(`Translation loading error for "${lang}":`, error);
			i18nInstance.setLocale(DEFAULT_LANGUAGE);
		}
	} else {
		i18nInstance.setLocale(DEFAULT_LANGUAGE);
	}
	return i18nInstance;
}
