/**
 * The math of the square cropper, kept apart from the component so it can be tested.
 *
 * The cropper shows a square window over the picture. The user zooms (the window gets smaller)
 * and drags (the window moves). Everything is in pixels of the original picture, so it does not
 * depend on how big the cropper is drawn on screen.
 */

/**
 * The square of the picture that is kept: top-left corner and side, in pixels of the picture.
 */
export interface Crop {
	x: number;
	y: number;
	side: number;
}

/**
 * How much the user can zoom in. At 1 the window is as big as the short side of the picture.
 */
export const MAX_ZOOM = 8;

/**
 * The window for a zoom level centered on a point, moved back inside the picture if it sticks out.
 */
export function cropOf (width: number, height: number, zoom: number, centerX: number, centerY: number): Crop {
	const side = Math.min(width, height) / Math.min(Math.max(zoom, 1), MAX_ZOOM);

	return {
		x: clamp(centerX - side / 2, 0, width - side),
		y: clamp(centerY - side / 2, 0, height - side),
		side,
	};
}

/**
 * Center point of a window.
 */
export function centerOf (crop: Crop): { x: number; y: number } {
	return { x: crop.x + crop.side / 2, y: crop.y + crop.side / 2 };
}

function clamp (value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
