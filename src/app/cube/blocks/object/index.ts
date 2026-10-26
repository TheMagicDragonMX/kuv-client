/**
 * CATEGORY: object.
 *
 * Blocks that change the objects of the world: create them, move them, recolor them, show,
 * hide or remove them.
 *
 * To add a block to this category: write its file in this folder, then add it to the union and
 * to the table below. The compiler fails if you do one and not the other.
 */

import { CommandDefinition } from '../block-definition';
import { CreateCommand, createBlock } from './create';
import { DeleteCommand, deleteBlock } from './delete';
import { HideCommand, hideBlock } from './hide';
import { MoveCommand, moveBlock } from './move';
import { MoveToCommand, moveToBlock } from './move-to';
import { PointUpCommand, pointUpBlock } from './point-up';
import { SetColorCommand, setColorBlock } from './set-color';
import { ShowCommand, showBlock } from './show';

/**
 * Every command that acts on an object.
 */
export type ObjectCommand =
	| CreateCommand
	| MoveCommand
	| MoveToCommand
	| SetColorCommand
	| ShowCommand
	| HideCommand
	| DeleteCommand
	| PointUpCommand;

/**
 * The definition of each object block, by `op`.
 */
export const OBJECT_BLOCKS: { [K in ObjectCommand['op']]: CommandDefinition<Extract<ObjectCommand, { op: K }>> } = {
	create: createBlock,
	move: moveBlock,
	moveTo: moveToBlock,
	setColor: setColorBlock,
	show: showBlock,
	hide: hideBlock,
	delete: deleteBlock,
	pointUp: pointUpBlock,
};
