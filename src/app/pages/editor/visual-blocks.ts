/**
 * The blocks of the Blocks tab: what each one looks like, and the engine block it stands for.
 *
 * These blocks are only a picture of a program. They run nothing: the tab shows them, and the
 * workspace (see `workspace.ts`) turns them into the JSON program the cube runs, and back. When
 * Blockly arrives it replaces this file, `workspace.ts` and the tab, and the cube does not notice.
 *
 * A block is described by one entry of `VISUAL_BLOCKS`: its fields (which the tab draws), what
 * is missing before it can run, the engine block it compiles to and how to read it back from
 * that engine block. To add a block, add an entry; nothing else needs to change.
 */

import { Block, FACE_RESOLUTION, FaceName, HeadingName, formatColor, parseColor } from '../../cube';

/**
 * Value of a field. Which one depends on the kind of the field:
 * faces → FaceName[], image → pixels (or null before choosing), number → number, the rest → string.
 */
export type FieldValue = string | number | FaceName[] | Uint32Array | null;

/**
 * The values of a block's fields, by field key.
 */
export type Values = Record<string, FieldValue>;

/**
 * What every kind of field has.
 */
type FieldBase = {
	/**
	 * Name of the value in the block's values.
	 */
	key: string;

	/**
	 * Text shown next to the control.
	 */
	label: string;
};

/**
 * A field of a block. The kind decides the control the tab draws.
 *
 *   faces   any of the five faces, or all
 *   face    one face
 *   color   a color picker
 *   number  a number (`integer` means whole numbers only)
 *   text    free text
 *   choice  one of a few options
 *   object  one of the objects made in the Objects tab
 *   image   a picture the user picks and crops (becomes the pixels of a face)
 */
export type FieldSpec = FieldBase & (
	| { kind: 'faces' | 'face' | 'color' | 'text' | 'object' | 'image' }
	| { kind: 'number'; min?: number; integer?: boolean; step?: number }
	| { kind: 'choice'; options: { value: string; label: string }[] }
);

/**
 * Group a block belongs to in the picker.
 */
export type Category = 'Background' | 'Objects' | 'Control';

/**
 * What a block can know about the rest of the program.
 */
export type Context = {
	/**
	 * Names of the objects the user made in the Objects tab: what the blocks can act on.
	 */
	objects: string[];
};

/**
 * Everything the tab needs to know about one kind of block: how it looks, and how it turns into an
 * engine block and back.
 */
export type VisualBlockSpec = {
	/**
	 * Identifies the kind of block in the workspace.
	 */
	type: string;

	/**
	 * The engine block it stands for.
	 */
	op: Block['op'];

	/**
	 * Name shown on the block.
	 */
	label: string;

	/**
	 * Group of the picker the block is listed in.
	 */
	category: Category;

	/**
	 * One sentence shown in the picker.
	 */
	description: string;

	/**
	 * The fields the user can fill in.
	 */
	fields: FieldSpec[];

	/**
	 * Whether it holds other blocks, like a loop.
	 */
	container?: boolean;

	/**
	 * The values a new block starts with. It gets the names of the objects that exist.
	 */
	defaults(objects: string[]): Values;

	/**
	 * What is missing or wrong, besides what the kinds of the fields already check.
	 */
	problem?(values: Values, context: Context): string | null;

	/**
	 * The engine block this one becomes. `body` is what is inside, already compiled.
	 */
	compile(values: Values, body: Block[]): Block;

	/**
	 * The values that make this block from an engine block. The reverse of `compile`.
	 */
	read(block: Block): Values;
};

/**
 * The order the categories are listed in, and so the order of the picker.
 */
export const CATEGORIES: Category[] = [ 'Background', 'Objects', 'Control' ];

/**
 * The field to choose one face.
 */
const FACE_FIELD: FieldSpec = { key: 'face', label: 'Face', kind: 'face' };

/**
 * The field to choose several faces.
 */
const FACES_FIELD: FieldSpec = { key: 'faces', label: 'Faces', kind: 'faces' };

/**
 * The field to choose a color.
 */
const COLOR_FIELD: FieldSpec = { key: 'color', label: 'Color', kind: 'color' };

/**
 * The field to choose which object the block acts on.
 */
const TARGET_FIELD: FieldSpec = { key: 'target', label: 'Object', kind: 'object' };

/**
 * The field for a column, a whole number from zero.
 */
const X_FIELD: FieldSpec = { key: 'x', label: 'X', kind: 'number', min: 0, integer: true };

/**
 * The field for a row, a whole number from zero.
 */
const Y_FIELD: FieldSpec = { key: 'y', label: 'Y', kind: 'number', min: 0, integer: true };

/**
 * The field to choose where an object faces.
 */
