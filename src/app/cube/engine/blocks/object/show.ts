/**
 * BLOCK: show (object).
 *
 * Makes an object visible. Nothing is touched if it already is.
 */

import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Makes an object visible.
 */
export type ShowCommand = {
	/**
	 * Identifies the command.
	 */
	op: 'show';

	/**
	 * Name of the object to show.
	 */
	target: string;
};

/**
 * The shape of the command, its fields, and how it shows the object.
 */
export const showBlock: CommandDefinition<ShowCommand> = {
	schema: {
		target: FIELD.text,
	},

	/**
	 * Marks the object as visible.
	 */
	apply (world, command) {
		if (!world.get(command.target).visible)
			world.update(command.target, { visible: true });
	},
};
