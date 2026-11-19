/**
 * A creation as the feed shows it, returned by the API: what a card needs, with its author.
 */
export type FeedCreation = {
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
	 * Address of the author's picture, or null when they have none.
	 */
	authorPhoto: string | null;

	/**
	 * Whether the creation has a recorded video.
	 */
	hasVideo: boolean;

	/**
	 * When it was created, as an ISO date.
	 */
	createdAt: string;
};
