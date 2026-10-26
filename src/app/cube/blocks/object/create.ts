/**
 * BLOCK: create (object).
 *
 * Creates a new visible object. Without `pixels` it is a single pixel.
 */

import { FACE_BY_NAME, HEADING_BY_NAME, parseColor } from '../../program/names';
import { ColorValue, FaceName, HeadingName, ShapePixelDefinition } from '../../program/program';
import { SINGLE_PIXEL } from '../../world/cube-object';
import { CommandDefinition } from '../block-definition';
import { FIELD, optional } from '../fields';

/**
 * Creates an object. The name must be new. The heading defaults to north.
 *
 * `pixels` is the shape, around the center cell given by `face`, `x` and `y`. It defaults to
 * a single pixel on the center. For a plus sign:
 *   [ {dx: 0, dy: 0}, {dx: 0, dy: -1}, {dx: 1, dy: 0}, {dx: 0, dy: 1}, {dx: -1, dy: 0} ]
 */
export interface CreateCommand {
	op: 'create';
	name: string;
	face: FaceName;
	x: number;
	y: number;
	color: ColorValue;
	heading?: HeadingName;
	pixels?: ShapePixelDefinition[];
}

export const createBlock: CommandDefinition<CreateCommand> = {
	schema: {
		name: FIELD.text,
		face: FIELD.face,
		x: FIELD.integer,
		y: FIELD.integer,
		color: FIELD.color,
		heading: optional(FIELD.heading),
		pixels: optional(FIELD.shape),
	},

	apply (world, command) {
		world.add({
			name: command.name,
			shape: command.pixels?.map((pixel) => ({
				dx: pixel.dx,
				dy: pixel.dy,
				color: pixel.color === undefined ? undefined : parseColor(pixel.color),
			})) ?? SINGLE_PIXEL,
			pose: world.geometry.place({
				face: FACE_BY_NAME[command.face],
				x: command.x,
				y: command.y,
				heading: command.heading && HEADING_BY_NAME[command.heading],
			}),
			color: parseColor(command.color),
			visible: true,
		});
	},
};
