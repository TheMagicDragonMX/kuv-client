/**
 * What is sent in the URL to ask for a category of the feed.
 */
export type FeedParams = {
	/**
	 * How many creations to ask for at most. The API decides when it is left out, and never answers
	 * more than it allows.
	 */
	limit?: number;
};
