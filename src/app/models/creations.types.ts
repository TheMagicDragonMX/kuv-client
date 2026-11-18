import { LoadedProgramFile, ProgramFile } from '../cube';

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
 * A creation with its program file, as the API returns it when one creation is asked for, created
 * or updated. The lists only carry `UserCreation`, without the program.
 */
export type UserCreationDetail = UserCreation & {
	/**
	 * The complete program of the creation: the program, the environment and the version of the
	 * format.
	 */
	programFile: ProgramFile;
};

/**
 * A creation with the program file checked and ready for the engine.
 */
export type ParsedUserCreation = Omit<UserCreationDetail, 'programFile'> & LoadedProgramFile;
