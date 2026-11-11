/**
 * BLOCK: repeat (control).
 *
 * Runs its body a fixed number of times. Only the shape lives here; the loop itself is run by
 * the interpreter.
 */

import { BlockDefinition } from '../block-definition';
import { FIELD } from '../fields';
import { Block } from '../index';

/**
 * Runs its body a fixed number of times.
 */
export type RepeatBlock = {
	/**
	 * Identifies the block.
	 */
	op: 'repeat';

	/**
	 * How many times to run the body.
	 */
	times: number;

	/**
	 * The blocks to repeat.
	 */
	body: Block[];
};

/**
 * The shape of the block and its fields. What it does is handled by the interpreter.
 */
export const repeatBlock: BlockDefinition<RepeatBlock> = {
	schema: {
		times: FIELD.count,
		body: FIELD.blocks,
	},
};
