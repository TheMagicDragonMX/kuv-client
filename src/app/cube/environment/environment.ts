/**
 * LAYER: environment.
 *
 * What surrounds the objects of the sandbox and is not part of any program: for now, the
 * images the user puts on the faces. A program is the code of the user; the environment is the
 * stage it runs on. That is why it is passed to the engine next to the program, not inside it,
 * and why it is still there when the program stops or is run again.
 *
 *   environment --painted onto--> World.background <--read by-- renderer
 *
 * It goes through the background layer. The background blocks of a program (change background
 * image, change background color) write to the same layer while it runs, so they can replace
 * the pictures; the environment is where the cube starts, and a reset brings it back. Objects
 * always draw over the layer and never change it.
 *
 * To get the pixels of a face from a picture, see `pixelate.ts`.
 */

import { drawBitmap } from '../drawing/bitmap';
import { EngineError } from '../errors';
import { FACE_BY_NAME } from '../program/names';
import { FaceName } from '../program/program';
import { Color, FACE_RESOLUTION } from '../state/cube-state';
import { World } from '../world/world';

/**
 * The picture of each face that has one: `FACE_RESOLUTION * FACE_RESOLUTION` colors, row after
 * row. A face that is not in it keeps the plain background.
 */
export type BackgroundImages = Partial<Record<FaceName, ArrayLike<Color>>>;

/**
 * The settings of the stage.
 */
export interface Environment {
	background?: BackgroundImages;
}

/**
 * Pixels on one face.
 */
const FACE_PIXELS = FACE_RESOLUTION * FACE_RESOLUTION;

/**
 * Paints the environment onto the background of a world.
 *
 * With `previous` (the environment that was there before) a face that had a picture and no
 * longer does is blanked, so removing a picture takes it off the cube. Throws an EngineError,
 * before painting anything, if a picture does not have the size of a face.
 */
export function paintEnvironment (world: World, environment?: Environment, previous?: Environment): void {
	const images = Object.entries(environment?.background ?? {}) as [ FaceName, ArrayLike<Color> ][];

	for (const [ name, pixels ] of images)
		if (pixels.length !== FACE_PIXELS)
			throw new EngineError(`The picture of ${name} must have ${FACE_PIXELS} pixels, not ${pixels.length}`);

	for (const name of Object.keys(previous?.background ?? {}) as FaceName[])
		if (!environment?.background?.[name])
			paint(world, name, new Uint32Array(FACE_PIXELS));

	for (const [ name, pixels ] of images)
		paint(world, name, pixels);
}

/**
 * Copies the picture of one face onto the background.
 */
function paint (world: World, name: FaceName, pixels: ArrayLike<Color>): void {
	drawBitmap(world.background, FACE_BY_NAME[name], 0, 0, FACE_RESOLUTION, FACE_RESOLUTION, pixels);
}