const HEADING_FIELD: FieldSpec = {
	key: 'heading',
	label: 'Facing',
	kind: 'choice',
	options: [
		{ value: '', label: 'Up (default)' },
		{ value: 'EAST', label: 'Right' },
		{ value: 'SOUTH', label: 'Down' },
		{ value: 'WEST', label: 'Left' },
	],
};

/**
 * The directions of a move, as the user sees them.
 */
const DIRECTIONS = [
	{ value: 'up', label: 'Up' },
	{ value: 'right', label: 'Right' },
	{ value: 'down', label: 'Down' },
	{ value: 'left', label: 'Left' },
];

/**
 * Checks that `compile` and `read` of a block agree on which engine block it is.
 */
type Definition<Op extends Block['op']> = Omit<VisualBlockSpec, 'op' | 'compile' | 'read'> & {
	/**
	 * The engine block it compiles to.
	 */
	op: Op;

	/**
	 * Builds the engine block from the field values and the blocks inside.
	 */
	compile(values: Values, body: Block[]): Extract<Block, { op: Op }>;

	/**
	 * Reads the field values back from an engine block.
	 */
	read(block: Extract<Block, { op: Op }>): Values;
};

/**
 * Gives a definition its final type, once `compile` and `read` are known to match.
 */
function define<Op extends Block['op']> (definition: Definition<Op>): VisualBlockSpec {
	return definition as unknown as VisualBlockSpec;
}

/**
 * The last object made, which is what a new block most likely acts on. Empty when there is none.
 */
function lastObject (objects: string[]): string {
	return objects.at(-1) ?? '';
}

/**
 * Says the block needs an object when its target is not one of the existing objects.
 */
function targetProblem (values: Values, context: Context): string | null {
	return context.objects.includes(values['target'] as string)
		? null
		: 'Choose an object. Make one in the Objects tab first.';
}

/**
 * The optional parts of a block: present only when they have a value.
 */
function heading (values: Values): { heading?: HeadingName } {
	return values['heading'] ? { heading: values['heading'] as HeadingName } : {};
}

/**
 * Blocks that only need an object, like "Show object".
 */
function onlyTarget (type: string, op: 'show' | 'hide' | 'delete' | 'pointUp', label: string, description: string): VisualBlockSpec {
	return define({
		type,
		op,
		label,
		category: 'Objects',
		description,
		fields: [ TARGET_FIELD ],
		defaults: (objects) => ({ target: lastObject(objects) }),
		problem: targetProblem,
		compile: (values) => ({ op, target: values['target'] as string }),
		read: (block) => ({ target: block.target }),
	});
}

/**
 * Every kind of block the user can add.
 */
