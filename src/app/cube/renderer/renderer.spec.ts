import { applyCommand } from '../commands/apply-command';
import { CubeState, Face } from '../state/cube-state';
import { World } from '../world/world';
import { Renderer } from './renderer';

function setup (config = {}) {
	const world = new World(config);
	const output = new CubeState();

	return { world, output, renderer: new Renderer(world, output) };
}

describe('Renderer', () => {
	it('draws a visible object where its pose is', () => {
		const { world, output, renderer } = setup();
		applyCommand(world, { op: 'create', name: 'a', face: 'RIGHT', x: 3, y: 4, color: '#ff0000' });

		renderer.render();

		expect(output.get(Face.RIGHT, 3, 4)).toBe(0xff0000);
	});

	it('draws objects on the top face', () => {
		const { world, output, renderer } = setup();
		applyCommand(world, { op: 'create', name: 'a', face: 'TOP', x: 7, y: 8, color: '#00ff00' });

		renderer.render();

		expect(output.get(Face.TOP, 7, 8)).toBe(0x00ff00);
	});

	it('does not draw hidden objects', () => {
		const { world, output, renderer } = setup();
		applyCommand(world, { op: 'create', name: 'a', face: 'FRONT', x: 1, y: 1, color: '#ff0000' });
		applyCommand(world, { op: 'hide', target: 'a' });

		renderer.render();

		expect(output.get(Face.FRONT, 1, 1)).toBe(0);
	});

	it('does not draw objects below the visible rows', () => {
		const { world, output, renderer } = setup({ floor: 70 });
		applyCommand(world, { op: 'create', name: 'a', face: 'FRONT', x: 1, y: 63, color: '#ff0000' });
		applyCommand(world, { op: 'move', target: 'a', step: 'down', count: 3 });

		renderer.render();

		expect(output.get(Face.FRONT, 1, 63)).toBe(0);
	});

	it('starts from the background and draws objects on top', () => {
		const { world, output, renderer } = setup();
		applyCommand(world, { op: 'fillRect', face: 'FRONT', x: 0, y: 0, width: 4, height: 4, color: '#0000ff' });
		applyCommand(world, { op: 'create', name: 'a', face: 'FRONT', x: 1, y: 1, color: '#ff0000' });

		renderer.render();

		expect(output.get(Face.FRONT, 0, 0)).toBe(0x0000ff);
		expect(output.get(Face.FRONT, 1, 1)).toBe(0xff0000);
	});

	it('leaves no trail: where an object was, the background shows again', () => {
		const { world, output, renderer } = setup();
		applyCommand(world, { op: 'setPixel', face: 'FRONT', x: 0, y: 0, color: '#0000ff' });
		applyCommand(world, { op: 'create', name: 'a', face: 'FRONT', x: 0, y: 0, color: '#ff0000' });
		renderer.render();

		applyCommand(world, { op: 'move', target: 'a', step: 'right' });
		renderer.render();

		expect(output.get(Face.FRONT, 0, 0)).toBe(0x0000ff);
		expect(output.get(Face.FRONT, 1, 0)).toBe(0xff0000);
	});

	it('draws later objects over earlier ones', () => {
		const { world, output, renderer } = setup();
		applyCommand(world, { op: 'create', name: 'a', face: 'FRONT', x: 0, y: 0, color: '#ff0000' });
		applyCommand(world, { op: 'create', name: 'b', face: 'FRONT', x: 0, y: 0, color: '#00ff00' });

		renderer.render();

		expect(output.get(Face.FRONT, 0, 0)).toBe(0x00ff00);
	});

	it('does nothing when the world has not changed', () => {
		const { world, output, renderer } = setup();
		applyCommand(world, { op: 'create', name: 'a', face: 'FRONT', x: 0, y: 0, color: '#ff0000' });
		expect(renderer.render()).toBe(true);
		const version = output.version;

		expect(renderer.render()).toBe(false);
		expect(output.version).toBe(version);
	});
});
