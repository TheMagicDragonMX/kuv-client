/**
 * The settings of the project that depend on where it runs.
 */
export type AppEnvironment = {
	/**
	 * Address of the API. Every HTTP request the app makes to the server starts with it.
	 */
	apiUrl: string;
};

/**
 * The settings the app runs with.
 */
export const environment: AppEnvironment = {
	apiUrl: 'http://localhost:5038',
};
