import { CubeEngine, Face, validateProgram } from '../../cube';
import { VISUAL_BLOCKS, specForOp, specOf } from './visual-blocks';
import { workspaceOf, withImages } from './test-workspace';
import { VisualBlock, Workspace, compileWorkspace } from './workspace';

/**
 * The blocks of the first script.
 */
function blocksOf (workspace: Workspace): VisualBlock[] {
	return workspace.scripts[0].blocks;
}

describe('visual blocks', () => {
	it('have a type and an op of their own', () => {
		expect(new Set(VISUAL_BLOCKS.map((spec) => spec.type)).size).toBe(VISUAL_BLOCKS.length);
		expect(new Set(VISUAL_BLOCKS.map((spec) => spec.op)).size).toBe(VISUAL_BLOCKS.length);
	});

	it('start with values that make a valid program (once images are chosen)', () => {
		for (const spec of VISUAL_BLOCKS) {
			const workspace = withImages(workspaceOf('createObject', spec.type));

			expect(() => validateProgram(compileWorkspace(workspace)), spec.type).not.toThrow();
		}
	});

	it('read back what they compile to', () => {
		for (const spec of VISUAL_BLOCKS) {
			const [ , block ] = blocksOf(withImages(workspaceOf('createObject', spec.type)));
			const engineBlock = spec.compile(block.values, []);

			expect(specForOp(engineBlock.op), spec.type).toBe(spec);
			expect(spec.compile(spec.read(engineBlock), []), spec.type).toEqual(engineBlock);
		}
	});

	it('refuse a type or an op nobody knows', () => {
		expect(() => specOf('nope')).toThrow();
		expect(() => specForOp('nope')).toThrow();
	});

	it('carry the image inside the block, as the program writes colors', () => {
		const [ block ] = compileWorkspace(withImages(workspaceOf('setBackgroundImage'))).scripts[0].blocks;

		expect(block).toMatchObject({ op: 'setBackgroundImage', faces: [ 'FRONT' ] });
		expect((block as { pixels: string[] }).pixels).toHaveLength(4096);
		expect((block as { pixels: string[] }).pixels[0]).toBe('#336699');
	});

	it('change the background of the cube when the program runs', () => {
		const workspace = withImages(workspaceOf('setBackgroundImage'));
		blocksOf(workspace)[0].values['faces'] = [ 'LEFT', 'TOP' ];
		const engine = new CubeEngine();
		engine.load(compileWorkspace(workspace));

		engine.start(0);

		expect(engine.state.get(Face.LEFT, 10, 10)).toBe(0x336699);
		expect(engine.state.get(Face.TOP, 10, 10)).toBe(0x336699);
		expect(engine.state.get(Face.FRONT, 10, 10)).toBe(0);
	});

	it('draw objects over the background a block set before', () => {
		const engine = new CubeEngine();
		engine.load(compileWorkspace(withImages(workspaceOf('setBackgroundImage', 'createObject'))));

		engine.start(0);

		expect(engine.state.get(Face.FRONT, 32, 32)).toBe(0xf9a8d4);
		expect(engine.state.get(Face.FRONT, 33, 32)).toBe(0x336699);
	});

	it('leave out what is on its default, so programs stay short', () => {
		const workspace = workspaceOf('createObject', 'moveObject', 'moveObjectTo');
		const [ create, move, moveTo ] = compileWorkspace(workspace).scripts[0].blocks;

		expect(create).not.toHaveProperty('heading');
		expect(create).not.toHaveProperty('pixels');
		expect(move).not.toHaveProperty('count');
		expect(moveTo).not.toHaveProperty('heading');
	});
});
