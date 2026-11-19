/**
 * The settings of the project that depend on where it runs.
 */
export type AppEnvironment = {
	/**
	 * Address of the API. Every HTTP request the app makes to the server starts with it.
	 */
	apiUrl: string;

	/**
	 * The OAuth client ID of the Google Cloud project, which lets people sign in with Google. It is not
	 * a secret. While it is empty, the buttons to sign in with Google do not show.
	 */
	googleClientId: string;

	/**
	 * Whether the buttons to sign in with Google show. Turned off while the login with Google is set
	 * aside: hidden, the button never loads Google's script, so it prints nothing on the console.
	 */
	googleLoginShown: boolean;
};
