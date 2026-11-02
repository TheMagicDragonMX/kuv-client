/**
 * BLOCK: wait (control).
 *
 * Pauses the script. Only the shape lives here; the pause itself is done by the interpreter.
 */

import { BlockDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Pauses the script for some seconds of real time.
 */
export type WaitBlock = {
	/**
	 * Identifies the block.
	 */
	op: 'wait';

	/**
	 * How long to pause, in seconds.
	 */
	seconds: number;
};

/**
 * The shape of the block and its fields. What it does is handled by the interpreter.
 */
export const waitBlock: BlockDefinition<WaitBlock> = {
	schema: {
		seconds: FIELD.seconds,
	},
};
