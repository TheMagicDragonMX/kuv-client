import { ProgramError } from '../errors';
import { EXAMPLE_PROGRAMS } from '../examples/example-programs';
import { Program } from '../program/program';
import { ScriptError } from '../runtime/scheduler';
import { Face } from '../state/cube-state';
import { CubeEngine } from './cube-engine';

/**
 * A program with one script that starts at once.
 */
function script (...blocks: Program['scripts'][number]['blocks']): Program {
	return { version: 1, scripts: [ { trigger: { type: 'start' }, blocks } ] };
}

describe('CubeEngine', () => {
	it('shows a blank cube before anything runs', () => {
		expect(new CubeEngine().state.get(Face.FRONT, 0, 0)).toBe(0);
	});

	it('runs a program and shows the result in its state', () => {
		const engine = new CubeEngine();
		engine.load(script({ op: 'create', name: 'a', face: 'LEFT', x: 5, y: 6, color: '#ff8800' }));

		engine.start(0);

		expect(engine.state.get(Face.LEFT, 5, 6)).toBe(0xff8800);
	});

	it('follows an object over the top face to the opposite side', () => {
		const engine = new CubeEngine();
		engine.load(script(
			{ op: 'create', name: 'a', face: 'FRONT', x: 32, y: 30, color: '#ff0000' },
			{ op: 'move', target: 'a', step: 'up', count: 31 },
		));

		engine.start(0);
		expect(engine.state.get(Face.TOP, 32, 63)).toBe(0xff0000);

		engine.load(script(
			{ op: 'create', name: 'a', face: 'FRONT', x: 32, y: 30, color: '#ff0000' },
			{ op: 'move', target: 'a', step: 'up', count: 95 },
			{ op: 'move', target: 'a', step: 'right' },
		));
		engine.start(0);

		// Over the top it arrives on BACK at column 31, and "right" now goes towards the left.
		expect(engine.state.get(Face.BACK, 30, 0)).toBe(0xff0000);
	});

	it('animates over time, a step per wait', () => {
		const engine = new CubeEngine();
		engine.load(script(
			{ op: 'create', name: 'a', face: 'FRONT', x: 0, y: 0, color: '#ffffff' },
			{ op: 'forever', body: [ { op: 'move', target: 'a', step: 'right' }, { op: 'wait', seconds: 0.1 } ] },
		));

		engine.start(0);
		expect(engine.state.get(Face.FRONT, 1, 0)).toBe(0xffffff);

		engine.tick(50);
		expect(engine.state.get(Face.FRONT, 2, 0)).toBe(0);

		engine.tick(100);
		expect(engine.state.get(Face.FRONT, 1, 0)).toBe(0);
		expect(engine.state.get(Face.FRONT, 2, 0)).toBe(0xffffff);
	});

	it('keeps what the background painted under the objects', () => {
		const engine = new CubeEngine();
		engine.load(script(
			{ op: 'fillRect', face: 'FRONT', x: 0, y: 0, width: 64, height: 64, color: '#222222' },
			{ op: 'create', name: 'a', face: 'FRONT', x: 3, y: 3, color: '#ffffff' },
		));

		engine.start(0);

		expect(engine.state.get(Face.FRONT, 10, 10)).toBe(0x222222);
		expect(engine.state.get(Face.FRONT, 3, 3)).toBe(0xffffff);
	});

	it('knows whether it is running', () => {
		const engine = new CubeEngine();
		engine.load(script({ op: 'wait', seconds: 1 }));
		expect(engine.running).toBe(false);

		engine.start(0);
		expect(engine.running).toBe(true);

		engine.tick(1000);
		expect(engine.running).toBe(false);
	});

	it('starts from a clean cube every time', () => {
		const engine = new CubeEngine();
		engine.load(script(
			{ op: 'create', name: 'a', face: 'FRONT', x: 0, y: 0, color: '#ffffff' },
			{ op: 'move', target: 'a', step: 'right', count: 5 },
		));

		engine.start(0);
		engine.start(100);

		expect(engine.state.get(Face.FRONT, 5, 0)).toBe(0xffffff);
		expect(engine.state.get(Face.FRONT, 0, 0)).toBe(0);
	});

	it('stops the scripts but keeps the picture', () => {
		const engine = new CubeEngine();
		engine.load(script(
			{ op: 'create', name: 'a', face: 'FRONT', x: 0, y: 0, color: '#ffffff' },
			{ op: 'forever', body: [ { op: 'move', target: 'a', step: 'right' } ] },
		));
		engine.start(0);

		engine.stop();
		engine.tick(33);

		expect(engine.running).toBe(false);
		expect(engine.state.get(Face.FRONT, 1, 0)).toBe(0xffffff);
	});

	it('blanks the cube on reset', () => {
		const engine = new CubeEngine();
		engine.load(script({ op: 'create', name: 'a', face: 'FRONT', x: 0, y: 0, color: '#ffffff' }));
		engine.start(0);

		engine.reset();

		expect(engine.state.get(Face.FRONT, 0, 0)).toBe(0);
	});

	it('refuses an invalid program and stays as it was', () => {
		const engine = new CubeEngine();
		engine.load(script({ op: 'create', name: 'a', face: 'FRONT', x: 2, y: 2, color: '#ffffff' }));
		engine.start(0);

		expect(() => engine.load({ version: 1, scripts: 7 })).toThrow(ProgramError);
		expect(engine.state.get(Face.FRONT, 2, 2)).toBe(0xffffff);
	});

	it('reports a script that fails and keeps the others going', () => {
		const errors: ScriptError[] = [];
		const engine = new CubeEngine({ onError: (error) => errors.push(error) });
		engine.load({
			version: 1,
			scripts: [
				{ trigger: { type: 'start' }, blocks: [ { op: 'show', target: 'ghost' } ] },
				{ trigger: { type: 'start' }, blocks: [ { op: 'create', name: 'a', face: 'FRONT', x: 1, y: 1, color: '#ffffff' } ] },
			],
		});

		engine.start(0);

		expect(errors).toHaveLength(1);
		expect(errors[0].script).toBe(0);
		expect(engine.state.get(Face.FRONT, 1, 1)).toBe(0xffffff);
	});

	describe('configuration', () => {
		const onTop = script({ op: 'create', name: 'a', face: 'TOP', x: 32, y: 63, color: '#ffffff' });

		it('addresses the top face with FRONT at the bottom by default', () => {
			const engine = new CubeEngine();
			engine.load(onTop);
			engine.start(0);

			expect(engine.state.get(Face.TOP, 32, 63)).toBe(0xffffff);
		});

		it('takes the top anchor from the program', () => {
			const engine = new CubeEngine();
			engine.load({ ...onTop, config: { topAnchor: 'LEFT' } });
			engine.start(0);

			// The bottom edge of the addressed top face is the one that touches LEFT.
			expect(engine.state.get(Face.TOP, 0, 32)).toBe(0xffffff);
		});

		it('uses the engine defaults when the program sets nothing', () => {
			const engine = new CubeEngine({ defaults: { topAnchor: 'LEFT' } });
			engine.load(onTop);
			engine.start(0);

			expect(engine.state.get(Face.TOP, 0, 32)).toBe(0xffffff);
		});

		it('lets the program win over the defaults, and defaults change later', () => {
			const engine = new CubeEngine({ defaults: { topAnchor: 'LEFT' } });
			engine.load({ ...onTop, config: { topAnchor: 'FRONT' } });
			engine.start(0);
			expect(engine.state.get(Face.TOP, 32, 63)).toBe(0xffffff);

			engine.load(onTop);
			engine.setDefaults({ topAnchor: 'BACK' });
			engine.start(0);
			expect(engine.state.get(Face.TOP, 31, 0)).toBe(0xffffff);
		});

		it('takes the floor from the program', () => {
			const engine = new CubeEngine();
			engine.load({
				...script(
					{ op: 'create', name: 'a', face: 'FRONT', x: 0, y: 60, color: '#ffffff' },
					{ op: 'move', target: 'a', step: 'down', count: 10 },
				),
				config: { floor: 61 },
			});

			engine.start(0);

			expect(engine.state.get(Face.FRONT, 0, 61)).toBe(0xffffff);
		});
	});

	it('runs every example program without errors', () => {
		for (const example of EXAMPLE_PROGRAMS) {
			const errors: ScriptError[] = [];
			const engine = new CubeEngine({ onError: (error) => errors.push(error) });
			engine.load(example.program);
			engine.start(0);

			for (let now = 33; now <= 10000; now += 33) {
				engine.tick(now);
			}

			expect(errors, example.id).toEqual([]);
		}
	});
});
