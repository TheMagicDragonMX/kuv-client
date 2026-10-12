import { ProgramError } from '../errors';
import { Face } from '../state/cube-state';
import { CubePlayer } from './cube-player';

const mover = {
	version: 1,
	scripts: [
		{
			trigger: { type: 'start' },
			blocks: [
				{ op: 'create', name: 'a', face: 'FRONT', x: 0, y: 0, color: '#ffffff' },
				{ op: 'forever', body: [ { op: 'move', target: 'a', step: 'right' }, { op: 'wait', seconds: 0.1 } ] },
			],
		},
	],
};

describe('CubePlayer', () => {
	let time: number;

	beforeEach(() => {
		vi.useFakeTimers();
		time = 0;
	});

	afterEach(() => vi.useRealTimers());

	/**
	 * Lets some milliseconds pass, for the timer and for the clock the player reads.
	 */
	function advance (milliseconds: number): void {
		for (let elapsed = 0; elapsed < milliseconds; elapsed += 10) {
			time += 10;
			vi.advanceTimersByTime(10);
		}
	}

	it('runs a program on its own as time passes', () => {
		const player = new CubePlayer({ tickRate: 100, clock: () => time });

		player.play(mover);
		expect(player.state.get(Face.FRONT, 1, 0)).toBe(0xffffff);

		advance(300);
		expect(player.state.get(Face.FRONT, 4, 0)).toBe(0xffffff);

		player.dispose();
	});

	it('tells when it starts and stops running', () => {
		const changes: boolean[] = [];
		const player = new CubePlayer({ tickRate: 100, clock: () => time, onRunningChange: (running) => changes.push(running) });

		player.play(mover);
		player.stop();

		expect(changes).toEqual([ true, false ]);
	});

	it('stops its timer by itself when the program is over', () => {
		const changes: boolean[] = [];
		const player = new CubePlayer({ tickRate: 100, clock: () => time, onRunningChange: (running) => changes.push(running) });

		player.play({ version: 1, scripts: [ { trigger: { type: 'start' }, blocks: [ { op: 'wait', seconds: 0.05 } ] } ] });
		expect(changes).toEqual([ true ]);

		advance(100);

		expect(changes).toEqual([ true, false ]);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('keeps the picture on stop and blanks it on reset', () => {
		const player = new CubePlayer({ tickRate: 100, clock: () => time });
		player.play(mover);

		player.stop();
		advance(200);
		expect(player.state.get(Face.FRONT, 1, 0)).toBe(0xffffff);

		player.reset();
		expect(player.state.get(Face.FRONT, 1, 0)).toBe(0);
	});

	it('refuses an invalid program without disturbing the one that is running', () => {
		const player = new CubePlayer({ tickRate: 100, clock: () => time });
		player.play(mover);

		expect(() => player.play({ nope: true })).toThrow(ProgramError);
		expect(player.running).toBe(true);

		player.dispose();
	});

	it('stops ticking when disposed', () => {
		const player = new CubePlayer({ tickRate: 100, clock: () => time });
		player.play(mover);

		player.dispose();

		expect(vi.getTimerCount()).toBe(0);
	});
});
