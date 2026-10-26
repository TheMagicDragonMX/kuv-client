/**
 * BLOCK: delete (object).
 *
 * Removes an object. (`delete` is a reserved word, so the definition is called `deleteBlock`.)
 */

import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Removes an object.
 */
export interface DeleteCommand {
	op: 'delete';
	target: string;
}

export const deleteBlock: CommandDefinition<DeleteCommand> = {
	schema: {
		target: FIELD.text,
	},

	apply (world, command) {
		world.remove(command.target);
	},
};
