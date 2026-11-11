import { Environment, Program } from '../cube';

/**
 * A user's creation representation returned from the API.
 */
export type UserCreation = {
	/**
	 * Identifies the creation.
	 */
	id: number;

	/**
	 * Identifies the user who owns it.
	 */
	userId: number;

	/**
	 * Title of the creation.
	 */
	title: string;

	/**
	 * What the creation is about, if anything.
	 */
	description: string | null;

	/**
	 * The cube program, as JSON text.
	 */
	programJson: string;

	/**
	 * The environment the program runs in, as JSON text.
	 */
	environmentJson: string | null;

	/**
	 * How long the video lasts, in seconds.
	 */
	durationSeconds: number;

	/**
	 * Whether the creation has a recorded video.
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

/**
 * User creation with parsed cube program and environment.
 */
export type ParsedUserCreation = Omit<UserCreation, 'programJson' | 'environmentJson'> & {
	/**
	 * The cube program of the creation.
	 */
	program: Program;

	/**
	 * The environment of the creation, when it has one.
	 */
	environment?: Environment;
};
