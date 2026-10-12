/**
 * The two kinds of problems the cube can report. They are separate classes so a caller can
 * tell "the program is wrong" from "the program broke while running".
 */

/**
 * The program is not valid, so it cannot run at all. Raised before anything starts, and the
 * message says where the problem is (for example `scripts[0].blocks[2].count`).
 */
export class ProgramError extends Error {
	override name = 'ProgramError';
}

/**
 * A valid program asked for something impossible while it was running, for example moving an
 * object that does not exist. Only the script that caused it stops.
 */
export class EngineError extends Error {
	override name = 'EngineError';
}
