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
export type DeleteCommand = {
	/**
	 * Identifies the command.
	 */
	op: 'delete';

	/**
	 * Name of the object to delete.
	 */
	target: string;
};

/**
 * The shape of the command, its fields, and how it removes the object from the world.
 */
export const deleteBlock: CommandDefinition<DeleteCommand> = {
	schema: {
		target: FIELD.text,
	},

	/**
	 * Removes the object from the world.
	 */
	apply (world, command) {
		world.remove(command.target);
	},
};
