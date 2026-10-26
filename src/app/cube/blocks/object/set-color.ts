/**
 * BLOCK: setColor (object).
 *
 * Changes the color of an object. Nothing is touched if it already has that color.
 */

import { parseColor } from '../../program/names';
import { ColorValue } from '../../program/program';
import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Changes the color of an object.
 */
export interface SetColorCommand {
	op: 'setColor';
	target: string;
	color: ColorValue;
}

export const setColorBlock: CommandDefinition<SetColorCommand> = {
	schema: {
		target: FIELD.text,
		color: FIELD.color,
	},

	apply (world, command) {
		const color = parseColor(command.color);

		if (world.get(command.target).color !== color)
			world.update(command.target, { color });
	},
};
