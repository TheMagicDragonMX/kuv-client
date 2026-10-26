/**
 * The objects of the Objects tab: pixel drawings that sit on the cube until the blocks move them.
 *
 * An object is a `create` block of the engine (name, where it starts, color, shape). The user
 * draws one on a small grid with a center cell: the center is the object's own cell (the one a
 * block moves), and the cells around it are the rest of its shape. This file turns a drawing into
 * that block and back, and has no UI.
 */

import { CreateCommand, ShapePixelDefinition, formatColor, parseColor } from '../../cube';

/**
 * The drawing grid is `GRID` cells wide and tall, with the center in the middle.
 */
export const GRID = 15;

export const CENTER = (GRID - 1) / 2;

/**
 * Where objects start: the middle of the front face. The blocks move them from there.
 */
export const START = { face: 'FRONT', x: 32, y: 32 } as const;

/**
 * What is drawn: one color for each cell of the grid, row after row, or null for an empty cell.
 */
export type Drawing = (number | null)[];

/**
 * A drawing with only the center painted.
 */
export function newDrawing (color: number): Drawing {
	const cells: Drawing = new Array<number | null>(GRID * GRID).fill(null);
	cells[CENTER * GRID + CENTER] = color;

	return cells;
}

/**
 * The object a drawing makes. The center cell is the object's color and cell; if nothing else
 * is painted it is a single pixel, otherwise the shape lists every painted cell.
 */
export function objectFromDrawing (name: string, drawing: Drawing): CreateCommand {
	const center = drawing[CENTER * GRID + CENTER] ?? 0;
	const pixels: ShapePixelDefinition[] = [];

	drawing.forEach((color, index) => {
		if (null !== color)
			pixels.push({ dx: index % GRID - CENTER, dy: Math.floor(index / GRID) - CENTER, color: formatColor(color) });
	});

	return {
		op: 'create',
		name: name.trim(),
		...START,
		color: formatColor(center),
		...1 < pixels.length ? { pixels } : {},
	};
}

/**
 * The drawing of an object, or null when the object does not fit the grid (an object that came
 * from an example can be bigger than the grid).
 */
export function drawingFromObject (object: CreateCommand): Drawing | null {
	const color = parseColor(object.color);

	if (!object.pixels)
		return newDrawing(color);

	const drawing: Drawing = new Array<number | null>(GRID * GRID).fill(null);

	for (const pixel of object.pixels) {
		const column = pixel.dx + CENTER;
		const row = pixel.dy + CENTER;

		if (0 > column || column >= GRID || 0 > row || row >= GRID)
			return null;

		drawing[row * GRID + column] = pixel.color === undefined ? color : parseColor(pixel.color);
	}

	// The center is always part of the object, even if its shape does not list it.
	drawing[CENTER * GRID + CENTER] ??= color;

	return drawing;
}

/**
 * The pixels of an object as a picture, cropped to the cells it uses: its size, and one color
 * for each cell (null where the object has nothing).
 */
export function pictureOfObject (object: CreateCommand): { width: number; height: number; colors: (number | null)[] } {
	const color = parseColor(object.color);
	const pixels = object.pixels ?? [ { dx: 0, dy: 0 } ];
	const columns = pixels.map((pixel) => pixel.dx);
	const rows = pixels.map((pixel) => pixel.dy);
	const left = columns.reduce((least, value) => Math.min(least, value), 0);
	const top = rows.reduce((least, value) => Math.min(least, value), 0);
	const width = columns.reduce((most, value) => Math.max(most, value), 0) - left + 1;
	const height = rows.reduce((most, value) => Math.max(most, value), 0) - top + 1;
	const colors = new Array<number | null>(width * height).fill(null);

	for (const pixel of pixels)
		colors[(pixel.dy - top) * width + pixel.dx - left] = pixel.color === undefined ? color : parseColor(pixel.color);

	return { width, height, colors };
}

/**
 * What is wrong with a name for an object, if anything. `taken` are the names already in use.
 */
export function nameProblem (name: string, taken: string[]): string | null {
	if (!name.trim())
		return 'Give the object a name.';

	return taken.includes(name.trim()) ? `There is already an object called "${name.trim()}".` : null;
}

/**
 * A name nobody uses yet: object1, object2...
 */
export function freeObjectName (taken: string[]): string {
	for (let number = 1; ; number += 1)
		if (!taken.includes(`object${number}`))
			return `object${number}`;
}
