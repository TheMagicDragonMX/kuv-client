/**
 * BLOCK: setBackgroundColor (background).
 *
 * Paints some faces of the background one color, replacing any picture there. Black turns the
 * LEDs behind the objects off.
 */

import { fillRect } from '../../drawing/shapes';
import { FACE_BY_NAME, parseColor } from '../../program/names';
import { ColorValue, FaceName } from '../../program/program';
import { FACE_RESOLUTION } from '../../state/cube-state';
import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Paints the background of each face in `faces` one color.
 */
export type SetBackgroundColorCommand = {
	/**
	 * Identifies the command.
	 */
	op: 'setBackgroundColor';

	/**
	 * The faces to paint.
	 */
	faces: FaceName[];

	/**
	 * The color to fill them with.
	 */
	color: ColorValue;
};

/**
 * The shape of the command, its fields, and how it fills the faces.
 */
export const setBackgroundColorBlock: CommandDefinition<SetBackgroundColorCommand> = {
	schema: {
		faces: FIELD.faces,
		color: FIELD.color,
	},

	/**
	 * Fills the background of each face with the color.
	 */
	apply (world, command) {
		const color = parseColor(command.color);

		for (const name of command.faces)
			fillRect(world.background, FACE_BY_NAME[name], 0, 0, FACE_RESOLUTION, FACE_RESOLUTION, color);
	},
};
