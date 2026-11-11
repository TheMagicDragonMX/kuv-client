/**
 * BLOCK: create (object).
 *
 * Creates a new visible object. Without `pixels` it is a single pixel. With `costumes` it can
 * switch looks later (see `set-costume.ts`); it starts with its own color and pixels, which are
 * those of the first costume.
 */

import { FACE_BY_NAME, HEADING_BY_NAME, parseColor } from '../../program/names';
import { ColorValue, CostumeDefinition, FaceName, HeadingName, ShapePixelDefinition } from '../../program/program';
import { SINGLE_PIXEL, ShapePixel } from '../../world/cube-object';
import { CommandDefinition } from '../block-definition';
import { FIELD, optional } from '../fields';

/**
 * Creates an object. The name must be new. The heading defaults to north.
 *
 * `pixels` is the shape, around the center cell given by `face`, `x` and `y`. It defaults to
 * a single pixel on the center. For a plus sign:
 *   [ {dx: 0, dy: 0}, {dx: 0, dy: -1}, {dx: 1, dy: 0}, {dx: 0, dy: 1}, {dx: -1, dy: 0} ]
 */
export type CreateCommand = {
	/**
	 * Identifies the command.
	 */
	op: 'create';

	/**
	 * Name of the new object. It must not be taken.
	 */
	name: string;

	/**
	 * The face the object starts on.
	 */
	face: FaceName;

	/**
	 * Column of the object's center cell.
	 */
	x: number;

	/**
	 * Row of the object's center cell.
	 */
	y: number;

	/**
	 * The object's color.
	 */
	color: ColorValue;

	/**
	 * Where the object faces. Defaults to north.
	 */
	heading?: HeadingName;

	/**
	 * The cells of the shape around its center. Defaults to a single pixel.
	 */
	pixels?: ShapePixelDefinition[];

	/**
	 * The looks the object can switch between. The first one is how it starts, so `color` and
	 * `pixels` are the ones of the first costume.
	 */
	costumes?: CostumeDefinition[];
};

/**
 * The shape an object is drawn with, from the pixels of a block. Without pixels it is a single
 * pixel.
 */
export function shapeOf (pixels: ShapePixelDefinition[] | undefined): readonly ShapePixel[] {
	return pixels?.map((pixel) => ({
		dx: pixel.dx,
		dy: pixel.dy,
		color: pixel.color === undefined ? undefined : parseColor(pixel.color),
	})) ?? SINGLE_PIXEL;
}

/**
 * The shape of the command, its fields, and how it adds the object to the world.
 */
export const createBlock: CommandDefinition<CreateCommand> = {
	schema: {
		name: FIELD.text,
		face: FIELD.face,
		x: FIELD.integer,
		y: FIELD.integer,
		color: FIELD.color,
		heading: optional(FIELD.heading),
		pixels: optional(FIELD.shape),
		costumes: optional(FIELD.costumes),
	},

	/**
	 * Adds a visible object, with the shape, pose and color of the command, and its costumes.
	 */
	apply (world, command) {
		const costumes = command.costumes?.map((costume) => ({ name: costume.name, color: parseColor(costume.color), shape: shapeOf(costume.pixels) }));

		world.add({
			name: command.name,
			shape: shapeOf(command.pixels),
			pose: world.geometry.place({
				face: FACE_BY_NAME[command.face],
				x: command.x,
				y: command.y,
				heading: command.heading && HEADING_BY_NAME[command.heading],
			}),
			color: parseColor(command.color),
			visible: true,
			...costumes ? { costumes, costume: costumes[0].name } : {},
		});
	},
};
