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
export interface HideCommand {
	op: 'hide';
	target: string;
}

export const hideBlock: CommandDefinition<HideCommand> = {
	schema: {
		target: FIELD.text,
	},

	apply (world, command) {
		if (world.get(command.target).visible)
			world.update(command.target, { visible: false });
	},
};
