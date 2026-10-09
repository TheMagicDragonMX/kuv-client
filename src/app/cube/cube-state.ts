/**
 * Faces of the cube. The numeric values are the order in which the renderer
 * builds its faces, so they double as indexes into the pixel buffer.
 */
export enum Face {
	FRONT = 0,
	RIGHT = 1,
	LEFT = 2,
	BACK = 3,
	TOP = 4,
}

/**
 * Number of faces in the cube.
 */
export const FACE_COUNT = 5;

/**
 * Pixels per side on every face.
 */
export const FACE_RESOLUTION = 64;

/**
 * A color packed as 0xRRGGBB. Black (0x000000) means the LED is off.
 */
export type Color = number;

/**
 * Hardware-independent pixel buffer of the cube: one 64x64 surface per face.
 * Commands write into it and renderers (browser, Raspberry Pi) read from it.
 * It knows nothing about three.js, panels or GPIO.
 *
 * Coordinates are per face: x grows to the right and y grows downward as seen
 * from outside the cube, with (0, 0) at the top-left corner.
 */
export class CubeState {
	/**
	 * Pixel colors of all faces, stored face after face and row after row.
	 */
	private pixels = new Uint32Array(FACE_COUNT * FACE_RESOLUTION * FACE_RESOLUTION);

	/**
	 * Increases on every write so renderers can tell cheaply whether they need to redraw.
	 */
	version = 0;

	/**
	 * Tells whether a face/x/y triple points at a real pixel.
	 */
	inBounds (face: Face, x: number, y: number): boolean {
		return Number.isInteger(x) && Number.isInteger(y)
			&& face >= 0 && face < FACE_COUNT
			&& x >= 0 && x < FACE_RESOLUTION
			&& y >= 0 && y < FACE_RESOLUTION;
	}

	/**
	 * Sets one pixel. Writes outside the face are ignored, so shapes can safely overflow.
	 */
	set (face: Face, x: number, y: number, color: Color): void {
		if (!this.inBounds(face, x, y)) {
			return;
		}

		this.pixels[this.indexOf(face, x, y)] = color;
		this.version += 1;
	}

	/**
	 * Returns the color of one pixel, or black if the coordinates are outside the face.
	 */
	get (face: Face, x: number, y: number): Color {
		if (!this.inBounds(face, x, y)) {
			return 0;
		}

		return this.pixels[this.indexOf(face, x, y)];
	}

	/**
	 * Sets every pixel of every face to one color.
	 */
	fill (color: Color): void {
		this.pixels.fill(color);
		this.version += 1;
	}

	/**
	 * Position of a pixel inside the flat buffer.
	 */
	private indexOf (face: Face, x: number, y: number): number {
		return (face * FACE_RESOLUTION + y) * FACE_RESOLUTION + x;
	}
}
