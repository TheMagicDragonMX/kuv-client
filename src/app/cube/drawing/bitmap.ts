/**
 * LAYER: drawing primitives.
 *
 * Copies a small picture (a list of colors) onto a face.
 *
 * These write straight into a CubeState face. They do not know about objects or programs:
 * the renderer uses them to draw objects, and the "advanced" program blocks use them to
 * paint the background layer.
 */

import { Color, CubeState, Face } from '../state/cube-state';

/**
 * Copies a bitmap onto a face with its top-left corner at (x, y).
 * `pixels` holds width * height colors, row after row.
 */
export function drawBitmap (
	state: CubeState,
	face: Face,
	x: number,
	y: number,
	width: number,
	height: number,
	pixels: ArrayLike<Color>,
): void {
	for (let row = 0; row < height; row += 1) {
		for (let col = 0; col < width; col += 1) {
			state.set(face, x + col, y + row, pixels[row * width + col]);
		}
	}
}
