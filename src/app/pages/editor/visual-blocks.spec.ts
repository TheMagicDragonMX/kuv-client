import { CubeEngine, Face, validateProgram } from '../../cube';
import { BALL, withImages, workspaceOf } from './test-workspace';
import { VISUAL_BLOCKS, specForOp, specOf } from './visual-blocks';
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

	it('do not make objects: that is what the Objects tab is for', () => {
		expect(VISUAL_BLOCKS.map((spec) => spec.op)).not.toContain('create');
	});

	it('start with values that make a valid program (once images are chosen)', () => {
		for (const spec of VISUAL_BLOCKS) {
			const workspace = withImages(workspaceOf(spec.type));

			expect(() => validateProgram(compileWorkspace(workspace, [ BALL ])), spec.type).not.toThrow();
		}
	});

	it('read back what they compile to', () => {
		for (const spec of VISUAL_BLOCKS) {
			const [ block ] = blocksOf(withImages(workspaceOf(spec.type)));
			const engineBlock = spec.compile(block.values, []);

			expect(specForOp(engineBlock.op), spec.type).toBe(spec);
			expect(spec.compile(spec.read(engineBlock), []), spec.type).toEqual(engineBlock);
		}
	});

	it('refuse a type or an op nobody knows', () => {
		expect(() => specOf('nope')).toThrow();
		expect(() => specForOp('nope')).toThrow();
		expect(() => specForOp('create')).toThrow('create');
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
		engine.load(compileWorkspace(withImages(workspaceOf('setBackgroundImage')), [ BALL ]));

		engine.start(0);

		expect(engine.state.get(Face.FRONT, 32, 32)).toBe(0xf9a8d4);
		expect(engine.state.get(Face.FRONT, 33, 32)).toBe(0x336699);
	});

	it('move the objects of the program', () => {
		const engine = new CubeEngine();
		engine.load(compileWorkspace(workspaceOf('moveObject'), [ BALL ]));

		engine.start(0);

		expect(engine.state.get(Face.FRONT, 32, 32)).toBe(0);
		expect(engine.state.get(Face.FRONT, 33, 32)).toBe(0xf9a8d4);
	});

	it('leave out what is on its default, so programs stay short', () => {
		const [ move, moveTo ] = compileWorkspace(workspaceOf('moveObject', 'moveObjectTo'), [ BALL ]).scripts[0].blocks;

		expect(move).not.toHaveProperty('count');
		expect(moveTo).not.toHaveProperty('heading');
	});
});
