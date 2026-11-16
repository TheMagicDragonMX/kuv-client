/**
 * The shape of the pixel glow that follows the mouse, without any drawing: which squares of the
 * screen light up around a point, and how much. The squares sit on a fixed grid, so as the mouse
 * moves pixels light up and go out in place, like the LEDs of the cube, instead of a blob sliding.
 */

/**
 * Side of a square of the grid, in CSS pixels.
 */
export const CELL = 14;

/**
 * How far from the point the glow reaches, in CSS pixels.
 */
export const RADIUS = 150;

/**
 * How many brightness steps there are between the edge and the middle. Few steps is what makes
 * it look pixelated instead of smooth.
 */
export const LEVELS = 4;

/**
 * Part of the radius, from the middle, drawn in the inner color.
 */
export const INNER = 0.4;

/**
 * A square that lights up.
 */
export type GlowCell = {
	/**
	 * Left edge of the square, in CSS pixels from the left of the window.
	 */
	x: number;

	/**
	 * Top edge of the square, in CSS pixels from the top of the window.
	 */
	y: number;

	/**
	 * How bright it is, in steps of `1 / LEVELS`, from more than 0 to 1 in the middle.
	 */
	strength: number;

	/**
	 * True when it is near the middle, which has the inner color.
	 */
	inner: boolean;
};

/**
 * The squares lit by a glow centered on a point.
 */
export function glowCells (centerX: number, centerY: number): GlowCell[] {
	const cells: GlowCell[] = [];
	const first = { column: Math.floor((centerX - RADIUS) / CELL), row: Math.floor((centerY - RADIUS) / CELL) };
	const last = { column: Math.floor((centerX + RADIUS) / CELL), row: Math.floor((centerY + RADIUS) / CELL) };

	for (let row = first.row; row <= last.row; row++)
		for (let column = first.column; column <= last.column; column++) {
			const distance = Math.hypot((column + 0.5) * CELL - centerX, (row + 0.5) * CELL - centerY) / RADIUS;

			if (1 <= distance)
				continue;

			cells.push({ x: column * CELL, y: row * CELL, strength: Math.ceil((1 - distance) * LEVELS) / LEVELS, inner: distance < INNER });
		}

	return cells;
}
