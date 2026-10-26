/**
 * LAYER: blocks (registry).
 *
 * Every block a user can put in a script, organized by category, one file per block:
 *
 *   object/       change the objects of the world       create, move, moveTo, setColor, ...
 *   background/   change what is behind the objects     setBackgroundImage, setBackgroundColor
 *   control/      decide when other blocks run          wait, repeat, forever
 *
 * This file joins the categories. The rest of the engine asks it for the types (`Block`,
 * `Command`) and for the definition of a block by its `op`; it never imports a single block.
 * Read `README.md` in this folder to add a block or a category.
 */

import { BlockSchema } from './fields';
import { BlockDefinition, CommandDefinition } from './block-definition';
import { BACKGROUND_BLOCKS, BackgroundCommand } from './background';
import { CONTROL_BLOCKS, ControlBlock } from './control';
import { OBJECT_BLOCKS, ObjectCommand } from './object';

export type { BlockDefinition, CommandDefinition } from './block-definition';
export type { BlockSchema, FieldKind, FieldSchema } from './fields';
export type { BackgroundCommand, ControlBlock, ObjectCommand };

/**
 * A block that takes effect immediately. The commands layer knows how to apply these.
 */
export type Command = ObjectCommand | BackgroundCommand;

/**
 * Any block a script can contain.
 */
export type Block = Command | ControlBlock;

/**
 * The definition of each command, by `op`.
 */
export const COMMAND_BLOCKS: { [K in Command['op']]: CommandDefinition<Extract<Command, { op: K }>> } = {
	...OBJECT_BLOCKS,
	...BACKGROUND_BLOCKS,
};

/**
 * What the engine needs to know about any block, whatever its category.
 */
export interface AnyBlockDefinition {
	schema: BlockSchema;
}

const DEFINITIONS: { [K in Block['op']]: BlockDefinition<Extract<Block, { op: K }>> } = {
	...COMMAND_BLOCKS,
	...CONTROL_BLOCKS,
};

/**
 * The definition of the block with this `op`, or nothing if there is no such block.
 */
export function getBlockDefinition (op: string): AnyBlockDefinition | undefined {
	return Object.hasOwn(DEFINITIONS, op) ? DEFINITIONS[op as Block['op']] : undefined;
}
