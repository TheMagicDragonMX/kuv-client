import { Color, CubeState, Face } from '../cube-state';

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
