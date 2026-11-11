/**
 * CATEGORY: control.
 *
 * Blocks that decide when and how many times other blocks run. They do not change the world,
 * so they have no `apply`: the interpreter (`runtime/interpreter.ts`) gives them their meaning.
 *
 * To add a block to this category: write its file in this folder, add it to the union and to
 * the table below, and teach the interpreter what it means (its `switch` fails to compile
 * until it handles the new `op`).
 */

import { BlockDefinition } from '../block-definition';
import { ForeverBlock, foreverBlock } from './forever';
import { RepeatBlock, repeatBlock } from './repeat';
import { WaitBlock, waitBlock } from './wait';

/**
 * A block that controls the flow of a script.
 */
export type ControlBlock = WaitBlock | RepeatBlock | ForeverBlock;

/**
 * The definition of each control block, by `op`.
 */
export const CONTROL_BLOCKS: { [K in ControlBlock['op']]: BlockDefinition<Extract<ControlBlock, { op: K }>> } = {
	wait: waitBlock,
	repeat: repeatBlock,
	forever: foreverBlock,
};
