/**
 * BLOCK: forever (control).
 *
 * Runs its body again and again until the program is stopped. Only the shape lives here; the
 * loop itself is run by the interpreter, which makes sure it pauses once per iteration.
 */

import { BlockDefinition } from '../block-definition';
import { FIELD } from '../fields';
import { Block } from '../index';

/**
 * Runs its body again and again until the program is stopped.
 */
export type ForeverBlock = {
	/**
	 * Identifies the block.
	 */
	op: 'forever';

	/**
	 * The blocks to repeat.
	 */
	body: Block[];
};

/**
 * The shape of the block and its fields. What it does is handled by the interpreter.
 */
export const foreverBlock: BlockDefinition<ForeverBlock> = {
	schema: {
		body: FIELD.blocks,
	},
};
