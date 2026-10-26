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
export interface ShowCommand {
	op: 'show';
	target: string;
}

export const showBlock: CommandDefinition<ShowCommand> = {
	schema: {
		target: FIELD.text,
	},

	apply (world, command) {
		if (!world.get(command.target).visible)
			world.update(command.target, { visible: true });
	},
};
