import { Environment, Program } from '../cube';

/**
 * What the editor sends to save a creation, in the body.
 */
export type CreationPayload = {
	/**
	 * Title of the creation.
	 */
	title: string;

	/**
	 * What the creation is about.
	 */
	description?: string;

	/**
	 * The cube program.
	 */
	program: Program;

	/**
	 * The environment the program runs in.
	 */
	environment?: Environment;

	/**
	 * How long the video lasts, in seconds.
	 */
	durationSeconds: number;

	/**
	 * Whether other users can see it.
	 */
	isPublic?: boolean;

	/**
	 * The recorded video.
	 */
	videoBlob?: Blob;
};

/**
 * The form data the API expects for a creation, sent in the body.
 */
export type CreationFormPayload = FormData;

/**
 * Identifies the creation an endpoint is about.
 */
export type CreationParams = {
	/**
	 * Identifies the creation.
	 */
	id: number;
};

/**
 * What is needed to build the address of a creation's video.
 */
export type VideoUrlParams = {
	/**
	 * Identifies the creation.
	 */
	id: number;

	/**
	 * Access token to put in the address so a `<video>` element can load it.
	 */
	token?: string | null;
};


/**
 * Request body to change whether a creation is public or private.
 */
export type CreationVisibilityPayload = {
	/**
	 * Whether other users can see the creation.
	 */
	isPublic: boolean;
};
