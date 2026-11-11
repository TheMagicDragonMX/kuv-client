/**
 * The data needed to log in, sent in the body.
 */
export type LoginPayload = {
	/**
	 * The name the user logs in with.
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
