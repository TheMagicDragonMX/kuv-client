/**
 * LAYER: commands (dispatch).
 *
 * The single entry point for "do this block now". It looks up the definition of the command in
 * the blocks registry and runs its `apply`. It contains no logic of its own, and it does not
 * change when a block is added: what each block does lives in its own file in `blocks/`.
 *
 *   interpreter --applyCommand--> blocks/<category>/<block>.ts --> World
 *
 * Control blocks (wait, repeat, forever) are not commands: they decide *when* other blocks
 * run, which is the interpreter's job.
 */

import { Block, COMMAND_BLOCKS, Command, CommandDefinition } from '../blocks';
import { EngineError } from '../errors';
import { World } from '../world/world';

/**
 * Tells whether a block is a command (takes effect at once) and not a control block.
 */
export function isCommand (block: Block): block is Command {
	return Object.hasOwn(COMMAND_BLOCKS, block.op);
}

/**
 * Performs one command on the world.
 */
export function applyCommand (world: World, command: Command): void {
	const definition = COMMAND_BLOCKS[command.op] as CommandDefinition<Command> | undefined;

	if (definition === undefined)
		throw new EngineError(`Unknown command ${JSON.stringify(command)}`);

	definition.apply(world, command);
}
