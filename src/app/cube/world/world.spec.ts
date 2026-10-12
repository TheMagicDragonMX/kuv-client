import { EngineError } from '../errors';
import { Heading } from '../geometry/geometry';
import { Face } from '../state/cube-state';
import { CubeObject } from './cube-object';
import { World } from './world';

function pixel (name: string, x = 0): CubeObject {
	return {
		name,
		shape: 'pixel',
		pose: { surface: 'strip', x, y: 0, heading: Heading.NORTH },
		color: 0xffffff,
		visible: true,
	};
}

describe('World', () => {
	it('stores and finds objects by name', () => {
		const world = new World();

		world.add(pixel('ball'));

		expect(world.get('ball').name).toBe('ball');
	});

	it('does not allow two objects with the same name', () => {
		const world = new World();
		world.add(pixel('ball'));

		expect(() => world.add(pixel('ball'))).toThrow(EngineError);
	});

	it('explains which object is missing', () => {
		expect(() => new World().get('ghost')).toThrow('There is no object called "ghost"');
	});

	it('updates some properties and keeps the rest', () => {
		const world = new World();
		world.add(pixel('ball'));

		world.update('ball', { color: 0xff0000 });

		expect(world.get('ball').color).toBe(0xff0000);
		expect(world.get('ball').visible).toBe(true);
	});

	it('keeps the drawing order when an object is updated', () => {
		const world = new World();
		world.add(pixel('a'));
		world.add(pixel('b'));

		world.update('a', { color: 1 });

		expect([ ...world.all() ].map((object) => object.name)).toEqual([ 'a', 'b' ]);
	});

	it('removes objects', () => {
		const world = new World();
		world.add(pixel('ball'));

		world.remove('ball');

		expect(() => world.get('ball')).toThrow(EngineError);
		expect(() => world.remove('ball')).toThrow(EngineError);
	});

	it('raises its version when objects or the background change', () => {
		const world = new World();
		const start = world.version;

		world.add(pixel('ball'));
		const afterAdd = world.version;
		world.background.set(Face.FRONT, 0, 0, 1);

		expect(afterAdd).toBeGreaterThan(start);
		expect(world.version).toBeGreaterThan(afterAdd);
	});

	it('clears objects and background', () => {
		const world = new World();
		world.add(pixel('ball'));
		world.background.set(Face.FRONT, 0, 0, 1);

		world.clear();

		expect([ ...world.all() ]).toEqual([]);
		expect(world.background.get(Face.FRONT, 0, 0)).toBe(0);
	});

	it('uses the geometry settings it was given', () => {
		expect(new World({ floor: 70 }).geometry.floor).toBe(70);
	});
});
