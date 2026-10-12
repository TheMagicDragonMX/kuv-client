/**
 * LAYER: commands (dispatch).
 *
 * The single entry point for "do this block now". It looks at the `op` of a command and calls
 * the function that performs it. It contains no logic of its own.
 *
 *   interpreter --applyCommand--> object-commands.ts / background-commands.ts --> World
 *
 * Control blocks (wait, repeat, forever) are not commands: they decide *when* other blocks
 * run, which is the interpreter's job.
 */

import { EngineError } from '../errors';
import { Block, Command } from '../program/program';
import { World } from '../world/world';
import {
	clearBackground,
	paintBitmap,
	paintCircle,
	paintFilledCircle,
	paintFilledRect,
	paintLine,
	paintPixel,
	paintRect,
} from './background-commands';
import { create, hide, move, moveTo, pointUp, remove, setColor, show } from './object-commands';

/**
 * Tells whether a block is a command (takes effect at once) and not a control block.
 */
export function isCommand (block: Block): block is Command {
	return 'wait' !== block.op && 'repeat' !== block.op && 'forever' !== block.op;
}

/**
 * Performs one command on the world.
 */
export function applyCommand (world: World, command: Command): void {
	switch (command.op) {
		case 'create':
			return create(world, command);
		case 'move':
			return move(world, command);
		case 'moveTo':
			return moveTo(world, command);
		case 'setColor':
			return setColor(world, command);
		case 'show':
			return show(world, command);
		case 'hide':
			return hide(world, command);
		case 'delete':
			return remove(world, command);
		case 'pointUp':
			return pointUp(world, command);
		case 'clearBackground':
			return clearBackground(world, command);
		case 'setPixel':
			return paintPixel(world, command);
		case 'drawLine':
			return paintLine(world, command);
		case 'drawRect':
			return paintRect(world, command);
		case 'fillRect':
			return paintFilledRect(world, command);
		case 'drawCircle':
			return paintCircle(world, command);
		case 'fillCircle':
			return paintFilledCircle(world, command);
		case 'drawBitmap':
			return paintBitmap(world, command);
		default: {

			// Fails to compile if a command type exists that is not handled above.
			const unhandled: never = command;
			throw new EngineError(`Unknown command ${JSON.stringify(unhandled)}`);
		}
	}
}
