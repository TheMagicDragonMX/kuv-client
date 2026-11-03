/**
 * The math of the rectangle the user draws over a picture to choose the part to keep, apart from
 * the component so it can be tested.
 *
 * Everything is in pixels of the original picture, so it does not depend on how big the picture
 * is drawn on screen.
 */

/**
 * A point of the picture, in pixels.
 */
export type Point = {
	/**
	 * Distance from the left edge.
	 */
	x: number;

	/**
	 * Distance from the top edge.
	 */
	y: number;
};

/**
 * The size of the picture, in pixels.
 */
export type Bounds = {
	/**
	 * Pixels across.
	 */
	width: number;

	/**
	 * Pixels down.
	 */
	height: number;
};

/**
 * The part of the picture that is kept.
 */
export type Rect = Point & Bounds;

/**
 * The corners of the rectangle that can be dragged.
 */
export type Corner = 'nw' | 'ne' | 'sw' | 'se';

/**
 * Smallest side the rectangle can have, in pixels of the picture.
 */
export const MIN_SIDE = 2;

/**
 * The rectangle that is the whole picture.
 */
export function wholeImage (bounds: Bounds): Rect {
	return { x: 0, y: 0, width: bounds.width, height: bounds.height };
}

/**
 * The rectangle with two points as opposite corners, in whatever order they come, kept inside
 * the picture and no smaller than `MIN_SIDE`.
 */
export function rectBetween (first: Point, second: Point, bounds: Bounds): Rect {
	const left = clamp(Math.min(first.x, second.x), 0, bounds.width);
	const right = clamp(Math.max(first.x, second.x), 0, bounds.width);
	const top = clamp(Math.min(first.y, second.y), 0, bounds.height);
	const bottom = clamp(Math.max(first.y, second.y), 0, bounds.height);
	const width = Math.min(Math.max(right - left, MIN_SIDE), bounds.width);
	const height = Math.min(Math.max(bottom - top, MIN_SIDE), bounds.height);

	return {
		x: Math.min(left, bounds.width - width),
		y: Math.min(top, bounds.height - height),
		width,
		height,
	};
}

/**
 * The rectangle moved by some pixels, stopping at the edges of the picture.
 */
export function moveRect (rect: Rect, dx: number, dy: number, bounds: Bounds): Rect {
	return {
		...rect,
		x: clamp(rect.x + dx, 0, bounds.width - rect.width),
		y: clamp(rect.y + dy, 0, bounds.height - rect.height),
	};
}

/**
 * The rectangle after dragging one corner to a point: the opposite corner stays where it is.
 * Dragging past it turns the rectangle over.
 */
export function resizeRect (rect: Rect, corner: Corner, point: Point, bounds: Bounds): Rect {
	const anchor = {
		x: corner.includes('w') ? rect.x + rect.width : rect.x,
		y: corner.includes('n') ? rect.y + rect.height : rect.y,
	};

	return rectBetween(anchor, point, bounds);
}

/**
 * What a press at a point grabs: a corner if it is within `reach` pixels of one, the whole
 * rectangle if it is inside, and otherwise nothing, which starts a new rectangle.
 */
export function grabOf (rect: Rect, point: Point, reach: number): Corner | 'move' | 'new' {
	const corners: [ Corner, number, number ][] = [
		[ 'nw', rect.x, rect.y ],
		[ 'ne', rect.x + rect.width, rect.y ],
		[ 'sw', rect.x, rect.y + rect.height ],
		[ 'se', rect.x + rect.width, rect.y + rect.height ],
	];
	let nearest: Corner | null = null;
	let nearestDistance = reach;

	for (const [ name, x, y ] of corners) {
		const distance = Math.hypot(point.x - x, point.y - y);

		if (distance <= nearestDistance) {
			nearest = name;
			nearestDistance = distance;
		}
	}

	if (nearest)
		return nearest;

	const inside = rect.x <= point.x && point.x <= rect.x + rect.width && rect.y <= point.y && point.y <= rect.y + rect.height;

	return inside ? 'move' : 'new';
}

/**
 * Keeps a value between the limits.
 */
function clamp (value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), Math.max(min, max));
}
