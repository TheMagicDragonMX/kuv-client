/**
 * BLOCK: drawRect (background).
 *
 * Draws the outline of a rectangle on the background.
 */

import { drawRect } from '../../drawing/shapes';
import { FACE_BY_NAME, parseColor } from '../../program/names';
import { ColorValue, FaceName } from '../../program/program';
import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Draws the outline of a rectangle on the background.
 */
export interface DrawRectCommand {
	op: 'drawRect';
	face: FaceName;
	x: number;
	y: number;
	width: number;
	height: number;
	color: ColorValue;
}

export const drawRectBlock: CommandDefinition<DrawRectCommand> = {
	schema: {
		face: FIELD.face,
		x: FIELD.integer,
		y: FIELD.integer,
		width: FIELD.count,
		height: FIELD.count,
		color: FIELD.color,
	},

	apply (world, command) {
		drawRect(
			world.background,
			FACE_BY_NAME[command.face],
			command.x,
			command.y,
			command.width,
			command.height,
			parseColor(command.color),
		);
	},
};
