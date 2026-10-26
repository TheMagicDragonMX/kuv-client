/**
 * The blocks of the Blocks tab: what each one looks like and what program it becomes.
 *
 * These blocks are only a picture of a program. They run nothing: the tab shows them, and
 * `compileBlocks` turns the stack into the same JSON program the cube already runs. When Blockly
 * arrives it replaces this file and the tab, and the cube does not notice.
 *
 * A block is described by one entry of `VISUAL_BLOCKS`: its fields (which the tab draws), what
 * is missing before it can run, and the engine blocks it compiles to. To add a block, add an
 * entry; nothing else needs to change.
 */

import { Block, FACE_RESOLUTION, FaceName, Program, formatColor } from '../../cube';

/**
 * Value of a field. Which one depends on the kind of the field:
 * faces → FaceName[], image → pixels (or null before choosing), number → number, the rest → string.
 */
export type FieldValue = string | number | FaceName[] | Uint32Array | null;

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
 *   object  one of the objects created by blocks above this one
 *   image   a picture the user picks and crops (becomes the pixels of a face)
 */
export type FieldSpec = FieldBase & (
	| { kind: 'faces' | 'face' | 'color' | 'text' | 'object' | 'image' }
	| { kind: 'number'; min?: number; integer?: boolean; step?: number }
	| { kind: 'choice'; options: { value: string; label: string }[] }
);

export type Category = 'Background' | 'Objects' | 'Time';

/**
 * What a block can know about the blocks above it.
 */
export interface Context {
	/**
	 * Names of the objects created by the blocks above.
	 */
	objects: string[];
}

export interface VisualBlockSpec {
	type: string;
	label: string;
	category: Category;
	description: string;
	fields: FieldSpec[];

	/**
	 * The values a new block starts with. It gets the blocks already in the stack, for names.
	 */
	defaults(stack: VisualBlock[]): Values;

	/**
	 * What is missing or wrong, besides what the kinds of the fields already check.
	 */
	problem?(values: Values, context: Context): string | null;

	/**
	 * The engine blocks this one becomes.
	 */
	compile(values: Values): Block[];
}

/**
 * A block in the stack.
 */
export interface VisualBlock {
	id: number;
	type: string;
	values: Values;
}

/**
 * The order the categories are listed in, and so the order of the picker.
 */
export const CATEGORIES: Category[] = [ 'Background', 'Objects', 'Time' ];

const FACE_FIELD: FieldSpec = { key: 'face', label: 'Face', kind: 'face' };

const FACES_FIELD: FieldSpec = { key: 'faces', label: 'Faces', kind: 'faces' };

const COLOR_FIELD: FieldSpec = { key: 'color', label: 'Color', kind: 'color' };

const TARGET_FIELD: FieldSpec = { key: 'target', label: 'Object', kind: 'object' };

const DIRECTIONS = [
	{ value: 'up', label: 'Up' },
	{ value: 'right', label: 'Right' },
	{ value: 'down', label: 'Down' },
	{ value: 'left', label: 'Left' },
];

