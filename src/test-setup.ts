/**
 * Runs before every test file. Node 25 has its own `localStorage`, which hides the one of jsdom
 * and, without a file to save to, has no methods at all (`localStorage.clear` is not a function).
 * When that happens, the tests get a localStorage that lives in memory instead.
 */

/**
 * A localStorage that lives in memory.
 */
function memoryStorage (): Storage {
	const items = new Map<string, string>();

	return {
		get length () {
			return items.size;
		},
		clear: () => items.clear(),
		getItem: (key) => items.get(key) ?? null,
		key: (index) => [ ...items.keys() ][index] ?? null,
		removeItem: (key) => void items.delete(key),
		setItem: (key, value) => void items.set(key, String(value)),
	};
}

if ('function' !== typeof globalThis.localStorage?.clear)
	Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true, writable: true });
