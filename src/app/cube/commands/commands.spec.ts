import { EngineError } from '../errors';
import { Heading } from '../geometry/geometry';
import { Command } from '../blocks';
import { World } from '../world/world';
import { applyCommand, isCommand } from './apply-command';

/**
 * A world with one red object called "ball" in the middle of FRONT.
 */
function worldWithBall (config = {}): World {
	const world = new World(config);
	applyCommand(world, { op: 'create', name: 'ball', face: 'FRONT', x: 32, y: 32, color: '#ff0000' });
	return world;
}

describe('object commands', () => {
	it('creates a visible object facing north by default', () => {
		const ball = worldWithBall().get('ball');

		expect(ball).toEqual({
			name: 'ball',
			shape: [ { dx: 0, dy: 0 } ],
			pose: { surface: 'strip', x: 32, y: 32, heading: Heading.NORTH },
			color: 0xff0000,
			visible: true,
		});
	});

	it('creates an object with a chosen heading', () => {
		const world = new World();

		applyCommand(world, { op: 'create', name: 'a', face: 'RIGHT', x: 1, y: 2, color: '#000000', heading: 'EAST' });

		expect(world.get('a').pose).toEqual({ surface: 'strip', x: 65, y: 2, heading: Heading.EAST });
	});

	it('moves relative to the heading', () => {
		const world = worldWithBall();

		applyCommand(world, { op: 'move', target: 'ball', step: 'right', count: 3 });
		applyCommand(world, { op: 'move', target: 'ball', step: 'up' });

		expect(world.get('ball').pose).toMatchObject({ x: 35, y: 31 });
	});

	it('moves across the top face, keeping the way it was going', () => {
		const world = worldWithBall();

		applyCommand(world, { op: 'move', target: 'ball', step: 'up', count: 33 });
		expect(world.get('ball').pose).toMatchObject({ surface: 'top', x: 32, y: 63 });

		applyCommand(world, { op: 'move', target: 'ball', step: 'up', count: 64 });
		expect(world.get('ball').pose).toMatchObject({ surface: 'strip', x: 2 * 64 + 31, y: 0, heading: Heading.SOUTH });
	});

	it('does not touch the world when a move changes nothing', () => {
		const world = worldWithBall();
		applyCommand(world, { op: 'move', target: 'ball', step: 'down', count: 100 });
		const version = world.version;

		applyCommand(world, { op: 'move', target: 'ball', step: 'down' });
		applyCommand(world, { op: 'move', target: 'ball', step: 'up', count: 0 });

		expect(world.version).toBe(version);
	});

	it('moves to a cell of a face and resets the heading', () => {
		const world = worldWithBall();
		applyCommand(world, { op: 'move', target: 'ball', step: 'up', count: 40 });

		applyCommand(world, { op: 'moveTo', target: 'ball', face: 'LEFT', x: 5, y: 6 });

		expect(world.get('ball').pose).toEqual({ surface: 'strip', x: 3 * 64 + 5, y: 6, heading: Heading.NORTH });
	});

	it('rejects a cell outside the face', () => {
		const world = worldWithBall();

		expect(() => applyCommand(world, { op: 'moveTo', target: 'ball', face: 'FRONT', x: 64, y: 0 })).toThrow(RangeError);
	});

	it('changes the color', () => {
		const world = worldWithBall();

		applyCommand(world, { op: 'setColor', target: 'ball', color: '#00ff00' });

		expect(world.get('ball').color).toBe(0x00ff00);
	});

	it('hides and shows', () => {
		const world = worldWithBall();

		applyCommand(world, { op: 'hide', target: 'ball' });
		expect(world.get('ball').visible).toBe(false);

		applyCommand(world, { op: 'show', target: 'ball' });
		expect(world.get('ball').visible).toBe(true);
	});

	it('deletes', () => {
		const world = worldWithBall();

		applyCommand(world, { op: 'delete', target: 'ball' });

		expect(() => world.get('ball')).toThrow(EngineError);
	});

	it('points up again after the heading drifted', () => {
		const world = worldWithBall();
		applyCommand(world, { op: 'move', target: 'ball', step: 'up', count: 33 + 64 });
		expect(world.get('ball').pose.heading).toBe(Heading.SOUTH);

		applyCommand(world, { op: 'pointUp', target: 'ball' });

		expect(world.get('ball').pose.heading).toBe(Heading.NORTH);
	});

	it('fails on objects that do not exist', () => {
		const world = new World();
		const commands: Command[] = [
			{ op: 'move', target: 'x', step: 'up' },
			{ op: 'moveTo', target: 'x', face: 'FRONT', x: 0, y: 0 },
			{ op: 'setColor', target: 'x', color: '#000000' },
			{ op: 'show', target: 'x' },
			{ op: 'hide', target: 'x' },
			{ op: 'delete', target: 'x' },
			{ op: 'pointUp', target: 'x' },
		];

		for (const command of commands) {
			expect(() => applyCommand(world, command), command.op).toThrow(EngineError);
		}
	});
});

describe('isCommand', () => {
	it('tells commands from control blocks', () => {
		expect(isCommand({ op: 'hide', target: 'a' })).toBe(true);
		expect(isCommand({ op: 'wait', seconds: 1 })).toBe(false);
		expect(isCommand({ op: 'forever', body: [] })).toBe(false);
		expect(isCommand({ op: 'repeat', times: 1, body: [] })).toBe(false);
	});
});
