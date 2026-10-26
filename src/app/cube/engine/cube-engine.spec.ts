import { EngineError, ProgramError } from '../errors';
import { Environment } from '../environment/environment';
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

	describe('environment', () => {
		/**
		 * A picture of one color for a whole face.
		 */
		function solid (color: number): Uint32Array {
			return new Uint32Array(64 * 64).fill(color);
		}

		it('shows the pictures at once, with nothing running', () => {
			const engine = new CubeEngine();

			engine.setEnvironment({ background: { LEFT: solid(0x112233) } });

			expect(engine.state.get(Face.LEFT, 10, 10)).toBe(0x112233);
			expect(engine.state.get(Face.FRONT, 10, 10)).toBe(0);
		});

		it('stays under the objects of a program, and through runs and resets', () => {
			const engine = new CubeEngine();
			engine.setEnvironment({ background: { FRONT: solid(0x00ff00) } });
			engine.load(script({ op: 'create', name: 'a', face: 'FRONT', x: 5, y: 5, color: '#ff0000' }));

			engine.start(0);
			expect(engine.state.get(Face.FRONT, 5, 5)).toBe(0xff0000);
			expect(engine.state.get(Face.FRONT, 6, 5)).toBe(0x00ff00);

			engine.reset();
			expect(engine.state.get(Face.FRONT, 5, 5)).toBe(0x00ff00);
		});

		it('does not restart a running program when it changes', () => {
			const engine = new CubeEngine();
			engine.load({ version: 1, scripts: [ { trigger: { type: 'start' }, blocks: [
				{ op: 'create', name: 'a', face: 'FRONT', x: 5, y: 5, color: '#ff0000' },
				{ op: 'forever', body: [ { op: 'wait', seconds: 1 } ] },
			] } ] });
			engine.start(0);

			engine.setEnvironment({ background: { FRONT: solid(0x0000ff) } });

			expect(engine.running).toBe(true);
			expect(engine.state.get(Face.FRONT, 5, 5)).toBe(0xff0000);
			expect(engine.state.get(Face.FRONT, 6, 5)).toBe(0x0000ff);
		});

		it('blanks a face when its picture is removed, and leaves the others', () => {
			const engine = new CubeEngine();
			const both: Environment = { background: { FRONT: solid(1), RIGHT: solid(2) } };
			engine.setEnvironment(both);

			engine.setEnvironment({ background: { RIGHT: solid(2) } });

			expect(engine.state.get(Face.FRONT, 0, 0)).toBe(0);
			expect(engine.state.get(Face.RIGHT, 0, 0)).toBe(2);

			engine.setEnvironment(undefined);
			expect(engine.state.get(Face.RIGHT, 0, 0)).toBe(0);
		});

		it('can be painted over by a program', () => {
			const engine = new CubeEngine();
			engine.setEnvironment({ background: { TOP: solid(0x00ff00) } });
			engine.load(script({ op: 'clearBackground', color: '#000011' }));

			engine.start(0);

			expect(engine.state.get(Face.TOP, 0, 0)).toBe(0x000011);
		});

		describe('videos', () => {
			/**
			 * A video of one flat color per frame, shown 10 times a second.
			 */
			function video (...colors: number[]): Environment {
				return { background: { FRONT: { fps: 10, frames: colors.map(solid) } } };
			}

			it('shows the first frame at once and plays the rest as time passes', () => {
				const engine = new CubeEngine();
				engine.setEnvironment(video(1, 2, 3), 1000);
				expect(engine.state.get(Face.FRONT, 0, 0)).toBe(1);

				engine.tick(1100);
				expect(engine.state.get(Face.FRONT, 0, 0)).toBe(2);

				engine.tick(1250);
				expect(engine.state.get(Face.FRONT, 0, 0)).toBe(3);
			});

			it('starts over when it ends', () => {
				const engine = new CubeEngine();
				engine.setEnvironment(video(1, 2, 3), 0);

				engine.tick(300);
				expect(engine.state.get(Face.FRONT, 0, 0)).toBe(1);

				engine.tick(450);
				expect(engine.state.get(Face.FRONT, 0, 0)).toBe(2);
			});

			it('says it is animated only while a video with several frames is there', () => {
				const engine = new CubeEngine();
				expect(engine.animated).toBe(false);

				engine.setEnvironment(video(1, 2));
				expect(engine.animated).toBe(true);

				engine.setEnvironment(video(1));
				expect(engine.animated).toBe(false);

				engine.setEnvironment({ background: { FRONT: solid(1) } });
				expect(engine.animated).toBe(false);
			});

			it('only touches the world when the frame changes', () => {
				const engine = new CubeEngine();
				engine.setEnvironment(video(1, 2), 0);
				engine.tick(10);
				const version = engine.state.version;

				engine.tick(50);
				engine.tick(90);

				expect(engine.state.version).toBe(version);
			});

			it('keeps playing from where it was when a program starts and when the cube is reset', () => {
				const engine = new CubeEngine();
				engine.setEnvironment(video(1, 2, 3), 0);
				engine.tick(150);
				engine.load(script({ op: 'create', name: 'a', face: 'FRONT', x: 5, y: 5, color: '#ff0000' }));

				engine.start(170);
				expect(engine.state.get(Face.FRONT, 0, 0)).toBe(2);
				expect(engine.state.get(Face.FRONT, 5, 5)).toBe(0xff0000);

				engine.reset();
				expect(engine.state.get(Face.FRONT, 0, 0)).toBe(2);
				expect(engine.state.get(Face.FRONT, 5, 5)).toBe(2);
			});

			it('blanks the face when the video is removed', () => {
				const engine = new CubeEngine();
				engine.setEnvironment(video(7, 8), 0);

				engine.setEnvironment(undefined, 10);

				expect(engine.state.get(Face.FRONT, 0, 0)).toBe(0);
			});

			it('rejects a video with no frames, a bad speed or a frame of the wrong size', () => {
				const engine = new CubeEngine();

				expect(() => engine.setEnvironment({ background: { FRONT: { fps: 10, frames: [] } } })).toThrow(EngineError);
				expect(() => engine.setEnvironment({ background: { FRONT: { fps: 0, frames: [ solid(1) ] } } })).toThrow(EngineError);
				expect(() => engine.setEnvironment({ background: { FRONT: { fps: 10, frames: [ solid(1), new Uint32Array(5) ] } } })).toThrow(EngineError);
			});
		});

		it('rejects a picture that is not the size of a face, painting nothing', () => {
			const engine = new CubeEngine();

			expect(() => engine.setEnvironment({ background: { FRONT: solid(1), LEFT: new Uint32Array(10) } })).toThrow(EngineError);
			expect(engine.state.get(Face.FRONT, 0, 0)).toBe(0);
		});
	});
});
