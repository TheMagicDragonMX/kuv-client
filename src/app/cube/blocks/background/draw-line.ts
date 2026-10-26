/**
 * BLOCK: drawLine (background).
 *
 * Draws a straight line on the background.
 */

import { drawLine } from '../../drawing/shapes';
import { FACE_BY_NAME, parseColor } from '../../program/names';
import { ColorValue, FaceName } from '../../program/program';
import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Draws a straight line on the background.
 */
export interface DrawLineCommand {
	op: 'drawLine';
	face: FaceName;
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	color: ColorValue;
}

export const drawLineBlock: CommandDefinition<DrawLineCommand> = {
	schema: {
		face: FIELD.face,
		x0: FIELD.integer,
		y0: FIELD.integer,
		x1: FIELD.integer,
		y1: FIELD.integer,
		color: FIELD.color,
	},

	apply (world, command) {
		drawLine(
			world.background,
			FACE_BY_NAME[command.face],
			command.x0,
			command.y0,
			command.x1,
			command.y1,
			parseColor(command.color),
		);
	},
};