export const VISUAL_BLOCKS: VisualBlockSpec[] = [
	define({
		type: 'setBackgroundImage',
		op: 'setBackgroundImage',
		label: 'Change background image',
		category: 'Background',
		description: 'Pick a photo, crop it, and put it on some faces.',
		fields: [ FACES_FIELD, { key: 'image', label: 'Image', kind: 'image' } ],
		defaults: () => ({ faces: [ 'FRONT' ], image: null }),
		problem: (values) => values['image'] ? null : 'Choose an image.',
		compile: (values) => ({
			op: 'setBackgroundImage',
			faces: values['faces'] as FaceName[],
			pixels: Array.from(values['image'] as Uint32Array, formatColor),
		}),
		read: (block) => ({ faces: block.faces, image: Uint32Array.from(block.pixels, parseColor) }),
	}),
	define({
		type: 'setBackgroundColor',
		op: 'setBackgroundColor',
		label: 'Change background color',
		category: 'Background',
		description: 'Paint some faces one color. Black turns them off.',
		fields: [ FACES_FIELD, COLOR_FIELD ],
		defaults: () => ({ faces: [ 'FRONT' ], color: '#000000' }),
		compile: (values) => ({ op: 'setBackgroundColor', faces: values['faces'] as FaceName[], color: values['color'] as string }),
		read: (block) => ({ faces: block.faces, color: block.color }),
	}),
	define({
		type: 'moveObject',
		op: 'move',
		label: 'Move object',
		category: 'Objects',
		description: 'Steps an object some cells, across the edges of the cube.',
		fields: [
			TARGET_FIELD,
			{ key: 'direction', label: 'Direction', kind: 'choice', options: DIRECTIONS },
			{ key: 'count', label: 'Cells', kind: 'number', min: 0, integer: true },
		],
		defaults: (objects) => ({ target: lastObject(objects), direction: 'right', count: 1 }),
		problem: targetProblem,
		compile: (values) => ({
			op: 'move',
			target: values['target'] as string,
			step: values['direction'] as 'up' | 'right' | 'down' | 'left',
			...1 === values['count'] ? {} : { count: values['count'] as number },
		}),
		read: (block) => ({ target: block.target, direction: block.step, count: block.count ?? 1 }),
	}),
	define({
		type: 'moveObjectTo',
		op: 'moveTo',
		label: 'Put object on a cell',
		category: 'Objects',
		description: 'Jumps an object to a cell of a face.',
		fields: [ TARGET_FIELD, FACE_FIELD, X_FIELD, Y_FIELD, HEADING_FIELD ],
		defaults: (objects) => ({ target: lastObject(objects), face: 'FRONT', x: 32, y: 32, heading: '' }),
		problem: targetProblem,
		compile: (values) => ({
			op: 'moveTo',
			target: values['target'] as string,
			face: values['face'] as FaceName,
			x: values['x'] as number,
			y: values['y'] as number,
			...heading(values),
		}),
		read: (block) => ({ target: block.target, face: block.face, x: block.x, y: block.y, heading: block.heading ?? '' }),
	}),
	define({
		type: 'setObjectColor',
		op: 'setColor',
		label: 'Change object color',
		category: 'Objects',
		description: 'Recolors an object.',
		fields: [ TARGET_FIELD, COLOR_FIELD ],
		defaults: (objects) => ({ target: lastObject(objects), color: '#fde047' }),
		problem: targetProblem,
		compile: (values) => ({ op: 'setColor', target: values['target'] as string, color: values['color'] as string }),
		read: (block) => ({ target: block.target, color: block.color }),
	}),
	onlyTarget('showObject', 'show', 'Show object', 'Makes an object visible.'),
	onlyTarget('hideObject', 'hide', 'Hide object', 'Hides an object without removing it.'),
	onlyTarget('deleteObject', 'delete', 'Delete object', 'Removes an object.'),
	onlyTarget('pointObjectUp', 'pointUp', 'Point object up', 'Makes "up" the up of the screen again, after the object turned.'),
	define({
		type: 'wait',
		op: 'wait',
		label: 'Wait',
		category: 'Control',
		description: 'Pauses for some seconds before the next block.',
		fields: [ { key: 'seconds', label: 'Seconds', kind: 'number', min: 0, step: 0.1 } ],
		defaults: () => ({ seconds: 1 }),
		compile: (values) => ({ op: 'wait', seconds: values['seconds'] as number }),
		read: (block) => ({ seconds: block.seconds }),
	}),
	define({
		type: 'repeat',
		op: 'repeat',
		label: 'Repeat',
		category: 'Control',
		description: 'Runs the blocks inside a number of times.',
		container: true,
		fields: [ { key: 'times', label: 'Times', kind: 'number', min: 0, integer: true } ],
		defaults: () => ({ times: 2 }),
		compile: (values, body) => ({ op: 'repeat', times: values['times'] as number, body }),
		read: (block) => ({ times: block.times }),
	}),
	define({
		type: 'forever',
		op: 'forever',
		label: 'Repeat forever',
		category: 'Control',
		description: 'Runs the blocks inside again and again, until the program stops.',
		container: true,
		fields: [],
		defaults: () => ({}),
		compile: (_values, body) => ({ op: 'forever', body }),
		read: () => ({}),
	}),
];

/**
 * The block description for a type.
 */
export function specOf (type: string): VisualBlockSpec {
	const spec = VISUAL_BLOCKS.find((candidate) => candidate.type === type);

	if (!spec)
		throw new Error(`There is no block of type ${type}`);

	return spec;
}

/**
 * The block description for an engine block, by its `op`.
 */
export function specForOp (op: string): VisualBlockSpec {
	const spec = VISUAL_BLOCKS.find((candidate) => candidate.op === op);

	if (!spec)
		throw new Error(`The block "${op}" has no visual block yet`);

	return spec;
}

/**
 * What the kind of each field of a block says is wrong with its value, if anything.
 */
export function fieldProblem (spec: VisualBlockSpec, values: Values): string | null {
	for (const field of spec.fields) {
		const value = values[field.key];

		if ('faces' === field.kind && 0 === (value as FaceName[]).length)
			return 'Choose at least one face.';

		if ('image' === field.kind && null !== value && (value as Uint32Array).length !== FACE_RESOLUTION * FACE_RESOLUTION)
			return 'The image does not have the size of a face.';

		if ('number' === field.kind) {
			if ('number' !== typeof value || !Number.isFinite(value))
				return `${field.label} needs a number.`;

			if (field.integer && !Number.isInteger(value))
				return `${field.label} needs a whole number.`;

			if (field.min !== undefined && value < field.min)
				return `${field.label} cannot be less than ${field.min}.`;
		}
	}

	return null;
}
