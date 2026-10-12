/**
 * LAYER: commands (background).
 *
 * The "advanced" tier. These blocks paint pixels directly, using the drawing primitives, but
 * onto the world's background layer instead of straight onto the cube. That is what makes the
 * pixels stay: the renderer starts every frame from the background and draws objects on top.
 *
 * Faces are per-face for now, so a shape cut by the edge of a face is clipped there instead
 * of continuing on the next face.
 */

import { drawBitmap } from '../drawing/bitmap';
import { clear, setPixel } from '../drawing/pixel';
import { drawCircle, drawLine, drawRect, fillCircle, fillRect } from '../drawing/shapes';
import { FACE_BY_NAME, parseColor } from '../program/names';
import {
	ClearBackgroundCommand,
	DrawBitmapCommand,
	DrawCircleCommand,
	DrawLineCommand,
	DrawRectCommand,
	FillCircleCommand,
	FillRectCommand,
	SetPixelCommand,
} from '../program/program';
import { World } from '../world/world';

/**
 * Paints the whole background one color (black by default).
 */
export function clearBackground (world: World, command: ClearBackgroundCommand): void {
	clear(world.background, command.color === undefined ? 0 : parseColor(command.color));
}

/**
 * Paints one pixel of the background.
 */
export function paintPixel (world: World, command: SetPixelCommand): void {
	setPixel(world.background, FACE_BY_NAME[command.face], command.x, command.y, parseColor(command.color));
}

/**
 * Draws a line on the background.
 */
export function paintLine (world: World, command: DrawLineCommand): void {
	drawLine(
		world.background,
		FACE_BY_NAME[command.face],
		command.x0,
		command.y0,
		command.x1,
		command.y1,
		parseColor(command.color),
	);
}

/**
 * Draws a rectangle outline on the background.
 */
export function paintRect (world: World, command: DrawRectCommand): void {
	drawRect(
		world.background,
		FACE_BY_NAME[command.face],
		command.x,
		command.y,
		command.width,
		command.height,
		parseColor(command.color),
	);
}

/**
 * Fills a rectangle on the background.
 */
export function paintFilledRect (world: World, command: FillRectCommand): void {
	fillRect(
		world.background,
		FACE_BY_NAME[command.face],
		command.x,
		command.y,
		command.width,
		command.height,
		parseColor(command.color),
	);
}

/**
 * Draws a circle outline on the background.
 */
export function paintCircle (world: World, command: DrawCircleCommand): void {
	drawCircle(
		world.background,
		FACE_BY_NAME[command.face],
		command.cx,
		command.cy,
		command.radius,
		parseColor(command.color),
	);
}

/**
 * Fills a circle on the background.
 */
export function paintFilledCircle (world: World, command: FillCircleCommand): void {
	fillCircle(
		world.background,
		FACE_BY_NAME[command.face],
		command.cx,
		command.cy,
		command.radius,
		parseColor(command.color),
	);
}

/**
 * Copies a picture onto the background.
 */
export function paintBitmap (world: World, command: DrawBitmapCommand): void {
	drawBitmap(
		world.background,
		FACE_BY_NAME[command.face],
		command.x,
		command.y,
		command.width,
		command.height,
		command.pixels.map(parseColor),
	);
}
