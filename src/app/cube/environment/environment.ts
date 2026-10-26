/**
 * LAYER: environment.
 *
 * What surrounds the objects of the sandbox and is not part of any program: for now, the
 * pictures and videos the user puts on the faces. A program is the code of the user; the
 * environment is the stage it runs on. That is why it is passed to the engine next to the
 * program, not inside it, and why it is still there when the program stops or is run again.
 *
 *   environment --painted onto--> World.background <--read by-- renderer
 *
 * It goes through the background layer, so a script can paint over it (with `clearBackground`,
 * for example) like over anything else on the background. A face with a video is the exception
 * in practice: the video paints its frame again every time it changes, so what a script drew
 * there lasts only until the next frame.
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
 * A video already cut into pictures: `frames` are shown one after the other, `fps` per second,
 * and it starts over when it ends. Each frame has the pixels of a face, like a still picture.
 * (The Raspberry Pi cannot decode video at that size, so this is also what it would be sent.)
 */
export interface Animation {
	frames: ArrayLike<ArrayLike<Color>>;
	fps: number;
}

/**
 * What a face shows: a picture (`FACE_RESOLUTION * FACE_RESOLUTION` colors, row after row) or
 * an animation.
 */
export type FaceBackground = ArrayLike<Color> | Animation;

/**
 * The picture or video of each face that has one. A face that is not in it keeps the plain
 * background.
 */
export type BackgroundImages = Partial<Record<FaceName, FaceBackground>>;

/**
 * The settings of the stage.
 */
export interface Environment {
	background?: BackgroundImages;
}

/**
 * Tells whether what a face shows is an animation and not a still picture.
 */
export function isAnimation (background: FaceBackground): background is Animation {
	return 'frames' in background;
}

/**
 * Pixels on one face.
 */
const FACE_PIXELS = FACE_RESOLUTION * FACE_RESOLUTION;

const BLANK = new Uint32Array(FACE_PIXELS);

/**
 * Keeps the environment painted on the background of a world, and plays the videos.
 *
 * It never reads a clock: whoever uses it says what time it is. It remembers which picture
 * each face shows so that nothing is painted twice, which keeps the world's version still (and
 * the cube unredrawn) while a video holds the same frame.
 */
export class EnvironmentPainter {
	private environment?: Environment;

	/**
	 * Time, in milliseconds, at which the videos started (frame 0).
	 */
	private origin = 0;

	/**
	 * Index of the frame each face shows in the world it was last painted on (0 for a picture).
	 */
	private readonly shown = new Map<FaceName, number>();

	/**
	 * True when something on the cube moves by itself, so `update` has to be called as time passes.
	 */
	get animated (): boolean {
		return Object.values(this.environment?.background ?? {}).some((face) => isAnimation(face) && 1 < face.frames.length);
	}

	/**
	 * Changes the environment and paints it. A face that had a picture and no longer does is
	 * blanked. Videos start from their first frame at `now`. Throws an EngineError, before
	 * painting anything, if a picture or frame is not the size of a face.
	 */
	set (world: World, environment: Environment | undefined, now: number): void {
		check(environment);

		for (const name of Object.keys(this.environment?.background ?? {}) as FaceName[])
			if (!environment?.background?.[name])
				paint(world, name, BLANK);

		this.environment = environment;
		this.origin = now;
		this.shown.clear();
		this.update(world, now);
	}

	/**
	 * Paints everything on a new world (the old one is gone, and with it the pictures). Videos
	 * keep playing from where they were.
	 */
	attach (world: World, now: number): void {
		this.shown.clear();
		this.update(world, now);
	}

	/**
	 * Paints what is due at `now`: the first picture of each face, and the frame of each video
	 * that changed since the last call.
	 */
	update (world: World, now: number): void {
		const faces = Object.entries(this.environment?.background ?? {}) as [ FaceName, FaceBackground ][];

		for (const [ name, face ] of faces) {
			const index = isAnimation(face) ? frameAt(face, now - this.origin) : 0;

			if (this.shown.get(name) === index)
				continue;

			paint(world, name, isAnimation(face) ? face.frames[index] : face);
			this.shown.set(name, index);
		}
	}
}

/**
 * Which frame an animation shows after some milliseconds.
 */
function frameAt (animation: Animation, elapsed: number): number {
	return Math.floor(Math.max(0, elapsed) / 1000 * animation.fps) % animation.frames.length;
}

/**
 * Throws if any picture of the environment is not the size of a face.
 */
function check (environment?: Environment): void {
	for (const [ name, face ] of Object.entries(environment?.background ?? {}) as [ FaceName, FaceBackground ][]) {
		if (!isAnimation(face)) {
			checkPixels(name, face);
			continue;
		}

		if (0 === face.frames.length || !Number.isFinite(face.fps) || !(0 < face.fps))
			throw new EngineError(`The video of ${name} needs at least one frame and a speed above zero`);

		for (let index = 0; index < face.frames.length; index += 1)
			checkPixels(name, face.frames[index]);
	}
}

function checkPixels (name: FaceName, pixels: ArrayLike<Color>): void {
	if (pixels.length !== FACE_PIXELS)
		throw new EngineError(`The picture of ${name} must have ${FACE_PIXELS} pixels, not ${pixels.length}`);
}

/**
 * Copies the pixels of one face onto the background.
 */
function paint (world: World, name: FaceName, pixels: ArrayLike<Color>): void {
	drawBitmap(world.background, FACE_BY_NAME[name], 0, 0, FACE_RESOLUTION, FACE_RESOLUTION, pixels);
}
