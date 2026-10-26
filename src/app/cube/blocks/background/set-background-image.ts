/**
 * BLOCK: setBackgroundImage (background).
 *
 * Puts a picture on some faces, replacing what they show behind the objects. The picture
 * travels inside the block, already shrunk to the pixels of a face (see
 * `environment/pixelate.ts`), so the program is all the Raspberry Pi needs.
 */

import { drawBitmap } from '../../drawing/bitmap';
import { FACE_BY_NAME, parseColor } from '../../program/names';
import { ColorValue, FaceName } from '../../program/program';
import { FACE_RESOLUTION } from '../../state/cube-state';
import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Puts a picture on the background of each face in `faces`. `pixels` has
 * `FACE_RESOLUTION * FACE_RESOLUTION` colors, row after row.
 */
export interface SetBackgroundImageCommand {
	op: 'setBackgroundImage';
	faces: FaceName[];
	pixels: ColorValue[];
}

export const setBackgroundImageBlock: CommandDefinition<SetBackgroundImageCommand> = {
	schema: {
		faces: FIELD.faces,
		pixels: FIELD.image,
	},

	apply (world, command) {
		const pixels = command.pixels.map(parseColor);

		for (const name of command.faces)
			drawBitmap(world.background, FACE_BY_NAME[name], 0, 0, FACE_RESOLUTION, FACE_RESOLUTION, pixels);
	},
};
