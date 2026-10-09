import { Color, CubeState, Face } from '../cube-state';

/**
 * Sets the whole cube to one color.
 */
export function clear (state: CubeState, color: Color = 0x000000): void {
	state.fill(color);
}

/**
 * Changes one pixel of a face.
 */
export function setPixel (state: CubeState, face: Face, x: number, y: number, color: Color): void {
	state.set(face, x, y, color);
}

/**
 * Returns the current color of a pixel of a face.
 */
export function getPixel (state: CubeState, face: Face, x: number, y: number): Color {
	return state.get(face, x, y);
}
