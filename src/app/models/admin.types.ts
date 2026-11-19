/**
 * A creation as the admin panel lists it: any user's, public or private, with its author.
 */
export type AdminCreation = {
	/**
	 * Identifies the creation.
	 */
	id: number;

	/**
	 * Title of the creation.
	 */
	title: string;

	/**
	 * Identifies the user who made it.
	 */
	authorId: number;

	/**
	 * Username of the user who made it.
	 */
	authorUsername: string;

	/**
	 * Whether it has its preview: the videos and the thumbnail.
	 */
	hasVideo: boolean;

	/**
	 * Whether other users can see it.
	 */
	isPublic: boolean;

	/**
	 * When it was created, as an ISO date.
	 */
	createdAt: string;

	/**
	 * When it was last changed, as an ISO date.
	 */
	updatedAt: string;
};
