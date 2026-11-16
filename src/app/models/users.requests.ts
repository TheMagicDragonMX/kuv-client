/**
 * What can be changed of one's own profile, sent in the body. A blank field is cleared.
 */
export type ProfileChanges = {
	/**
	 * What the user tells about themselves.
	 */
	bio: string | null;
};

/**
 * The picture to use as one's own profile picture, sent in the body.
 */
export type PhotoPayload = {
	/**
	 * The image: PNG, JPEG, WebP or GIF, up to 300 KB.
	 */
	photo: Blob;
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
