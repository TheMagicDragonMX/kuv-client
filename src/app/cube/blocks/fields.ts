/**
 * LAYER: blocks (fields).
 *
 * The kinds of value a block field can take, and ready-made field descriptions to use in block
 * schemas. The validator knows how to check each kind; a Blockly block uses the same list to
 * know which input to show.
 *
 * To add a new kind of value, add it to `FieldKind` here and teach `validateField` in
 * `program/validate-program.ts` how to check it. The compiler fails until both are done.
 */

/**
 * Kind of value a field takes.
 *
 *   text      non-empty string
 *   face      a FaceName
 *   faces     non-empty list of FaceName
 *   heading   a HeadingName
 *   step      'up' | 'right' | 'down' | 'left'
 *   color     '#RRGGBB'
 *   integer   any whole number (cells can be negative: shapes may overflow a face)
 *   count     whole number, zero or more
 *   seconds   number, zero or more
 *   shape     non-empty list of { dx, dy, color? }: the pixels of an object
 *   image     the pixels of one face: FACE_RESOLUTION * FACE_RESOLUTION '#RRGGBB', row after row
 *   blocks    nested list of blocks
 */
export type FieldKind =
	| 'text'
	| 'face'
	| 'faces'
	| 'heading'
	| 'step'
	| 'color'
	| 'integer'
	| 'count'
	| 'seconds'
	| 'shape'
	| 'image'
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

/**
 * A required field of each kind. Use these in block schemas: `x: FIELD.integer`.
 */
export const FIELD = {
	text: { kind: 'text' },
	face: { kind: 'face' },
	faces: { kind: 'faces' },
	heading: { kind: 'heading' },
	step: { kind: 'step' },
	color: { kind: 'color' },
	integer: { kind: 'integer' },
	count: { kind: 'count' },
	seconds: { kind: 'seconds' },
	shape: { kind: 'shape' },
	image: { kind: 'image' },
	blocks: { kind: 'blocks' },
} satisfies Record<FieldKind, FieldSchema>;

/**
 * The same field, but the block may leave it out: `heading: optional(FIELD.heading)`.
 */
export function optional (field: FieldSchema): FieldSchema {
	return { ...field, optional: true };
}
