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
export interface RepeatBlock {
	op: 'repeat';
	times: number;
	body: Block[];
}

export const repeatBlock: BlockDefinition<RepeatBlock> = {
	schema: {
		times: FIELD.count,
		body: FIELD.blocks,
	},
};
