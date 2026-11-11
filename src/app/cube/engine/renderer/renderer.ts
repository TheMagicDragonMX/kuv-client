/**
 * LAYER: renderer.
 *
 * Turns the world into pixels. This is the only place where "an object at this pose" becomes
 * "this pixel has this color".
 *
 *   World --read by--> Renderer --writes--> CubeState (output)
 *
 * Each frame is built the same way:
 *
 *   1. start from the background layer (one bulk copy)
 *   2. find the faces that have an object on them, and dim the background of those faces
 *   3. draw every visible object on top, in the order they were created, pixel by pixel, at the
 *      intensity of the objects
 *
 * A face with objects shows its background softer than a face without, so the objects can be told
 * apart from the picture behind them. Everything starts at full intensity (nothing is dimmed)
 * until `setBrightness` is called.
 *
 * Nothing is erased pixel by pixel: because every frame starts from the background, an object
 * that moved simply is not drawn where it used to be.
 *
 * The renderer remembers the world version it last drew and does nothing if it has not
 * changed, so a cube with nothing moving costs nothing per tick.
 */

import { CubeState, FACE_COUNT, Face, scaleColor } from '../state/cube-state';
import { World } from '../world/world';

/**
 * How intense the LEDs shine, as a share of their color: 1 is the color as it is, 0 is off.
 */
export type Brightness = {
	/**
	 * Intensity of the background on a face that has no objects.
	 */
	background: number;

	/**
	 * Intensity of the background on a face that has objects on it.
	 */
	behindObjects: number;

	/**
	 * Intensity of the objects.
	 */
	objects: number;
};

/**
 * Nothing dimmed: what the renderer uses until it is told otherwise.
 */
export const FULL_BRIGHTNESS: Brightness = { background: 1, behindObjects: 1, objects: 1 };

/**
 * What the editor starts with: the background at full intensity until objects are on a face, then
 * softer (40%), so the edge between them is easy to see.
 */
export const DEFAULT_BRIGHTNESS: Brightness = { background: 1, behindObjects: 0.4, objects: 1 };

/**
 * Keeps an intensity between 0 and 1. A missing one is full.
 */
function level (value: number | undefined): number {
	return undefined === value ? 1 : Math.min(1, Math.max(0, value));
}

/**
 * Draws the world onto the cube state, only when the world changed since the last draw.
 */
export class Renderer {
	/**
	 * World version the output currently shows. -1 means nothing has been drawn yet.
	 */
	private renderedVersion = -1;

	/**
	 * Intensity of the background and of the objects.
	 */
	private brightness = FULL_BRIGHTNESS;

	/**
	 * @param world What to draw.
	 * @param output Where to draw it. A 3D view or the Pi reads this.
	 */
	constructor (
		private readonly world: World,
		readonly output: CubeState,
	) {}

	/**
	 * Changes the intensities (a missing one is full). The next
	 * `render` draws everything again with it.
	 */
	setBrightness (brightness: Partial<Brightness> | undefined): void {
		this.brightness = {
			background: level(brightness?.background),
			behindObjects: level(brightness?.behindObjects),
			objects: level(brightness?.objects),
		};
		this.renderedVersion = -1;
	}

	/**
	 * Redraws the output if the world changed since the last call.
	 * @returns Whether anything was drawn.
	 */
	render (): boolean {
		if (this.renderedVersion === this.world.version)
			return false;

		this.output.copyFrom(this.world.background);

		/**
		 * Where every pixel of the visible objects lands, in drawing order, and which faces they
		 * land on. The geometry finds each pixel across edges too; pixels below the last visible
		 * row have no cell, so they are simply not drawn.
		 */
		const drawn: { face: Face; x: number; y: number; color: number }[] = [];
		const covered = new Set<Face>();

		for (const object of this.world.all()) {
			if (!object.visible)
				continue;

			for (const part of object.shape) {
				const pixel = this.world.geometry.pixelAt(object.pose, part.dx, part.dy);

				if (pixel) {
					drawn.push({ face: pixel.face, x: pixel.x, y: pixel.y, color: scaleColor(part.color ?? object.color, this.brightness.objects) });
					covered.add(pixel.face);
				}
			}
		}

		for (let face = 0; face < FACE_COUNT; face += 1)
			this.output.dimFace(face, covered.has(face) ? this.brightness.behindObjects : this.brightness.background);

		for (const pixel of drawn)
			this.output.set(pixel.face, pixel.x, pixel.y, pixel.color);

		this.renderedVersion = this.world.version;
		return true;
	}
}
