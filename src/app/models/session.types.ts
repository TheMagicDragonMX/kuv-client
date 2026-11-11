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