export const VISUAL_BLOCKS: VisualBlockSpec[] = [
	{
		type: 'setBackgroundImage',
		label: 'Change background image',
		category: 'Background',
		description: 'Pick a photo, crop it, and put it on some faces.',
		fields: [ FACES_FIELD, { key: 'image', label: 'Image', kind: 'image' } ],
		defaults: () => ({ faces: [ 'FRONT' ], image: null }),
		problem: (values) => values['image'] ? null : 'Choose an image.',
		compile: (values) => [ {
			op: 'setBackgroundImage',
			faces: values['faces'] as FaceName[],
			pixels: Array.from(values['image'] as Uint32Array, formatColor),
		} ],
	},
	{
		type: 'setBackgroundColor',
		label: 'Change background color',
		category: 'Background',
		description: 'Paint some faces one color. Black turns them off.',
		fields: [ FACES_FIELD, COLOR_FIELD ],
		defaults: () => ({ faces: [ 'FRONT' ], color: '#000000' }),
		compile: (values) => [ { op: 'setBackgroundColor', faces: values['faces'] as FaceName[], color: values['color'] as string } ],
	},
	{
		type: 'createObject',
		label: 'Create object',
		category: 'Objects',
		description: 'A pixel with a name, on a cell of a face.',
		fields: [
			{ key: 'name', label: 'Name', kind: 'text' },
			FACE_FIELD,
			{ key: 'x', label: 'X', kind: 'number', min: 0, integer: true },
			{ key: 'y', label: 'Y', kind: 'number', min: 0, integer: true },
			COLOR_FIELD,
		],
		defaults: (stack) => ({ name: freeName(stack), face: 'FRONT', x: 32, y: 32, color: '#f9a8d4' }),
		problem: (values, context) => {
			const name = (values['name'] as string).trim();

			if (!name)
				return 'Give the object a name.';

			return context.objects.includes(name) ? `There is already an object called "${name}" above.` : null;
		},
		compile: (values) => [ {
			op: 'create',
			name: (values['name'] as string).trim(),
			face: values['face'] as FaceName,
			x: values['x'] as number,
			y: values['y'] as number,
			color: values['color'] as string,
		} ],
	},
	{
		type: 'moveObject',
		label: 'Move object',
		category: 'Objects',
		description: 'Steps an object some cells, across the edges of the cube.',
		fields: [
			TARGET_FIELD,
			{ key: 'direction', label: 'Direction', kind: 'choice', options: DIRECTIONS },
			{ key: 'count', label: 'Cells', kind: 'number', min: 0, integer: true },
		],
		defaults: (stack) => ({ target: lastObject(stack), direction: 'right', count: 1 }),
		problem: targetProblem,
		compile: (values) => [ {
			op: 'move',
			target: values['target'] as string,
			step: values['direction'] as 'up' | 'right' | 'down' | 'left',
			count: values['count'] as number,
		} ],
	},
	{
		type: 'setObjectColor',
		label: 'Change object color',
		category: 'Objects',
		description: 'Recolors an object.',
		fields: [ TARGET_FIELD, COLOR_FIELD ],
		defaults: (stack) => ({ target: lastObject(stack), color: '#fde047' }),
		problem: targetProblem,
		compile: (values) => [ { op: 'setColor', target: values['target'] as string, color: values['color'] as string } ],
	},
	{
		type: 'wait',
		label: 'Wait',
		category: 'Time',
		description: 'Pauses for some seconds before the next block.',
		fields: [ { key: 'seconds', label: 'Seconds', kind: 'number', min: 0, step: 0.1 } ],
		defaults: () => ({ seconds: 1 }),
		compile: (values) => [ { op: 'wait', seconds: values['seconds'] as number } ],
	},
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
 * A new block, with the values it starts with.
 */
export function newBlock (type: string, id: number, stack: VisualBlock[]): VisualBlock {
	return { id, type, values: specOf(type).defaults(stack) };
}

/**
 * What is missing in each block that is not ready to run, by block id. A block that is fine is
 * not in the map.
 */
export function problemsOf (stack: VisualBlock[]): Map<number, string> {
	const problems = new Map<number, string>();
	const objects: string[] = [];

	for (const block of stack) {
		const spec = specOf(block.type);
		const message = fieldProblem(spec, block.values) ?? spec.problem?.(block.values, { objects }) ?? null;

		if (message)
			problems.set(block.id, message);

		if ('createObject' === block.type && !message)
			objects.push((block.values['name'] as string).trim());
	}

	return problems;
}

/**
 * The names of the objects created above each block, by block id.
 */
export function objectsAbove (stack: VisualBlock[]): Map<number, string[]> {
	const above = new Map<number, string[]>();
	const objects: string[] = [];

	for (const block of stack) {
		above.set(block.id, [ ...objects ]);

		if ('createObject' === block.type && (block.values['name'] as string).trim())
			objects.push((block.values['name'] as string).trim());
	}

	return above;
}

/**
 * The program a stack of blocks stands for: one script that starts at once and runs the blocks
 * in order, once, or again and again.
 */
export function compileBlocks (stack: VisualBlock[], repeatForever: boolean): Program {
	const blocks = stack.flatMap((block) => specOf(block.type).compile(block.values));

	return {
		version: 1,
		scripts: [ { trigger: { type: 'start' }, blocks: repeatForever ? [ { op: 'forever', body: blocks } ] : blocks } ],
	};
}

/**
 * What the kind of each field of a block says is wrong with its value, if anything.
 */
function fieldProblem (spec: VisualBlockSpec, values: Values): string | null {
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

function targetProblem (values: Values, context: Context): string | null {
	return context.objects.includes(values['target'] as string)
		? null
		: 'Choose an object. Add a "Create object" block above this one first.';
}

/**
 * An object name nobody in the stack uses yet: object1, object2...
 */
function freeName (stack: VisualBlock[]): string {
	const taken = new Set(stack.map((block) => block.values['name']));

	for (let number = 1; ; number += 1)
		if (!taken.has(`object${number}`))
			return `object${number}`;
}

/**
 * The name of the last object created in the stack, which is what a new block most likely acts
 * on. Empty when there is none.
 */
function lastObject (stack: VisualBlock[]): string {
	const created = stack.filter((block) => 'createObject' === block.type);

	return (created.at(-1)?.values['name'] as string | undefined) ?? '';
}
