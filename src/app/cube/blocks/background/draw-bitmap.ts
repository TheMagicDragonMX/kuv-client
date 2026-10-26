/**
 * BLOCK: drawBitmap (background).
 *
 * Copies a picture onto the background.
 */

import { drawBitmap } from '../../drawing/bitmap';
import { FACE_BY_NAME, parseColor } from '../../program/names';
import { ColorValue, FaceName } from '../../program/program';
import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Copies a picture onto the background. `pixels` has width * height colors, row after row.
 */
export interface DrawBitmapCommand {
	op: 'drawBitmap';
	face: FaceName;
	x: number;
	y: number;
	width: number;
	height: number;
	pixels: ColorValue[];
}

export const drawBitmapBlock: CommandDefinition<DrawBitmapCommand> = {
	schema: {
		face: FIELD.face,
		x: FIELD.integer,
		y: FIELD.integer,
		width: FIELD.count,
		height: FIELD.count,
		pixels: FIELD.colors,
	},

	validate (block) {
		if (block.pixels.length !== block.width * block.height)
			return { field: 'pixels', message: 'must have width * height colors' };

		return undefined;
	},

	apply (world, command) {
		drawBitmap(
			world.background,
			FACE_BY_NAME[command.face],
			command.x,
			command.y,
			command.width,
			command.height,
			command.pixels.map(parseColor),
		);
	},
};
