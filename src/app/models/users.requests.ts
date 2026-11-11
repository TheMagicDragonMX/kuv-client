/**
 * What can be changed of one's own profile, sent in the body. A blank field is cleared.
 */
export type ProfileChanges = {
	/**
	 * What the user tells about themselves.
	 */
	description: string | null;

	/**
	 * Their picture as a data URL.
	 */
	photo: string | null;
};

/**
 * Identifies the user an endpoint is about.
 */
export type UserParams = {
	/**
	 * Identifies the user.
	 */
	id: number;
};

/**
 * The query params of the user search.
 */
export type SearchUsersParams = {
	/**
	 * Text the usernames must contain.
	 */
	search: string;
};
