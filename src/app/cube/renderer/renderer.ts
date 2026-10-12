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
 *   2. draw every visible object on top, in the order they were created, pixel by pixel
 *
 * Nothing is erased pixel by pixel: because every frame starts from the background, an object
 * that moved simply is not drawn where it used to be.
 *
 * The renderer remembers the world version it last drew and does nothing if it has not
 * changed, so a cube with nothing moving costs nothing per tick.
 */

import { CubeState } from '../state/cube-state';
import { World } from '../world/world';

export class Renderer {
	/**
	 * World version the output currently shows. -1 means nothing has been drawn yet.
	 */
	private renderedVersion = -1;

	/**
	 * @param world What to draw.
	 * @param output Where to draw it. A 3D view or the Pi reads this.
	 */
	constructor (
		private readonly world: World,
		readonly output: CubeState,
	) {}

	/**
	 * Redraws the output if the world changed since the last call.
	 * @returns Whether anything was drawn.
	 */
	render (): boolean {
		if (this.renderedVersion === this.world.version)
			return false;

		this.output.copyFrom(this.world.background);

		for (const object of this.world.all()) {
			if (!object.visible)
				continue;

			for (const part of object.shape) {
				// The geometry finds where each pixel of the shape lands, across edges too. Pixels
				// below the last visible row have no cell, so they are simply not drawn.
				const pixel = this.world.geometry.pixelAt(object.pose, part.dx, part.dy);
				if (pixel)
					this.output.set(pixel.face, pixel.x, pixel.y, part.color ?? object.color);
			}
		}

		this.renderedVersion = this.world.version;
		return true;
	}
}
