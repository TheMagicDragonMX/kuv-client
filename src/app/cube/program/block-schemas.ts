/**
 * LAYER: program format (block schemas).
 *
 * A table describing, for every block, which fields it has and what kind of value each one
 * takes. The validator reads it to check programs. It is also the reference to look at when
 * building a Blockly block for an operation.
 *
 * `satisfies Record<Block['op'], ...>` makes TypeScript fail if a block type is added to
 * `program.ts` without a schema here.
 */

import { Block } from './program';

/**
 * Kind of value a field takes.
 *
 *   text      non-empty string
 *   face      a FaceName
 *   heading   a HeadingName
 *   step      'up' | 'right' | 'down' | 'left'
 *   color     '#RRGGBB'
 *   integer   any whole number (cells can be negative: shapes may overflow a face)
 *   count     whole number, zero or more
 *   seconds   number, zero or more
 *   colors    list of '#RRGGBB'
 *   blocks    nested list of blocks
 */
export type FieldKind =
	| 'text'
	| 'face'
	| 'heading'
	| 'step'
	| 'color'
	| 'integer'
	| 'count'
	| 'seconds'
	| 'colors'
	| 'blocks';

/**
 * One field of a block.
 */
export interface FieldSchema {
	kind: FieldKind;
	optional?: boolean;
}

/**
 * Fields of a block, by name (without `op`).
 */
export type BlockSchema = Record<string, FieldSchema>;

const text: FieldSchema = { kind: 'text' };
const face: FieldSchema = { kind: 'face' };
const color: FieldSchema = { kind: 'color' };
const integer: FieldSchema = { kind: 'integer' };
const count: FieldSchema = { kind: 'count' };
const heading: FieldSchema = { kind: 'heading', optional: true };

export const BLOCK_SCHEMAS = {
	// Object commands
	create: { name: text, face, x: integer, y: integer, color, heading },
	move: { target: text, step: { kind: 'step' }, count: { kind: 'count', optional: true } },
	moveTo: { target: text, face, x: integer, y: integer, heading },
	setColor: { target: text, color },
	show: { target: text },
	hide: { target: text },
	delete: { target: text },
	pointUp: { target: text },

	// Background commands
	clearBackground: { color: { kind: 'color', optional: true } },
	setPixel: { face, x: integer, y: integer, color },
	drawLine: { face, x0: integer, y0: integer, x1: integer, y1: integer, color },
	drawRect: { face, x: integer, y: integer, width: count, height: count, color },
	fillRect: { face, x: integer, y: integer, width: count, height: count, color },
	drawCircle: { face, cx: integer, cy: integer, radius: count, color },
	fillCircle: { face, cx: integer, cy: integer, radius: count, color },
	drawBitmap: { face, x: integer, y: integer, width: count, height: count, pixels: { kind: 'colors' } },

	// Control blocks
	wait: { seconds: { kind: 'seconds' } },
	repeat: { times: count, body: { kind: 'blocks' } },
	forever: { body: { kind: 'blocks' } },
} satisfies Record<Block['op'], BlockSchema>;
