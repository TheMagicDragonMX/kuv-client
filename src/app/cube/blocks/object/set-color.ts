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
export type SetColorCommand = {
	/**
	 * Identifies the command.
	 */
	op: 'setColor';

	/**
	 * Name of the object to paint.
	 */
	target: string;

	/**
	 * The new color.
	 */
	color: ColorValue;
};

/**
 * The shape of the command, its fields, and how it recolors the object.
 */
export const setColorBlock: CommandDefinition<SetColorCommand> = {
	schema: {
		target: FIELD.text,
		color: FIELD.color,
	},

	/**
	 * Changes the object's color.
	 */
	apply (world, command) {
		const color = parseColor(command.color);

		if (world.get(command.target).color !== color)
			world.update(command.target, { color });
	},
};
