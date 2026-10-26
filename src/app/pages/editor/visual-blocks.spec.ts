import { CubeEngine, Face, validateProgram } from '../../cube';
import { VISUAL_BLOCKS, VisualBlock, compileBlocks, newBlock, objectsAbove, problemsOf } from './visual-blocks';

/**
 * A stack built by adding the given types one after the other, like the user does.
 */
function stackOf (...types: string[]): VisualBlock[] {
	return types.reduce<VisualBlock[]>((stack, type, index) => [ ...stack, newBlock(type, index + 1, stack) ], []);
}

/**
 * A picture of one color for a whole face.
 */
const picture = new Uint32Array(64 * 64).fill(0x336699);

/**
 * Gives the image of the first block that needs one.
 */
function withImages (stack: VisualBlock[]): VisualBlock[] {
	return stack.map((block) => 'image' in block.values ? { ...block, values: { ...block.values, image: picture } } : block);
}

describe('visual blocks', () => {
	it('start with values that make a valid program (once images are chosen)', () => {
		for (const spec of VISUAL_BLOCKS) {
			const stack = withImages(stackOf('createObject', spec.type));

			expect(() => validateProgram(compileBlocks(stack, false)), spec.type).not.toThrow();
		}
	});

	it('turn into one script that starts at once, with the blocks in order', () => {
		const program = compileBlocks(withImages(stackOf('createObject', 'wait', 'setBackgroundColor')), false);

		expect(program.scripts).toHaveLength(1);
		expect(program.scripts[0].trigger).toEqual({ type: 'start' });
		expect(program.scripts[0].blocks.map((block) => block.op)).toEqual([ 'create', 'wait', 'setBackgroundColor' ]);
	});

	it('can repeat forever', () => {
		const program = compileBlocks(stackOf('wait'), true);

		expect(program.scripts[0].blocks).toEqual([ { op: 'forever', body: [ { op: 'wait', seconds: 1 } ] } ]);
	});

	it('carry the image inside the block, as the program writes colors', () => {
		const [ block ] = compileBlocks(withImages(stackOf('setBackgroundImage')), false).scripts[0].blocks;

		expect(block).toMatchObject({ op: 'setBackgroundImage', faces: [ 'FRONT' ] });
		expect((block as { pixels: string[] }).pixels).toHaveLength(4096);
		expect((block as { pixels: string[] }).pixels[0]).toBe('#336699');
	});

	it('change the background of the cube when the program runs', () => {
		const stack = withImages(stackOf('setBackgroundImage'));
		stack[0] = { ...stack[0], values: { ...stack[0].values, faces: [ 'LEFT', 'TOP' ] } };
		const engine = new CubeEngine();
		engine.load(compileBlocks(stack, false));

		engine.start(0);

		expect(engine.state.get(Face.LEFT, 10, 10)).toBe(0x336699);
		expect(engine.state.get(Face.TOP, 10, 10)).toBe(0x336699);
		expect(engine.state.get(Face.FRONT, 10, 10)).toBe(0);
	});

	it('draw objects over the background a block set before', () => {
		const stack = withImages(stackOf('setBackgroundImage', 'createObject'));
		const engine = new CubeEngine();
		engine.load(compileBlocks(stack, false));

		engine.start(0);

		expect(engine.state.get(Face.FRONT, 32, 32)).toBe(0xf9a8d4);
		expect(engine.state.get(Face.FRONT, 33, 32)).toBe(0x336699);
	});
});

describe('problemsOf', () => {
	it('is empty when every block is ready', () => {
		expect(problemsOf(withImages(stackOf('setBackgroundImage', 'createObject', 'moveObject')))).toEqual(new Map());
	});

	it('asks for an image that was not chosen', () => {
		const [ block ] = stackOf('setBackgroundImage');

		expect(problemsOf([ block ]).get(block.id)).toBe('Choose an image.');
	});

	it('asks for at least one face', () => {
		const [ block ] = stackOf('setBackgroundColor');
		block.values['faces'] = [];

		expect(problemsOf([ block ]).get(block.id)).toBe('Choose at least one face.');
	});

	it('refuses numbers that make no sense', () => {
		const [ block ] = stackOf('wait');

		block.values['seconds'] = Number.NaN;
		expect(problemsOf([ block ]).get(block.id)).toBe('Seconds needs a number.');

		block.values['seconds'] = -1;
		expect(problemsOf([ block ]).get(block.id)).toBe('Seconds cannot be less than 0.');
	});

	it('wants whole numbers where cells are counted', () => {
		const [ block ] = stackOf('createObject');
		block.values['x'] = 1.5;

		expect(problemsOf([ block ]).get(block.id)).toBe('X needs a whole number.');
	});

	it('wants an object created above before acting on it', () => {
		const [ move ] = stackOf('moveObject');

		expect(problemsOf([ move ]).get(move.id)).toContain('Create object');

		const stack = stackOf('createObject', 'moveObject');
		expect(problemsOf(stack).size).toBe(0);

		// The same two blocks the other way round: the object does not exist yet when it moves.
		expect(problemsOf([ stack[1], stack[0] ]).get(stack[1].id)).toContain('Create object');
	});

	it('does not allow two objects with the same name', () => {
		const stack = stackOf('createObject', 'createObject');
		stack[1].values['name'] = stack[0].values['name'];

		expect(problemsOf(stack).get(stack[1].id)).toContain('already an object');
	});
});

describe('new blocks', () => {
	it('get a name nobody uses', () => {
		const stack = stackOf('createObject', 'createObject', 'createObject');

		expect(stack.map((block) => block.values['name'])).toEqual([ 'object1', 'object2', 'object3' ]);
	});

	it('act on the last object created', () => {
		const stack = stackOf('createObject', 'createObject', 'moveObject');

		expect(stack[2].values['target']).toBe('object2');
	});
});

describe('objectsAbove', () => {
	it('lists the objects created before each block', () => {
		const stack = stackOf('createObject', 'wait', 'createObject', 'moveObject');

		expect([ ...objectsAbove(stack).values() ]).toEqual([ [], [ 'object1' ], [ 'object1' ], [ 'object1', 'object2' ] ]);
	});
});
