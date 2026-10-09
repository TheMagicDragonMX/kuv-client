import { Color, CubeState, Face } from '../cube-state';

/**
 * Draws a straight line between two points (Bresenham).
 */
export function drawLine (
	state: CubeState,
	face: Face,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	color: Color,
): void {
	const dx = Math.abs(x1 - x0);
	const dy = -Math.abs(y1 - y0);
	const stepX = x0 < x1 ? 1 : -1;
	const stepY = y0 < y1 ? 1 : -1;
	let error = dx + dy;
	let x = x0;
	let y = y0;

	for (;;) {
		state.set(face, x, y, color);
		if (x === x1 && y === y1) {
			return;
		}

		const doubled = 2 * error;
		if (doubled >= dy) {
			error += dy;
			x += stepX;
		}
		if (doubled <= dx) {
			error += dx;
			y += stepY;
		}
	}
}

/**
 * Draws the outline of a rectangle whose top-left corner is (x, y).
 */
export function drawRect (
	state: CubeState,
	face: Face,
	x: number,
	y: number,
	width: number,
	height: number,
	color: Color,
): void {
	if (width <= 0 || height <= 0) {
		return;
	}

	drawLine(state, face, x, y, x + width - 1, y, color);
	drawLine(state, face, x, y + height - 1, x + width - 1, y + height - 1, color);
	drawLine(state, face, x, y, x, y + height - 1, color);
	drawLine(state, face, x + width - 1, y, x + width - 1, y + height - 1, color);
}

/**
 * Fills a rectangle whose top-left corner is (x, y).
 */
export function fillRect (
	state: CubeState,
	face: Face,
	x: number,
	y: number,
	width: number,
	height: number,
	color: Color,
): void {
	for (let row = y; row < y + height; row += 1) {
		for (let col = x; col < x + width; col += 1) {
			state.set(face, col, row, color);
		}
	}
}

/**
 * Draws the outline of a circle (midpoint algorithm).
 */
export function drawCircle (
	state: CubeState,
	face: Face,
	cx: number,
	cy: number,
	radius: number,
	color: Color,
): void {
	if (radius < 0) {
		return;
	}

	let x = radius;
	let y = 0;
	let error = 1 - radius;

	while (x >= y) {
		state.set(face, cx + x, cy + y, color);
		state.set(face, cx - x, cy + y, color);
		state.set(face, cx + x, cy - y, color);
		state.set(face, cx - x, cy - y, color);
		state.set(face, cx + y, cy + x, color);
		state.set(face, cx - y, cy + x, color);
		state.set(face, cx + y, cy - x, color);
		state.set(face, cx - y, cy - x, color);

		y += 1;
		if (error < 0) {
			error += 2 * y + 1;
		} else {
			x -= 1;
			error += 2 * (y - x) + 1;
		}
	}
}

/**
 * Fills a circle.
 */
export function fillCircle (
	state: CubeState,
	face: Face,
	cx: number,
	cy: number,
	radius: number,
	color: Color,
): void {
	for (let y = -radius; y <= radius; y += 1) {
		const half = Math.floor(Math.sqrt(radius * radius - y * y));
		for (let x = -half; x <= half; x += 1) {
			state.set(face, cx + x, cy + y, color);
		}
	}
}
