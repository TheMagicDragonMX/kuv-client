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

import { Block, FACE_RESOLUTION, FaceName, HeadingName, ShapePixelDefinition, formatColor, parseColor } from '../../cube';

/**
 * Value of a field. Which one depends on the kind of the field:
 * faces → FaceName[], image → pixels (or null before choosing), shape → pixels of an object (or
 * null for a single pixel), number → number, the rest → string.
 */
export type FieldValue = string | number | FaceName[] | Uint32Array | ShapePixelDefinition[] | null;

export type Values = Record<string, FieldValue>;

interface FieldBase {
	key: string;
	label: string;
}

/**
 * A field of a block. The kind decides the control the tab draws.
 *
 *   faces   any of the five faces, or all
 *   face    one face
 *   color   a color picker
 *   number  a number (`integer` means whole numbers only)
 *   text    free text
 *   choice  one of a few options
 *   object  one of the objects created by blocks
 *   image   a picture the user picks and crops (becomes the pixels of a face)
 *   shape   the pixels of an object. It cannot be drawn yet: it is shown, and can be cleared
 */
export type FieldSpec = FieldBase & (
	| { kind: 'faces' | 'face' | 'color' | 'text' | 'object' | 'image' | 'shape' }
	| { kind: 'number'; min?: number; integer?: boolean; step?: number }
	| { kind: 'choice'; options: { value: string; label: string }[] }
);

export type Category = 'Background' | 'Objects' | 'Control';

/**
 * What a block can know about the rest of the program.
 */
export interface Context {
	/**
	 * Names of all the objects created by blocks, anywhere (scripts run side by side, so a
	 * script can act on an object another one creates).
	 */
	objects: string[];

	/**
	 * Names of the objects created by the blocks before this one.
	 */
	taken: string[];
}

export interface VisualBlockSpec {
	type: string;

	/**
	 * The engine block it stands for.
	 */
	op: Block['op'];
	label: string;
	category: Category;
	description: string;
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
}

/**
 * The order the categories are listed in, and so the order of the picker.
 */
export const CATEGORIES: Category[] = [ 'Background', 'Objects', 'Control' ];

const FACE_FIELD: FieldSpec = { key: 'face', label: 'Face', kind: 'face' };

const FACES_FIELD: FieldSpec = { key: 'faces', label: 'Faces', kind: 'faces' };

const COLOR_FIELD: FieldSpec = { key: 'color', label: 'Color', kind: 'color' };

const TARGET_FIELD: FieldSpec = { key: 'target', label: 'Object', kind: 'object' };

const X_FIELD: FieldSpec = { key: 'x', label: 'X', kind: 'number', min: 0, integer: true };

const Y_FIELD: FieldSpec = { key: 'y', label: 'Y', kind: 'number', min: 0, integer: true };

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

const DIRECTIONS = [
	{ value: 'up', label: 'Up' },
	{ value: 'right', label: 'Right' },
	{ value: 'down', label: 'Down' },
	{ value: 'left', label: 'Left' },
];

/**
 * Checks that `compile` and `read` of a block agree on which engine block it is.
 */
interface Definition<Op extends Block['op']> extends Omit<VisualBlockSpec, 'op' | 'compile' | 'read'> {
	op: Op;
	compile(values: Values, body: Block[]): Extract<Block, { op: Op }>;
	read(block: Extract<Block, { op: Op }>): Values;
}

function define<Op extends Block['op']> (definition: Definition<Op>): VisualBlockSpec {
	return definition as unknown as VisualBlockSpec;
}

/**
 * An object name nobody uses yet: object1, object2...
 */
function freeName (objects: string[]): string {
	for (let number = 1; ; number += 1)
		if (!objects.includes(`object${number}`))
			return `object${number}`;
}

/**
 * The last object created, which is what a new block most likely acts on. Empty when there is none.
 */
function lastObject (objects: string[]): string {
	return objects.at(-1) ?? '';
}

function targetProblem (values: Values, context: Context): string | null {
	return context.objects.includes(values['target'] as string)
		? null
		: 'Choose an object. Add a "Create object" block first.';
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
		type: 'createObject',
		op: 'create',
		label: 'Create object',
		category: 'Objects',
		description: 'A pixel with a name, on a cell of a face.',
		fields: [
			{ key: 'name', label: 'Name', kind: 'text' },
			FACE_FIELD,
			X_FIELD,
			Y_FIELD,
			COLOR_FIELD,
			HEADING_FIELD,
			{ key: 'shape', label: 'Shape', kind: 'shape' },
		],
		defaults: (objects) => ({ name: freeName(objects), face: 'FRONT', x: 32, y: 32, color: '#f9a8d4', heading: '', shape: null }),
		problem: (values, context) => {
			const name = (values['name'] as string).trim();

			if (!name)
				return 'Give the object a name.';

			return context.taken.includes(name) ? `There is already an object called "${name}".` : null;
		},
		compile: (values) => ({
			op: 'create',
			name: (values['name'] as string).trim(),
			face: values['face'] as FaceName,
			x: values['x'] as number,
			y: values['y'] as number,
			color: values['color'] as string,
			...heading(values),
			...values['shape'] ? { pixels: values['shape'] as ShapePixelDefinition[] } : {},
		}),
		read: (block) => ({
			name: block.name,
			face: block.face,
			x: block.x,
			y: block.y,
			color: block.color,
			heading: block.heading ?? '',
			shape: block.pixels ?? null,
		}),
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
