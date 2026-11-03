/**
 * Turns a picture into the drawing of an object: the pixels the user would paint by hand.
 *
 * The user chooses how big the object is (the longest side of the picture, in cells; the other
 * side keeps the proportions). Each cell takes the average color of the part of the picture it
 * covers, like the shrinking `pixelate` does for a face, with one difference that matters for
 * objects: transparency is kept. A cell that is mostly transparent stays empty, so a picture
 * without a background gives an object without one.
 *
 * Averaging is the right way to shrink a photo, but it blurs pixel art, where every pixel is a
 * deliberate color. For those the `crisp` way takes the pixel at the middle of each cell
 * instead, so edges stay sharp. This file has no UI.
 */

import { RawImage } from '../../cube';
import { CENTER, Drawing, GRID } from './stage-object';

/**
 * Biggest file, in bytes, that can be opened as a picture. It only keeps the browser from running
 * out of memory: a big picture is shrunk when it is opened, so its size does not matter after that.
 */
export const MAX_PICTURE_BYTES = 10 * 1024 * 1024;

/**
 * Most pixels (width times height) a picture can have. Opening one means holding all its pixels
 * in memory for a moment, so a bigger one is refused.
 */
export const MAX_PICTURE_PIXELS = 50_000_000;

/**
 * Longest side, in pixels, a picture is kept at once it is open. A bigger one is shrunk to this.
 * It is also the most a chosen part is handed back at, and an object has far fewer cells.
 */
export const WORKING_SIDE = 1024;

/**
 * Why a file is too big to be read as a picture, or null if its size is fine. It is checked
 * before the file is opened, so a huge file is not read at all.
 */
export function fileProblem (bytes: number): string | null {
	return bytes > MAX_PICTURE_BYTES
		? `That file is too big (${(bytes / 1024 / 1024).toFixed(1)} MB). Use a picture of up to ${MAX_PICTURE_BYTES / 1024 / 1024} MB.`
		: null;
}

/**
 * Why a picture with this many pixels cannot be used, or null if it is fine.
 */
export function pixelsProblem (width: number, height: number): string | null {
	return width * height > MAX_PICTURE_PIXELS
		? `That picture is too big (${width} × ${height} px). Use one of up to ${MAX_PICTURE_PIXELS / 1_000_000} megapixels.`
		: null;
}

/**
 * The size a picture is kept at: its own size, or shrunk (keeping its proportions) so that its
 * longest side is `WORKING_SIDE`. It is never stretched.
 */
export function workingSize (width: number, height: number): { width: number; height: number } {
	const scale = Math.min(1, WORKING_SIDE / Math.max(width, height));

	return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * A cell is empty when the picture covers less than this share of it (0 to 1).
 */
const OPAQUE_SHARE = 0.5;

/**
 * Color of a pixel that is black in the picture. Black on the cube is a LED that is off, which
 * would leave a hole in the object, so the darkest color it uses is one step above.
 */
const DARKEST = 0x010101;

/**
 * The drawing a picture makes, with its size in cells.
 */
export type ImageDrawing = {
	/**
	 * One color per cell of the grid, or null where the object has nothing.
	 */
	drawing: Drawing;

	/**
	 * Cells across.
	 */
	width: number;

	/**
	 * Cells down.
	 */
	height: number;

	/**
	 * True when at least one cell has color.
	 */
	visible: boolean;
};

/**
 * Cells across and down for a picture whose longest side is `size` cells.
 */
export function sizeOfImage (image: RawImage, size: number): { width: number; height: number } {
	const side = Math.min(GRID, Math.max(1, Math.round(size)));
	const scale = side / Math.max(image.width, image.height);

	return {
		width: Math.min(side, Math.max(1, Math.round(image.width * scale))),
		height: Math.min(side, Math.max(1, Math.round(image.height * scale))),
	};
}

/**
 * Shrinks (or stretches) the picture to `size` cells on its longest side and centers it on the
 * grid, so the middle of the picture is the middle cell of the object.
 */
export function drawingFromImage (image: RawImage, size: number, crisp = false): ImageDrawing {
	const { width, height } = sizeOfImage(image, size);
	const drawing: Drawing = new Array<number | null>(GRID * GRID).fill(null);
	const firstColumn = CENTER - Math.floor((width - 1) / 2);
	const firstRow = CENTER - Math.floor((height - 1) / 2);
	let visible = false;

	for (let row = 0; row < height; row += 1)
		for (let column = 0; column < width; column += 1) {
			const color = crisp
				? pixelAt(image, Math.floor((column + 0.5) * image.width / width), Math.floor((row + 0.5) * image.height / height))
				: averageCell(image, column * image.width / width, (column + 1) * image.width / width, row * image.height / height, (row + 1) * image.height / height);

			if (null !== color) {
				drawing[(firstRow + row) * GRID + firstColumn + column] = color;
				visible = true;
			}
		}

	return { drawing, width, height, visible };
}

/**
 * The color of one pixel of the picture, or null when it is mostly see-through.
 */
function pixelAt (image: RawImage, x: number, y: number): number | null {
	const at = (Math.min(y, image.height - 1) * image.width + Math.min(x, image.width - 1)) * 4;

	if (image.data[at + 3] / 255 < OPAQUE_SHARE)
		return null;

	const color = image.data[at] << 16 | image.data[at + 1] << 8 | image.data[at + 2];

	return 0 === color ? DARKEST : color;
}

/**
 * The color of a rectangle of the picture, taking each source pixel by the part of it that the
 * rectangle covers, or null when it is mostly transparent. The color of a see-through pixel
 * counts as much as its opacity, so a faded edge does not darken the cell.
 */
function averageCell (image: RawImage, left: number, right: number, top: number, bottom: number): number | null {
	let covered = 0;
	let opacity = 0;
	let red = 0;
	let green = 0;
	let blue = 0;

	for (let y = Math.floor(top); y < Math.ceil(bottom); y += 1) {
		const heightShare = Math.min(bottom, y + 1) - Math.max(top, y);

		for (let x = Math.floor(left); x < Math.ceil(right); x += 1) {
			const share = heightShare * (Math.min(right, x + 1) - Math.max(left, x));
			const at = (y * image.width + x) * 4;
			const alpha = image.data[at + 3] / 255 * share;

			covered += share;
			opacity += alpha;
			red += image.data[at] * alpha;
			green += image.data[at + 1] * alpha;
			blue += image.data[at + 2] * alpha;
		}
	}

	if (0 === covered || opacity / covered < OPAQUE_SHARE)
		return null;

	const color = Math.round(red / opacity) << 16 | Math.round(green / opacity) << 8 | Math.round(blue / opacity);

	return 0 === color ? DARKEST : color;
}
