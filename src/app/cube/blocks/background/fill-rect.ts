/**
 * BLOCK: fillRect (background).
 *
 * Fills a rectangle on the background.
 */

import { fillRect } from '../../drawing/shapes';
import { FACE_BY_NAME, parseColor } from '../../program/names';
import { ColorValue, FaceName } from '../../program/program';
import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Fills a rectangle on the background.
 */
export interface FillRectCommand {
	op: 'fillRect';
	face: FaceName;
	x: number;
	y: number;
	width: number;
	height: number;
	color: ColorValue;
}

export const fillRectBlock: CommandDefinition<FillRectCommand> = {
	schema: {
		face: FIELD.face,
		x: FIELD.integer,
		y: FIELD.integer,
		width: FIELD.count,
		height: FIELD.count,
		color: FIELD.color,
	},

	apply (world, command) {
		fillRect(
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
