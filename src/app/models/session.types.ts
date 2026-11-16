/**
 * What the API answers after a login or a refresh.
 */
export type TokenResponse = {
	/**
	 * Token that authorizes requests.
	 */
	accessToken: string;

	/**
	 * Token used to get a new access token.
	 */
	refreshToken: string;

	/**
	 * Seconds the access token stays valid.
	 */
	expiresIn: number;
};

/**
 * What the API answers when a Google account belongs to a user: the session is ready.
 */
export type GoogleSignedIn = {
	/**
	 * Tells which answer this is.
	 */
	status: 'signedIn';

	/**
	 * The tokens of the new session.
	 */
	tokens: TokenResponse;
};

/**
 * What the API answers when no user has the Google account yet: the age and the username are
 * still needed to create it.
 */
export type GoogleNeedsProfile = {
	/**
	 * Tells which answer this is.
	 */
	status: 'needsProfile';

	/**
	 * The token to send back with the age and the username.
	 */
	signupToken: string;

	/**
	 * The email of the Google account.
	 */
	email: string;
};

/**
 * What the API answers to a sign in with Google.
 */
export type GoogleSessionResponse = GoogleSignedIn | GoogleNeedsProfile;

/**
 * What the API answers when asked whether a username or an email is free.
 */
export type Availability = {
	/**
	 * True when nobody has it.
	 */
	available: boolean;
};
