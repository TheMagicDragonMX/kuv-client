import { Script } from '../program/program';
import { World } from '../world/world';
import { Scheduler, ScriptError } from './scheduler';

const ball = { op: 'create', name: 'ball', face: 'FRONT', x: 0, y: 0, color: '#ffffff' } as const;

const right = { op: 'move', target: 'ball', step: 'right' } as const;

/**
 * Builds a scheduler for some scripts, started at time 0.
 */
function setup (scripts: Script[]) {
	const world = new World();
	const errors: ScriptError[] = [];
	const scheduler = new Scheduler(world, scripts, (error) => errors.push(error));
	scheduler.start(0);

	return { world, errors, scheduler, x: () => world.get('ball').pose.x };
}

describe('Scheduler', () => {
	it('does nothing until the first tick', () => {
		const { world, scheduler } = setup([ { trigger: { type: 'start' }, blocks: [ ball ] } ]);

		expect(scheduler.active).toBe(true);
		expect([ ...world.all() ]).toHaveLength(0);
	});

	it('runs a script until it finishes, then is no longer active', () => {
		const { scheduler, x } = setup([ { trigger: { type: 'start' }, blocks: [ ball, right ] } ]);

		scheduler.tick(0);

		expect(x()).toBe(1);
		expect(scheduler.active).toBe(false);
	});

	it('wakes a script when its wait is over, not before', () => {
		const { scheduler, x } = setup([
			{ trigger: { type: 'start' }, blocks: [ ball, { op: 'wait', seconds: 1 }, right ] },
		]);

		scheduler.tick(0);
		scheduler.tick(999);
		expect(x()).toBe(0);

		scheduler.tick(1000);
		expect(x()).toBe(1);
	});

	it('gives a looping script only one turn per tick', () => {
		const { scheduler, x } = setup([
			{ trigger: { type: 'start' }, blocks: [ ball, { op: 'forever', body: [ right ] } ] },
		]);

		scheduler.tick(0);
		scheduler.tick(33);
		scheduler.tick(66);

		expect(x()).toBe(3);
	});

	it('runs several scripts side by side', () => {
		const { world, scheduler } = setup([
			{ trigger: { type: 'start' }, blocks: [ ball, { op: 'forever', body: [ { op: 'move', target: 'ball', step: 'right' } ] } ] },
			{ trigger: { type: 'start' }, blocks: [ { op: 'wait', seconds: 0.001 }, { op: 'forever', body: [ { op: 'move', target: 'ball', step: 'down' } ] } ] },
		]);

		scheduler.tick(0);
		scheduler.tick(33);
		scheduler.tick(66);

		expect(world.get('ball').pose).toMatchObject({ x: 3, y: 2 });
	});

	it('keeps the rhythm of a wait loop instead of drifting by a tick each time', () => {
		const { scheduler, x } = setup([
			{ trigger: { type: 'start' }, blocks: [ ball, { op: 'forever', body: [ right, { op: 'wait', seconds: 0.1 } ] } ] },
		]);

		// Ticks of 33 ms. The script moves at 0, 132, 231 and 330: every 100 ms on average.
		for (let now = 0; now <= 330; now += 33) {
			scheduler.tick(now);
		}

		expect(x()).toBe(4);
	});

	it('does not rush to catch up after a long freeze', () => {
		const { scheduler, x } = setup([
			{ trigger: { type: 'start' }, blocks: [ ball, { op: 'forever', body: [ right, { op: 'wait', seconds: 0.1 } ] } ] },
		]);
		scheduler.tick(0);

		scheduler.tick(60000);

		expect(x()).toBe(2);
	});

	describe('every', () => {
		const every = (seconds: number, blocks: Script['blocks']): Script => ({ trigger: { type: 'every', seconds }, blocks });

		it('runs the script each time the interval passes', () => {
			const { scheduler, x } = setup([
				{ trigger: { type: 'start' }, blocks: [ ball ] },
				every(1, [ right ]),
			]);

			scheduler.tick(0);
			expect(x()).toBe(0);
			scheduler.tick(1000);
			expect(x()).toBe(1);
			scheduler.tick(1500);
			expect(x()).toBe(1);
			scheduler.tick(2000);
			expect(x()).toBe(2);
		});

		it('stays active, waiting for the next interval', () => {
			const { scheduler } = setup([ every(1, []) ]);

			scheduler.tick(0);
			scheduler.tick(1000);

			expect(scheduler.active).toBe(true);
		});

		it('skips a run that is due while the previous one is still going', () => {
			const { scheduler, x } = setup([
				{ trigger: { type: 'start' }, blocks: [ ball ] },
				every(1, [ { op: 'wait', seconds: 2.5 }, right ]),
			]);

			scheduler.tick(0);
			scheduler.tick(1000);
			scheduler.tick(2000);
			scheduler.tick(3000);
			expect(x()).toBe(0);

			scheduler.tick(3500);
			expect(x()).toBe(1);
		});
	});

	describe('errors', () => {
		it('stops only the script that failed and reports it', () => {
			const { errors, scheduler, x } = setup([
				{ trigger: { type: 'start' }, blocks: [ ball, { op: 'forever', body: [ right ] } ] },
				{ trigger: { type: 'start' }, blocks: [ { op: 'hide', target: 'ghost' } ] },
			]);

			scheduler.tick(0);
			scheduler.tick(33);

			expect(errors).toEqual([ { script: 1, message: 'There is no object called "ghost"' } ]);
			expect(x()).toBe(2);
		});
	});

	it('forgets its scripts when stopped', () => {
		const { scheduler, x } = setup([
			{ trigger: { type: 'start' }, blocks: [ ball, { op: 'forever', body: [ right ] } ] },
		]);
		scheduler.tick(0);

		scheduler.stop();
		scheduler.tick(33);

		expect(scheduler.active).toBe(false);
		expect(x()).toBe(1);
	});
});
