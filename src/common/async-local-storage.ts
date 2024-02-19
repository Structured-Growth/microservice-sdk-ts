// TODO: find solution for Next.js App as it's not working there. Maybe make a separate branch.
// node:async_hooks
// Module build failed: UnhandledSchemeError: Reading from "node:async_hooks" is not handled by plugins (Unhandled scheme).

// import { AsyncLocalStorage } from "node:async_hooks";

// export const asyncLocalStorage = new AsyncLocalStorage();

export const asyncLocalStorage = {
	getStore: () => "",
	run: (id, callback) => callback(),
};
