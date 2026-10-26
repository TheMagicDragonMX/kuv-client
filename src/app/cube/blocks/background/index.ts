/**
 * CATEGORY: background (the "advanced" tier).
 *
 * Blocks that paint pixels directly, using the drawing primitives, but onto the world's
 * background layer instead of straight onto the cube. That is what makes the pixels stay: the
 * renderer starts every frame from the background and draws objects on top.
 *
 * Faces are per-face for now, so a shape cut by the edge of a face is clipped there instead
 * of continuing on the next face.
 *
 * To add a block to this category: write its file in this folder, then add it to the union and
 * to the table below. The compiler fails if you do one and not the other.
 */

import { CommandDefinition } from '../block-definition';
import { ClearBackgroundCommand, clearBackgroundBlock } from './clear-background';
import { DrawBitmapCommand, drawBitmapBlock } from './draw-bitmap';
import { DrawCircleCommand, drawCircleBlock } from './draw-circle';
import { DrawLineCommand, drawLineBlock } from './draw-line';
import { DrawRectCommand, drawRectBlock } from './draw-rect';
import { FillCircleCommand, fillCircleBlock } from './fill-circle';
import { FillRectCommand, fillRectBlock } from './fill-rect';
import { SetPixelCommand, setPixelBlock } from './set-pixel';

/**
 * Every command that paints the background.
 */
export type BackgroundCommand =
	| ClearBackgroundCommand
	| SetPixelCommand
	| DrawLineCommand
	| DrawRectCommand
	| FillRectCommand
	| DrawCircleCommand
	| FillCircleCommand
	| DrawBitmapCommand;

/**
 * The definition of each background block, by `op`.
 */
export const BACKGROUND_BLOCKS: { [K in BackgroundCommand['op']]: CommandDefinition<Extract<BackgroundCommand, { op: K }>> } = {
	clearBackground: clearBackgroundBlock,
	setPixel: setPixelBlock,
	drawLine: drawLineBlock,
	drawRect: drawRectBlock,
	fillRect: fillRectBlock,
	drawCircle: drawCircleBlock,
	fillCircle: fillCircleBlock,
	drawBitmap: drawBitmapBlock,
};
