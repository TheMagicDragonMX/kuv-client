import { Block } from '../blocks';
import { World } from '../world/world';
import { Pause, runBlocks } from './interpreter';

const ball: Block = { op: 'create', name: 'ball', face: 'FRONT', x: 0, y: 0, color: '#ffffff' };

const right: Block = { op: 'move', target: 'ball', step: 'right' };

/**
 * Runs blocks, collecting every pause until the script finishes or `limit` pauses happened.
 */
function pauses (blocks: Block[], world = new World(), limit = 20): Pause[] {
	const run = runBlocks(blocks, world);
	const collected: Pause[] = [];

	for (let i = 0; i < limit; i += 1) {
		const result = run.next();
		if (result.done) {
			break;
		}
		collected.push(result.value);
	}

	return collected;
}

describe('runBlocks', () => {
	it('runs commands straight away, without pausing', () => {
		const world = new World();

		const result = pauses([ ball, right, right ], world);

		expect(result).toEqual([]);
		expect(world.get('ball').pose.x).toBe(2);
	});

	it('pauses on a wait and continues from there', () => {
		const world = new World();
		const run = runBlocks([ ball, { op: 'wait', seconds: 0.5 }, right ], world);

		expect(run.next().value).toEqual({ kind: 'wait', milliseconds: 500 });
		expect(world.get('ball').pose.x).toBe(0);

		expect(run.next().done).toBe(true);
		expect(world.get('ball').pose.x).toBe(1);
	});

	it('repeats a body and gives a turn after every iteration that did not pause itself', () => {
		const world = new World();

		const result = pauses([ ball, { op: 'repeat', times: 3, body: [ right ] } ], world);

		expect(result).toEqual([ { kind: 'tick' }, { kind: 'tick' }, { kind: 'tick' } ]);
		expect(world.get('ball').pose.x).toBe(3);
	});

	it('does not add a pause when the iteration already waited', () => {
		const result = pauses([ ball, { op: 'repeat', times: 2, body: [ right, { op: 'wait', seconds: 1 } ] } ]);

		expect(result).toEqual([ { kind: 'wait', milliseconds: 1000 }, { kind: 'wait', milliseconds: 1000 } ]);
	});

	it('repeats zero times without running the body', () => {
		const world = new World();

		pauses([ ball, { op: 'repeat', times: 0, body: [ right ] } ], world);

		expect(world.get('ball').pose.x).toBe(0);
	});

	it('never blocks: a forever loop with an empty body still pauses', () => {
		const result = pauses([ { op: 'forever', body: [] } ], new World(), 5);

		expect(result).toHaveLength(5);
		expect(result.every((pause) => pause.kind === 'tick')).toBe(true);
	});

	it('runs a forever loop one iteration per pause', () => {
		const world = new World();
		const run = runBlocks([ ball, { op: 'forever', body: [ right ] } ], world);

		run.next();
		run.next();
		run.next();

		expect(world.get('ball').pose.x).toBe(3);
	});

	it('handles loops inside loops', () => {
		const world = new World();
		const inner: Block = { op: 'repeat', times: 2, body: [ right ] };

		pauses([ ball, { op: 'repeat', times: 3, body: [ inner ] } ], world);

		expect(world.get('ball').pose.x).toBe(6);
	});

	it('lets the error of a command reach the caller', () => {
		const run = runBlocks([ { op: 'hide', target: 'ghost' } ], new World());

		expect(() => run.next()).toThrow('There is no object called "ghost"');
	});
});
