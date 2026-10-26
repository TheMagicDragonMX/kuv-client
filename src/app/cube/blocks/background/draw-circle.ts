/**
 * BLOCK: drawCircle (background).
 *
 * Draws the outline of a circle on the background.
 */

import { drawCircle } from '../../drawing/shapes';
import { FACE_BY_NAME, parseColor } from '../../program/names';
import { ColorValue, FaceName } from '../../program/program';
import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Draws the outline of a circle on the background.
 */
export interface DrawCircleCommand {
	op: 'drawCircle';
	face: FaceName;
	cx: number;
	cy: number;
	radius: number;
	color: ColorValue;
}

export const drawCircleBlock: CommandDefinition<DrawCircleCommand> = {
	schema: {
		face: FIELD.face,
		cx: FIELD.integer,
		cy: FIELD.integer,
		radius: FIELD.count,
		color: FIELD.color,
	},

	apply (world, command) {
		drawCircle(
			world.background,
			FACE_BY_NAME[command.face],
			command.cx,
			command.cy,
			command.radius,
			parseColor(command.color),
		);
	},
};
