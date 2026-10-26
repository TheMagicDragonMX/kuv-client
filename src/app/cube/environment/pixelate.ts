/**
 * LAYER: environment (pixelate).
 *
 * Turns a picture of any size into the 64x64 pixels of one face, the way the Raspberry Pi
 * would. `rpi-rgb-led-matrix`'s image viewer shrinks pictures with ImageMagick's `scale`,
 * which averages the area of the original that each pixel of the result covers (a box
 * filter, on the colors as they are written, with no gamma conversion). This does the same,
 * so what the virtual cube shows is what the physical cube will show.
 *
 * Transparent parts become black, because black is a LED that is off.
 *
 * Plain TypeScript, no DOM: the caller gets the RGBA bytes from wherever it loaded the picture
 * (a canvas in the browser) and passes them in.
 */

import { EngineError } from '../errors';
import { Color, FACE_RESOLUTION } from '../state/cube-state';

/**
 * A picture as raw bytes: `data` has 4 bytes (red, green, blue, alpha) per pixel, row after
 * row, which is what a canvas `ImageData` holds.
 */
export interface RawImage {
	width: number;
	height: number;
	data: ArrayLike<number>;
}

/**
 * Shrinks (or stretches) a picture to `size` x `size` pixels. Crop it to a square first, or
 * it is squashed.
 * @returns `size * size` colors, row after row, ready to paint on a face.
 */
export function pixelate (image: RawImage, size = FACE_RESOLUTION): Uint32Array {
	const { width, height, data } = image;

	if (!(0 < width) || !(0 < height) || data.length !== width * height * 4)
		throw new EngineError('The picture is empty or its bytes do not match its size');

	const pixels = new Uint32Array(size * size);
	const cellWidth = width / size;
	const cellHeight = height / size;

	for (let y = 0; y < size; y += 1)
		for (let x = 0; x < size; x += 1)
			pixels[y * size + x] = average(image, x * cellWidth, y * cellHeight, cellWidth, cellHeight);

	return pixels;
}

/**
 * Average color of the rectangle of the picture that starts at (left, top) and is
 * `cellWidth` x `cellHeight` big. Pixels cut by the border of the rectangle count for the
 * part that is inside, which is what keeps the result smooth when the sizes do not divide.
 */
function average (image: RawImage, left: number, top: number, cellWidth: number, cellHeight: number): Color {
	const { width, height, data } = image;
	const right = left + cellWidth;
	const bottom = top + cellHeight;

	let red = 0;
	let green = 0;
	let blue = 0;
	let area = 0;

	for (let y = Math.floor(top); y < Math.min(Math.ceil(bottom), height); y += 1) {
		const rowWeight = Math.min(y + 1, bottom) - Math.max(y, top);

		for (let x = Math.floor(left); x < Math.min(Math.ceil(right), width); x += 1) {
			const weight = rowWeight * (Math.min(x + 1, right) - Math.max(x, left));
			const index = (y * width + x) * 4;

			// A transparent pixel adds black: its color counts for as much as it is opaque.
			const opacity = data[index + 3] / 255;

			red += data[index] * opacity * weight;
			green += data[index + 1] * opacity * weight;
			blue += data[index + 2] * opacity * weight;
			area += weight;
		}
	}

	return (Math.round(red / area) << 16) | (Math.round(green / area) << 8) | Math.round(blue / area);
}
