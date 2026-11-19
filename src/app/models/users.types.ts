/**
 * A user's profile, as the signed-in user sees it.
 */
export type Profile = {
	/**
	 * Identifies the user.
	 */
	id: number;

	/**
	 * Their username.
	 */
	username: string;

	/**
	 * Their email; only on the signed-in user's own profile.
	 */
	email: string | null;

	/**
	 * What they tell about themselves, if anything.
	 */
	bio: string | null;

	/**
	 * Where their picture is, if they have one: the whole address, ready for an image. It changes when the
	 * picture does.
	 */
	photo: string | null;

	/**
	 * How many users follow them.
	 */
	followers: number;

	/**
	 * How many users they follow.
	 */
	following: number;

	/**
	 * Whether they follow the signed-in user.
	 */
	followsYou: boolean;

	/**
	 * Whether the signed-in user follows them.
	 */
	youFollow: boolean;

	/**
	 * Whether it is the signed-in user's own profile.
	 */
	isYou: boolean;

	/**
	 * Whether the signed-in user is a super admin, who gets the admin panel. Only ever true on
	 * their own profile.
	 */
	isSuperAdmin: boolean;
};

/**
 * A user in a list: followers, followed or search results.
 */
export type UserSummary = {
	/**
	 * Identifies the user.
	 */
	id: number;

	/**
	 * Their username.
	 */
	username: string;

	/**
	 * What they tell about themselves, if anything.
	 */
	bio: string | null;

	/**
	 * Where their picture is, if they have one: the whole address, ready for an image.
	 */
	photo: string | null;

	/**
	 * How many users follow them.
	 */
	followers: number;

	/**
	 * Whether they follow the signed-in user.
	 */
	followsYou: boolean;

	/**
	 * Whether the signed-in user follows them.
	 */
	youFollow: boolean;
};

/**
 * Longest bio a profile can have, as the API allows it.
 */
export const MAX_BIO = 280;
