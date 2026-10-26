import { ProgramError } from '../errors';
import { EXAMPLE_PROGRAMS } from '../examples/example-programs';
import { validateProgram } from './validate-program';

/**
 * A minimal valid program with the given blocks in its only script.
 */
function program (...blocks: unknown[]): unknown {
	return { version: 1, scripts: [ { trigger: { type: 'start' }, blocks } ] };
}

describe('validateProgram', () => {
	it('accepts the example programs', () => {
		for (const example of EXAMPLE_PROGRAMS) {
			expect(() => validateProgram(example.program), example.id).not.toThrow();
		}
	});

	it('accepts a program without scripts', () => {
		expect(() => validateProgram({ version: 1, scripts: [] })).not.toThrow();
	});

	it('returns the program it was given', () => {
		const value = program();

		expect(validateProgram(value)).toBe(value);
	});

	it.each([
		[ 'something that is not an object', 'nope', 'program: must be an object' ],
		[ 'a list', [], 'program: must be an object' ],
		[ 'a wrong version', { version: 2, scripts: [] }, 'version: must be 1' ],
		[ 'missing scripts', { version: 1 }, 'scripts: must be a list of scripts' ],
		[ 'an unknown field', { version: 1, scripts: [], extra: 1 }, 'program.extra: unknown field' ],
	])('rejects %s', (_name, value, message) => {
		expect(() => validateProgram(value)).toThrow(ProgramError);
		expect(() => validateProgram(value)).toThrow(message);
	});

	describe('config', () => {
		it('accepts a side as top anchor and a floor', () => {
			expect(() => validateProgram({ version: 1, config: { topAnchor: 'LEFT', floor: 70 }, scripts: [] }))
				.not.toThrow();
		});

		it('rejects the top face as anchor', () => {
			expect(() => validateProgram({ version: 1, config: { topAnchor: 'TOP' }, scripts: [] }))
				.toThrow('config.topAnchor');
		});

		it('rejects a floor that is not a row', () => {
			expect(() => validateProgram({ version: 1, config: { floor: -1 }, scripts: [] })).toThrow('config.floor');
		});
	});

	describe('triggers', () => {
		it('accepts start and every', () => {
			expect(() => validateProgram({
				version: 1,
				scripts: [
					{ trigger: { type: 'start' }, blocks: [] },
					{ trigger: { type: 'every', seconds: 2 }, blocks: [] },
				],
			})).not.toThrow();
		});

		it('rejects unknown triggers and intervals that are not positive', () => {
			expect(() => validateProgram({ version: 1, scripts: [ { trigger: { type: 'key' }, blocks: [] } ] }))
				.toThrow('scripts[0].trigger.type');
			expect(() => validateProgram({ version: 1, scripts: [ { trigger: { type: 'every', seconds: 0 }, blocks: [] } ] }))
				.toThrow('scripts[0].trigger.seconds');
		});
	});

	describe('blocks', () => {
		it('says where the problem is', () => {
			const value = program(
				{ op: 'create', name: 'a', face: 'FRONT', x: 0, y: 0, color: '#ffffff' },
				{ op: 'move', target: 'a', step: 'up', count: -1 },
			);

			expect(() => validateProgram(value)).toThrow('scripts[0].blocks[1].count: must be a whole number');
		});

		it('rejects unknown blocks', () => {
			expect(() => validateProgram(program({ op: 'jump' }))).toThrow('unknown block "jump"');
		});

		it('rejects typos in field names', () => {
			expect(() => validateProgram(program({ op: 'move', target: 'a', step: 'up', cont: 2 })))
				.toThrow('scripts[0].blocks[0].cont: unknown field');
		});

		it('requires the fields that are not optional', () => {
			expect(() => validateProgram(program({ op: 'move', step: 'up' })))
				.toThrow('scripts[0].blocks[0].target: is required');
		});

		it.each([
			[ 'a face', { op: 'moveTo', target: 'a', face: 'MIDDLE', x: 0, y: 0 } ],
			[ 'a heading', { op: 'create', name: 'a', face: 'FRONT', x: 0, y: 0, color: '#000000', heading: 'UP' } ],
			[ 'a step', { op: 'move', target: 'a', step: 'forward' } ],
			[ 'a color', { op: 'setColor', target: 'a', color: 'red' } ],
			[ 'a cell', { op: 'moveTo', target: 'a', face: 'FRONT', x: 1.5, y: 0 } ],
			[ 'a wait time', { op: 'wait', seconds: -1 } ],
			[ 'an empty name', { op: 'show', target: '' } ],
		])('rejects %s that is not valid', (_name, block) => {
			expect(() => validateProgram(program(block))).toThrow(ProgramError);
		});

		it('allows cells outside a face, so shapes can overflow', () => {
			expect(() => validateProgram(program({ op: 'moveTo', target: 'a', face: 'FRONT', x: -3, y: 100 })))
				.not.toThrow();
		});

		it('accepts an object with a shape', () => {
			const create = { op: 'create', name: 'a', face: 'FRONT', x: 5, y: 5, color: '#ffffff' };

			expect(() => validateProgram(program({ ...create, pixels: [ { dx: 0, dy: -1 }, { dx: 1, dy: 0, color: '#ff0000' } ] })))
				.not.toThrow();
		});

		it.each([
			[ 'an empty shape', [] ],
			[ 'a pixel without dy', [ { dx: 1 } ] ],
			[ 'a pixel with a fractional offset', [ { dx: 0.5, dy: 0 } ] ],
			[ 'a pixel with a bad color', [ { dx: 0, dy: 0, color: 'red' } ] ],
			[ 'a pixel with an unknown field', [ { dx: 0, dy: 0, z: 1 } ] ],
			[ 'a shape that is not a list', { dx: 0, dy: 0 } ],
		])('rejects %s', (_name, pixels) => {
			const create = { op: 'create', name: 'a', face: 'FRONT', x: 5, y: 5, color: '#ffffff', pixels };

			expect(() => validateProgram(program(create))).toThrow(ProgramError);
		});

		it('checks the blocks nested in loops', () => {
			const value = program({ op: 'forever', body: [ { op: 'repeat', times: 2, body: [ { op: 'wait', seconds: 'x' } ] } ] });

			expect(() => validateProgram(value)).toThrow('scripts[0].blocks[0].body[0].body[0].seconds');
		});


	describe('background blocks', () => {
		const pixels = new Array<string>(64 * 64).fill('#000000');

		it('accepts a picture for some faces', () => {
			expect(() => validateProgram(program({ op: 'setBackgroundImage', faces: [ 'FRONT', 'TOP' ], pixels }))).not.toThrow();
			expect(() => validateProgram(program({ op: 'setBackgroundColor', faces: [ 'LEFT' ], color: '#ff00ff' }))).not.toThrow();
		});

		it.each([
			[ 'no faces', { op: 'setBackgroundColor', faces: [], color: '#000000' }, 'faces' ],
			[ 'a face that does not exist', { op: 'setBackgroundColor', faces: [ 'MIDDLE' ], color: '#000000' }, 'faces' ],
			[ 'faces that are not a list', { op: 'setBackgroundColor', faces: 'FRONT', color: '#000000' }, 'faces' ],
			[ 'a picture with too few colors', { op: 'setBackgroundImage', faces: [ 'FRONT' ], pixels: pixels.slice(1) }, 'pixels' ],
			[ 'a picture with a bad color', { op: 'setBackgroundImage', faces: [ 'FRONT' ], pixels: [ ...pixels.slice(1), 'red' ] }, 'pixels' ],
		])('rejects %s', (_name, block, field) => {
			expect(() => validateProgram(program(block))).toThrow(`scripts[0].blocks[0].${field}`);
		});
	});
	});
});
