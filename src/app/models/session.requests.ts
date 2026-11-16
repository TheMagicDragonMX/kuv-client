/**
 * The data needed to log in, sent in the body.
 */
export type LoginPayload = {
	/**
	 * The username or the email the user logs in with.
	 */
	username: string;

	/**
	 * The user's password.
	 */
	password: string;
};

/**
 * The data needed to create an account, sent in the body.
 */
export type RegisterPayload = {
	/**
	 * The name the user logs in with.
	 */
	username: string;

	/**
	 * The user's email address.
	 */
	email: string;

	/**
	 * The user's age in years.
	 */
	age: number;

	/**
	 * The password for the new account.
	 */
	password: string;
};

/**
 * The data needed to get a new pair of tokens, sent in the body.
 */
export type RefreshPayload = {
	/**
	 * Token used to get a new access token.
	 */
	refreshToken: string;
};

/**
 * The data needed to sign in with Google, sent in the body.
 */
export type GoogleLoginPayload = {
	/**
	 * The ID token Google gave the browser when the user chose their account.
	 */
	idToken: string;
};

/**
 * The data that finishes creating an account that started with Google, sent in the body.
 */
export type GoogleSignupPayload = {
	/**
	 * The token the API gave when it did not know the Google account.
	 */
	signupToken: string;

	/**
	 * The user's age in years.
	 */
	age: number;

	/**
	 * The unique name the user chose.
	 */
	username: string;
};

/**
 * The query params that ask whether a username is free.
 */
export type UsernameParams = {
	/**
	 * The username to look for.
	 */
	username: string;
};
