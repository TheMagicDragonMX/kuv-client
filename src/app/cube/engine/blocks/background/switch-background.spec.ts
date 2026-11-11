import { CubeEngine } from '../../engine/cube-engine';
import { Environment } from '../../environment/environment';
import { validateProgram } from '../../program/validate-program';
import { Program } from '../../program/program';
import { Face } from '../../state/cube-state';

/**
 * A picture of one color for a whole face.
 */
function solid (color: number): Uint32Array {
	return new Uint32Array(64 * 64).fill(color);
}

/**
 * Three backgrounds: a red front, a green front with a blue top, and one with no pictures.
 */
const ENVIRONMENT: Environment = {
	background: { FRONT: solid(0xff0000) },
	backgrounds: [
		{ name: 'day', images: { FRONT: solid(0xff0000) } },
		{ name: 'night', images: { FRONT: solid(0x00ff00), TOP: solid(0x0000ff) } },
		{ name: 'dark', images: {} },
	],
	startBackground: 'day',
};

/**
 * A program that runs these blocks, one second apart.
 */
function program (...blocks: Program['scripts'][number]['blocks']): Program {
	return {
		version: 1,
		scripts: [ { trigger: { type: 'start' }, blocks: blocks.flatMap((block) => [ block, { op: 'wait', seconds: 1 } as const ]) } ],
	};
}

/**
 * An engine with the backgrounds, running a program.
 */
function run (code: Program) {
	const errors: string[] = [];
	const engine = new CubeEngine({ onError: (error) => errors.push(error.message) });
	engine.setEnvironment(ENVIRONMENT);
	engine.load(validateProgram(code));
	engine.start(0);

	return { engine, errors };
}

describe('setBackground', () => {
	it('switches to a background by its name, and faces it has no picture for keep what they show', () => {
		const { engine } = run(program({ op: 'setBackground', name: 'night' }, { op: 'setBackground', name: 'day' }));

		expect(engine.state.get(Face.FRONT, 5, 5)).toBe(0x00ff00);
		expect(engine.state.get(Face.TOP, 5, 5)).toBe(0x0000ff);

		engine.tick(1000);

		expect(engine.state.get(Face.FRONT, 5, 5)).toBe(0xff0000);
		expect(engine.state.get(Face.TOP, 5, 5)).toBe(0x0000ff);
	});

	it('stops the script with an error when there is no background with that name', () => {
		const { errors } = run(program({ op: 'setBackground', name: 'sunset' }));

		expect(errors.join()).toContain('There is no background called "sunset"');
	});

	it('goes back to the background the program starts with after a reset', () => {
		const { engine } = run(program({ op: 'setBackground', name: 'night' }));

		engine.reset();

		expect(engine.state.get(Face.FRONT, 5, 5)).toBe(0xff0000);
	});
});

describe('nextBackground', () => {
	it('goes through the backgrounds in order from the one it starts with, and back to the first', () => {
		const { engine } = run(program({ op: 'nextBackground' }, { op: 'nextBackground' }, { op: 'nextBackground' }));

		expect(engine.state.get(Face.FRONT, 5, 5)).toBe(0x00ff00);

		engine.tick(1000);
		expect(engine.state.get(Face.FRONT, 5, 5)).toBe(0x00ff00);
		expect(engine.state.get(Face.TOP, 5, 5)).toBe(0x0000ff);

		engine.tick(2000);
		expect(engine.state.get(Face.FRONT, 5, 5)).toBe(0xff0000);
	});

	it('stops the script with an error when there are no backgrounds', () => {
		const errors: string[] = [];
		const engine = new CubeEngine({ onError: (error) => errors.push(error.message) });
		engine.load(program({ op: 'nextBackground' }));
		engine.start(0);

		expect(errors.join()).toContain('There are no backgrounds');
	});
});

describe('the backgrounds of the environment', () => {
	it('must have names that are not repeated and pictures the size of a face', () => {
		const engine = new CubeEngine();

		expect(() => engine.setEnvironment({ backgrounds: [ { name: 'a', images: {} }, { name: 'a', images: {} } ] })).toThrow('same name');
		expect(() => engine.setEnvironment({ backgrounds: [ { name: 'a', images: { FRONT: new Uint32Array(3) } } ] })).toThrow('4096');
	});

	it('are blocks a program can have', () => {
		expect(() => validateProgram(program({ op: 'setBackground', name: 'day' }, { op: 'nextBackground' }))).not.toThrow();
		expect(() => validateProgram(program({ op: 'setBackground', name: '' } as never))).toThrow();
		expect(() => validateProgram(program({ op: 'nextBackground', name: 'day' } as never))).toThrow();
	});
});
