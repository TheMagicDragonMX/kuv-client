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
export interface WaitBlock {
	op: 'wait';
	seconds: number;
}

export const waitBlock: BlockDefinition<WaitBlock> = {
	schema: {
		seconds: FIELD.seconds,
	},
};
