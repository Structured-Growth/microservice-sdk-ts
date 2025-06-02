// TODO: find solution for Next.js App as it's not working there. Maybe make a separate branch.
// node:async_hooks
// Module build failed: UnhandledSchemeError: Reading from "node:async_hooks" is not handled by plugins (Unhandled scheme).

import { AsyncLocalStorage } from "async_hooks";

export const asyncLocalStorage = new AsyncLocalStorage<{
	id: string;
	i18n: any;
}>();

// export const asyncLocalStorage = {
// 	getStore: () => ({
// 		id: ""
// 	}),
// 	run: (id, callback) => callback(),
// };
