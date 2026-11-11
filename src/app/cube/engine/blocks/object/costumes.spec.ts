import { CubeEngine } from '../../engine/cube-engine';
import { Program } from '../../program/program';
import { validateProgram } from '../../program/validate-program';
import { Face } from '../../state/cube-state';
import { CreateCommand } from './create';

/**
 * A bird with two costumes: wings up (a red dot above it) and wings down (a green dot below it).
 */
const BIRD: CreateCommand = {
	op: 'create',
	name: 'bird',
	face: 'FRONT',
	x: 10,
	y: 10,
	color: '#ff0000',
	pixels: [ { dx: 0, dy: 0 }, { dx: 0, dy: -1 } ],
	costumes: [
		{ name: 'up', color: '#ff0000', pixels: [ { dx: 0, dy: 0 }, { dx: 0, dy: -1 } ] },
		{ name: 'down', color: '#00ff00', pixels: [ { dx: 0, dy: 0 }, { dx: 0, dy: 1 } ] },
	],
};

/**
 * A program with the bird that runs these blocks, one second apart.
 */
function program (...blocks: Program['scripts'][number]['blocks']): Program {
	return {
		version: 1,
		objects: [ BIRD ],
		scripts: [ { trigger: { type: 'start' }, blocks: blocks.flatMap((block) => [ block, { op: 'wait', seconds: 1 } as const ]) } ],
	};
}

/**
 * An engine running a program.
 */
function run (code: Program) {
	const errors: string[] = [];
	const engine = new CubeEngine({ onError: (error) => errors.push(error.message) });
	engine.load(validateProgram(code));
	engine.start(0);

	return { engine, errors };
}

describe('costumes', () => {
	it('start with the first one', () => {
		const { engine } = run(program());

		expect(engine.state.get(Face.FRONT, 10, 9)).toBe(0xff0000);
		expect(engine.state.get(Face.FRONT, 10, 11)).toBe(0);
	});

	it('change the shape and the color of the object by name, keeping its place', () => {
		const { engine } = run(program({ op: 'setCostume', target: 'bird', name: 'down' }));

		expect(engine.state.get(Face.FRONT, 10, 10)).toBe(0x00ff00);
		expect(engine.state.get(Face.FRONT, 10, 11)).toBe(0x00ff00);
		expect(engine.state.get(Face.FRONT, 10, 9)).toBe(0);
	});

	it('go one after another with "next", back to the first after the last', () => {
		const { engine } = run(program({ op: 'nextCostume', target: 'bird' }, { op: 'nextCostume', target: 'bird' }));

		expect(engine.state.get(Face.FRONT, 10, 11)).toBe(0x00ff00);

		engine.tick(1000);

		expect(engine.state.get(Face.FRONT, 10, 9)).toBe(0xff0000);
		expect(engine.state.get(Face.FRONT, 10, 11)).toBe(0);
	});

	it('stop the script with an error for a costume the object does not have', () => {
		const { errors } = run(program({ op: 'setCostume', target: 'bird', name: 'sleeping' }));

		expect(errors.join()).toContain('has no costume called "sleeping"');
	});

	it('leave an object with one look as it is on "next"', () => {
		const { engine, errors } = run({ ...program({ op: 'nextCostume', target: 'bird' }), objects: [ { ...BIRD, costumes: undefined } as CreateCommand ] });

		expect(errors).toEqual([]);
		expect(engine.state.get(Face.FRONT, 10, 9)).toBe(0xff0000);
	});

	it('are checked: a list of looks with names that are not repeated', () => {
		const object = (costumes: unknown) => ({ version: 1, objects: [ { ...BIRD, costumes } ], scripts: [] });

		expect(() => validateProgram(object(BIRD.costumes))).not.toThrow();
		expect(() => validateProgram(object([]))).toThrow('non-empty');
		expect(() => validateProgram(object([ { name: 'a', color: '#ffffff' }, { name: 'a', color: '#000000' } ]))).toThrow('already a costume');
		expect(() => validateProgram(object([ { name: 'a', color: 'red' } ]))).toThrow('color');
		expect(() => validateProgram(object([ { name: 'a', color: '#ffffff', size: 2 } ]))).toThrow('unknown field');
	});
});
