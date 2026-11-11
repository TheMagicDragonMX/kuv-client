/**
 * BLOCK: hide (object).
 *
 * Hides an object without removing it. Nothing is touched if it already is hidden.
 */

import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Hides an object without removing it.
 */
export type HideCommand = {
	/**
	 * Identifies the command.
	 */
	op: 'hide';

	/**
	 * Name of the object to hide.
	 */
	target: string;
};

/**
 * The shape of the command, its fields, and how it hides the object.
 */
export const hideBlock: CommandDefinition<HideCommand> = {
	schema: {
		target: FIELD.text,
	},

	/**
	 * Marks the object as not visible.
	 */
	apply (world, command) {
		if (world.get(command.target).visible)
			world.update(command.target, { visible: false });
	},
};
