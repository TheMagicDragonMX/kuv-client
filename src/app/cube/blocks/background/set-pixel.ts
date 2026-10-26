/**
 * BLOCK: setPixel (background).
 *
 * Paints one pixel of the background.
 */

import { setPixel } from '../../drawing/pixel';
import { FACE_BY_NAME, parseColor } from '../../program/names';
import { ColorValue, FaceName } from '../../program/program';
import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Paints one pixel of the background.
 */
export interface SetPixelCommand {
	op: 'setPixel';
	face: FaceName;
	x: number;
	y: number;
	color: ColorValue;
}

export const setPixelBlock: CommandDefinition<SetPixelCommand> = {
	schema: {
		face: FIELD.face,
		x: FIELD.integer,
		y: FIELD.integer,
		color: FIELD.color,
	},

	apply (world, command) {
		setPixel(world.background, FACE_BY_NAME[command.face], command.x, command.y, parseColor(command.color));
	},
};
