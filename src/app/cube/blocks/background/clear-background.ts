/**
 * BLOCK: clearBackground (background).
 *
 * Paints the whole background one color (black by default).
 */

import { clear } from '../../drawing/pixel';
import { parseColor } from '../../program/names';
import { ColorValue } from '../../program/program';
import { CommandDefinition } from '../block-definition';
import { FIELD, optional } from '../fields';

/**
 * Paints the whole background one color (black by default). Objects are not affected.
 */
export interface ClearBackgroundCommand {
	op: 'clearBackground';
	color?: ColorValue;
}

export const clearBackgroundBlock: CommandDefinition<ClearBackgroundCommand> = {
	schema: {
		color: optional(FIELD.color),
	},

	apply (world, command) {
		clear(world.background, command.color === undefined ? 0 : parseColor(command.color));
	},
};
