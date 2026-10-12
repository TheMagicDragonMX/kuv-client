/**
 * LAYER: program format (validation).
 *
 * Checks that something that claims to be a program really is one, before the engine runs it.
 * A program can come from a textarea, a file, the network or Blockly, so nothing about it can
 * be trusted. Everything the engine does later assumes the program passed through here.
 *
 * Errors say exactly where the problem is, for example:
 *   scripts[0].blocks[2].count: must be a whole number, zero or more
 *
 * Unknown fields are rejected on purpose: a typo like `cont` instead of `count` would
 * otherwise be silently ignored and the block would do something unexpected.
 *
 * What a valid block looks like is not written here but in `block-schemas.ts`.
 */

import { ProgramError } from '../errors';
import { BLOCK_SCHEMAS, BlockSchema, FieldKind } from './block-schemas';
import { FACE_BY_NAME, HEADING_BY_NAME, isColorValue } from './names';
import { Program } from './program';

const SIDE_NAMES = [ 'FRONT', 'RIGHT', 'BACK', 'LEFT' ];

const STEP_NAMES = [ 'up', 'right', 'down', 'left' ];

type Fields = Record<string, unknown>;

/**
 * Checks a value and returns it typed as a Program. Throws a ProgramError if it is not one.
 */
export function validateProgram (value: unknown): Program {
	const program = expectObject(value, 'program');
	expectOnlyKeys(program, [ 'version', 'config', 'scripts' ], 'program');

	if (program['version'] !== 1) {
		fail('version', 'must be 1');
	}
	if (program['config'] !== undefined) {
		validateConfig(program['config']);
	}

	const scripts = program['scripts'];
	if (!Array.isArray(scripts)) {
		fail('scripts', 'must be a list of scripts');
	}

	scripts.forEach((script, index) => validateScript(script, `scripts[${index}]`));

	return value as Program;
}

/**
 * Checks the optional engine settings.
 */
function validateConfig (value: unknown): void {
	const config = expectObject(value, 'config');
	expectOnlyKeys(config, [ 'topAnchor', 'floor' ], 'config');

	const { topAnchor, floor } = config;
	if (topAnchor !== undefined && !SIDE_NAMES.includes(topAnchor as string)) {
		fail('config.topAnchor', `must be one of ${SIDE_NAMES.join(', ')}`);
	}
	if (floor !== undefined && !isCount(floor)) {
		fail('config.floor', 'must be a whole number, zero or more');
	}
}

/**
 * Checks a script: its trigger and its blocks.
 */
function validateScript (value: unknown, path: string): void {
	const script = expectObject(value, path);
	expectOnlyKeys(script, [ 'trigger', 'blocks' ], path);

	validateTrigger(script['trigger'], `${path}.trigger`);
	validateBlocks(script['blocks'], `${path}.blocks`);
}

/**
 * Checks the event that starts a script.
 */
function validateTrigger (value: unknown, path: string): void {
	const trigger = expectObject(value, path);

	switch (trigger['type']) {
		case 'start':
			expectOnlyKeys(trigger, [ 'type' ], path);
			return;
		case 'every':
			expectOnlyKeys(trigger, [ 'type', 'seconds' ], path);
			if (typeof trigger['seconds'] !== 'number' || !(trigger['seconds'] > 0) || !Number.isFinite(trigger['seconds'])) {
				fail(`${path}.seconds`, 'must be a number greater than zero');
			}
			return;
		default:
			fail(`${path}.type`, "must be 'start' or 'every'");
	}
}

/**
 * Checks a list of blocks, including the lists nested inside loops.
 */
function validateBlocks (value: unknown, path: string): void {
	if (!Array.isArray(value)) {
		fail(path, 'must be a list of blocks');
	}

	value.forEach((block, index) => validateBlock(block, `${path}[${index}]`));
}

/**
 * Checks one block against its schema.
 */
function validateBlock (value: unknown, path: string): void {
	const block = expectObject(value, path);
	const op = block['op'];

	if (typeof op !== 'string' || !Object.hasOwn(BLOCK_SCHEMAS, op)) {
		fail(`${path}.op`, `unknown block ${JSON.stringify(op)}`);
	}

	const schema: BlockSchema = BLOCK_SCHEMAS[op as keyof typeof BLOCK_SCHEMAS];
	expectOnlyKeys(block, [ 'op', ...Object.keys(schema) ], path);

	for (const [ name, field ] of Object.entries(schema)) {
		const fieldValue = block[name];

		if (fieldValue === undefined) {
			if (!field.optional) {
				fail(`${path}.${name}`, 'is required');
			}
			continue;
		}

		validateField(field.kind, fieldValue, `${path}.${name}`);
	}

	if (op === 'drawBitmap' && (block['pixels'] as unknown[]).length !== (block['width'] as number) * (block['height'] as number)) {
		fail(`${path}.pixels`, 'must have width * height colors');
	}
}

/**
 * Checks the value of one field.
 */
function validateField (kind: FieldKind, value: unknown, path: string): void {
	switch (kind) {
		case 'text':
			if (typeof value !== 'string' || value.length === 0) {
				fail(path, 'must be a non-empty text');
			}
			return;
		case 'face':
			if (typeof value !== 'string' || !Object.hasOwn(FACE_BY_NAME, value)) {
				fail(path, `must be one of ${Object.keys(FACE_BY_NAME).join(', ')}`);
			}
			return;
		case 'heading':
			if (typeof value !== 'string' || !Object.hasOwn(HEADING_BY_NAME, value)) {
				fail(path, `must be one of ${Object.keys(HEADING_BY_NAME).join(', ')}`);
			}
			return;
		case 'step':
			if (!STEP_NAMES.includes(value as string)) {
				fail(path, `must be one of ${STEP_NAMES.join(', ')}`);
			}
			return;
		case 'color':
			if (!isColorValue(value)) {
				fail(path, 'must be a color written as #rrggbb');
			}
			return;
		case 'integer':
			if (!Number.isInteger(value)) {
				fail(path, 'must be a whole number');
			}
			return;
		case 'count':
			if (!isCount(value)) {
				fail(path, 'must be a whole number, zero or more');
			}
			return;
		case 'seconds':
			if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
				fail(path, 'must be a number of seconds, zero or more');
			}
			return;
		case 'colors':
			if (!Array.isArray(value) || !value.every(isColorValue)) {
				fail(path, 'must be a list of colors written as #rrggbb');
			}
			return;
		case 'blocks':
			validateBlocks(value, path);
			return;
	}
}

/**
 * Tells whether a value is a whole number, zero or more.
 */
function isCount (value: unknown): boolean {
	return Number.isInteger(value) && (value as number) >= 0;
}

/**
 * Requires a plain object (not null, not a list).
 */
function expectObject (value: unknown, path: string): Fields {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		fail(path, 'must be an object');
	}

	return value as Fields;
}

/**
 * Rejects fields that are not in the allowed list.
 */
function expectOnlyKeys (fields: Fields, allowed: string[], path: string): void {
	for (const key of Object.keys(fields)) {
		if (!allowed.includes(key)) {
			fail(`${path}.${key}`, `unknown field (allowed: ${allowed.join(', ')})`);
		}
	}
}

/**
 * Reports a problem found at a place of the program.
 */
function fail (path: string, message: string): never {
	throw new ProgramError(`${path}: ${message}`);
}
