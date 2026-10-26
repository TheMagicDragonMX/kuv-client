/**
 * BLOCK: fillCircle (background).
 *
 * Fills a circle on the background.
 */

import { fillCircle } from '../../drawing/shapes';
import { FACE_BY_NAME, parseColor } from '../../program/names';
import { ColorValue, FaceName } from '../../program/program';
import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Fills a circle on the background.
 */
export interface FillCircleCommand {
	op: 'fillCircle';
	face: FaceName;
	cx: number;
	cy: number;
	radius: number;
	color: ColorValue;
}

export const fillCircleBlock: CommandDefinition<FillCircleCommand> = {
	schema: {
		face: FIELD.face,
		cx: FIELD.integer,
		cy: FIELD.integer,
		radius: FIELD.count,
		color: FIELD.color,
	},

	apply (world, command) {
		fillCircle(
			world.background,
			FACE_BY_NAME[command.face],
			command.cx,
			command.cy,
			command.radius,
			parseColor(command.color),
		);
	},
};
