import { ObjectSchema } from "joi";
import { set, get, size, omitBy, isUndefined } from "lodash";
import { asyncLocalStorage } from "../common/async-local-storage";
import { signedInternalFetch } from "../fetch";
import * as fs from "fs";
import * as path from "path";
import * as defaultJoiTranslations from "../locale/joi.json";

const translationCache: Record<string, { client: object }> = {};
const translationCacheExpiration: Record<string, number> = {};
const translationFetching: Record<string, Promise<void> | null> = {};

async function loadValidationTranslations(locale: string): Promise<{
	client: object;
}> {
	if (
		!translationCache[locale] ||
		(translationCacheExpiration[locale] && Date.now() > translationCacheExpiration[locale])
	) {
		if (!translationFetching[locale]) {
			translationFetching[locale] = new Promise(async (resolve, reject) => {
				try {
					const urlClient = `${process.env.TRANSLATE_API_URL}/v1/translation-set/${process.env.TRANSLATE_API_CLIENT_ID}/${locale}`;
					const responseClient = await signedInternalFetch(urlClient, {
						method: "get",
						headers: { "Content-Type": "application/json" },
					});
					if (!responseClient.ok) throw new Error(`Client translations error (${responseClient.status})`);
					const client = (await responseClient.json()) as object;

					translationCache[locale] = { client };
					translationCacheExpiration[locale] =
						Date.now() + (Number(process.env.DEFAULT_TRANSLATION_CACHE_EXPIRATION) || 3600 * 1000);

					resolve();
				} catch (err) {
					reject(err);
				} finally {
					translationFetching[locale] = null;
				}
			});
		}
		await translationFetching[locale];
	}
	return translationCache[locale];
}

function loadLocalTranslations(defaultLocale: string): {
	joiTranslations: object;
	clientTranslations: object;
} {
	let joiTranslations = {};
	let clientTranslations = {};

	try {
		const clientPath = path.resolve(
			process.cwd(),
			`${process.env.DEFAULT_TRANSLATE_DIRECTORY_PATH}/${defaultLocale}.json`
		);

		joiTranslations = defaultJoiTranslations;
		clientTranslations = JSON.parse(fs.readFileSync(clientPath, "utf-8"));
	} catch (err) {
		console.log("Error reading local translation files:", err);
	}

	return { joiTranslations, clientTranslations };
}

export function formatMessage(template: string, context: Record<string, any>): string {
	return template.replace(/{{#?([\w.]+)}}/g, (_, key) => {
		const value = get(context, key);
		return value !== undefined ? String(value) : "";
	});
}

export async function validate(
	validator: ObjectSchema,
	data: object
): Promise<{
	valid: boolean;
	message?: string;
	errors?: object;
}> {
	const store = asyncLocalStorage.getStore();
	const i18n = store?.i18n;
	const locale = i18n?.locale || process.env.DEFAULT_LANGUAGE;

	let translations;

	try {
		const { client } = await loadValidationTranslations(locale);
		translations = client;
	} catch (err) {
		console.warn("Failed to load remote translations, falling back to local:", err);

		const local = loadLocalTranslations(process.env.DEFAULT_LANGUAGE);
		translations = {
			...local.joiTranslations,
			...local.clientTranslations,
		};
	}

	const { error } = validator.validate(data, {
		abortEarly: false,
		errors: {
			wrap: {
				label: false,
			},
		},
	});
	const errors = {};
	let finalMessages = [];

	if (error?.details) {
		for (const detail of error.details) {
			console.log("Detail: ", detail);
			const pathKey = detail.path.join(".");
			const labelKey = detail.context?.label ?? pathKey;
			const label = get(translations, labelKey) ?? labelKey;

			const messageKey = `joi.${detail.type}`;
			const rawTemplate = get(translations, messageKey);
			const template = typeof rawTemplate === "string" ? rawTemplate : detail.message;

			const finalMessage = formatMessage(template, {
				...detail.context,
				label,
			});

			const existing = get(errors, pathKey) || [];
			existing.push(finalMessage);

			set(errors, pathKey, existing);
			finalMessages.push(finalMessage);
		}
	}

	return omitBy(
		{
			valid: !error,
			message: finalMessages.length ? finalMessages.join(". ") : undefined,
			errors: size(errors) ? errors : undefined,
		},
		isUndefined
	) as any;
}
