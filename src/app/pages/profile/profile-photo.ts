/**
 * Turns the picture the user chooses into their profile photo: the square they framed in the
 * cropper (the circle the avatar shows fits inside it), shrunk to `PHOTO_SIDE` pixels and saved
 * as a JPEG file, far below the 300 KB the API takes. This file has no UI.
 */

/**
 * Side, in pixels, of the profile photo.
 */
export const PHOTO_SIDE = 256;

/**
 * Biggest file that is opened as a photo, in bytes. A bigger one is refused before it is read.
 */
export const MAX_PHOTO_FILE = 10 * 1024 * 1024;

/**
 * Most the cropper zooms in: at 1 the shorter side of the picture fills the circle, at this
 * value a fifth of it does.
 */
export const MAX_ZOOM = 5;

/**
 * Quality of the JPEG, from 0 to 1.
 */
const QUALITY = 0.85;

/**
 * Color behind the picture, where it is see-through.
 */
const BACKDROP = '#121a24';

/**
 * A square of the picture, in its own pixels.
 */
export type Crop = {
	/**
	 * Distance from the left edge of the picture to the square.
	 */
	x: number;

	/**
	 * Distance from the top edge of the picture to the square.
	 */
	y: number;

	/**
	 * Side of the square.
	 */
	side: number;
};

/**
 * How the cropper frames the picture.
 */
export type CropView = {
	/**
	 * How far it is zoomed in, from 1 to `MAX_ZOOM`.
	 */
	zoom: number;

	/**
	 * Point of the picture in the middle of the circle, from its left edge, in its pixels.
	 */
	centerX: number;

	/**
	 * Point of the picture in the middle of the circle, from its top edge, in its pixels.
	 */
	centerY: number;
};

/**
 * A picture's width and height, in pixels.
 */
export type PictureSize = {
	/**
	 * Width of the picture.
	 */
	width: number;

	/**
	 * Height of the picture.
	 */
	height: number;
};

/**
 * Why a file cannot be the profile photo, or null when it can be tried.
 */
export function photoFileProblem (file: { type: string; size: number }): string | null {
	if (!file.type.startsWith('image/'))
		return 'Elige una imagen (PNG, JPEG, WebP o GIF).';

	return file.size > MAX_PHOTO_FILE ? 'La imagen pesa más de 10 MB. Elige una más ligera.' : null;
}

/**
 * Keeps a number between two others.
 */
function clamp (value: number, lowest: number, highest: number): number {
	return Math.min(Math.max(value, lowest), highest);
}

/**
 * The view the cropper opens with: not zoomed in, on the middle of the picture.
 */
export function centeredView ({ width, height }: PictureSize): CropView {
	return { zoom: 1, centerX: width / 2, centerY: height / 2 };
}

/**
 * The same view, moved and zoomed only as far as the circle stays full of picture.
 */
export function clampView ({ width, height }: PictureSize, view: CropView): CropView {
	const zoom = clamp(view.zoom, 1, MAX_ZOOM);
	const half = Math.min(width, height) / zoom / 2;

	return { zoom, centerX: clamp(view.centerX, half, width - half), centerY: clamp(view.centerY, half, height - half) };
}

/**
 * The square of the picture a view shows.
 */
export function cropOf (size: PictureSize, view: CropView): Crop {
	const { zoom, centerX, centerY } = clampView(size, view);
	const side = Math.min(size.width, size.height) / zoom;

	return { x: centerX - side / 2, y: centerY - side / 2, side };
}

/**
 * Opens a file as a picture to crop. Throws when the file cannot be read as one.
 */
export function openPicture (file: Blob): Promise<ImageBitmap> {
	return createImageBitmap(file);
}

/**
 * Draws a square of the picture filling a canvas, with the backdrop under its see-through parts.
 * Does nothing when the canvas cannot be drawn on.
 */
export function drawCrop (canvas: HTMLCanvasElement, picture: CanvasImageSource, crop: Crop): void {
	const context = canvas.getContext('2d');

	if (!context)
		return;

	context.fillStyle = BACKDROP;
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.imageSmoothingQuality = 'high';
	context.drawImage(picture, crop.x, crop.y, crop.side, crop.side, 0, 0, canvas.width, canvas.height);
}

/**
 * The profile photo made from a square of the picture, as a JPEG.
 */
export async function photoFromCrop (picture: CanvasImageSource, crop: Crop): Promise<Blob> {
	const canvas = document.createElement('canvas');

	canvas.width = PHOTO_SIDE;
	canvas.height = PHOTO_SIDE;

	if (!canvas.getContext('2d'))
		throw new Error('No canvas to draw the photo on.');

	/**
	 * JPEG has no transparency, so the see-through parts of a picture get the color of a card
	 * instead of black.
	 */
	drawCrop(canvas, picture, crop);

	return await new Promise<Blob>((resolve, reject) => canvas.toBlob(
		(photo) => photo ? resolve(photo) : reject(new Error('The photo could not be encoded.')),
		'image/jpeg',
		QUALITY,
	));
}
