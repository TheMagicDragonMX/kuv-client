/**
 * Turns the picture the user chooses into their profile photo: a square cut from its middle,
 * shrunk to `PHOTO_SIDE` pixels and saved as a JPEG data URL, small enough for the API (which
 * takes up to 400 000 characters). This file has no UI.
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
 * Quality of the JPEG, from 0 to 1.
 */
const QUALITY = 0.85;

/**
 * Color behind the picture, where it is see-through.
 */
const BACKDROP = '#121a24';

/**
 * Why a file cannot be the profile photo, or null when it can be tried.
 */
export function photoFileProblem (file: { type: string; size: number }): string | null {
	if (!file.type.startsWith('image/'))
		return 'Elige una imagen (PNG, JPEG, WebP o GIF).';

	return file.size > MAX_PHOTO_FILE ? 'La imagen pesa más de 10 MB. Elige una más ligera.' : null;
}

/**
 * The square in the middle of a picture of this size: where it starts and how big it is.
 */
export function centerSquare (width: number, height: number): { x: number; y: number; side: number } {
	const side = Math.min(width, height);

	return { x: Math.round((width - side) / 2), y: Math.round((height - side) / 2), side };
}

/**
 * The profile photo made from a file. Throws when the file cannot be read as a picture.
 */
export async function photoFromFile (file: Blob): Promise<string> {
	const picture = await createImageBitmap(file);

	try {
		const { x, y, side } = centerSquare(picture.width, picture.height);
		const canvas = document.createElement('canvas');

		canvas.width = PHOTO_SIDE;
		canvas.height = PHOTO_SIDE;

		const context = canvas.getContext('2d');

		if (!context)
			throw new Error('No canvas to draw the photo on.');

		/**
		 * JPEG has no transparency, so the see-through parts of a picture get the color of a card
		 * instead of black.
		 */
		context.fillStyle = BACKDROP;
		context.fillRect(0, 0, PHOTO_SIDE, PHOTO_SIDE);
		context.imageSmoothingQuality = 'high';
		context.drawImage(picture, x, y, side, side, 0, 0, PHOTO_SIDE, PHOTO_SIDE);

		return canvas.toDataURL('image/jpeg', QUALITY);
	}

	finally {
		picture.close();
	}
}
