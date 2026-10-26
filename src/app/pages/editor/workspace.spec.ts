import { CubeEngine, EXAMPLE_PROGRAMS, Face, validateProgram } from '../../cube';
import { BALL, withImages, workspaceOf } from './test-workspace';
import {
	VisualBlock,
	addBlock,
	addScript,
	blocksFromProgram,
	compileWorkspace,
	countBlocks,
	moveItem,
	newBlock,
	newScript,
	problemsOf,
	removeItem,
	setConfig,
	setTrigger,
	setValue,
} from './workspace';

function counter () {
	let id = 100;

	return () => id++;
}

const NAMES = [ BALL.name ];

describe('compileWorkspace', () => {
	it('makes one script for each script of blocks, with its trigger', () => {
		let workspace = workspaceOf('moveObject', 'wait');
		workspace = addScript(workspace, newScript(50, { type: 'every', seconds: 2 }));
		workspace = addBlock(workspace, 50, newBlock('hideObject', 51, NAMES));

		const program = compileWorkspace(workspace, [ BALL ]);

		expect(program.scripts.map((script) => script.trigger)).toEqual([ { type: 'start' }, { type: 'every', seconds: 2 } ]);
		expect(program.scripts[0].blocks.map((block) => block.op)).toEqual([ 'move', 'wait' ]);
		expect(program.scripts[1].blocks).toEqual([ { op: 'hide', target: 'ball' } ]);
	});

	it('carries the objects the program starts with, only when there are some', () => {
		expect(compileWorkspace(workspaceOf('wait'))).not.toHaveProperty('objects');
		expect(compileWorkspace(workspaceOf('wait'), [ BALL ]).objects).toEqual([ BALL ]);
	});

	it('puts the blocks inside a repeat in its body, as deep as they go', () => {
		let workspace = workspaceOf('forever');
		workspace = addBlock(workspace, 2, newBlock('repeat', 10, NAMES));
		workspace = addBlock(workspace, 10, newBlock('moveObject', 11, NAMES));
		workspace = addBlock(workspace, 10, newBlock('wait', 12, NAMES));

		const [ forever ] = compileWorkspace(workspace, [ BALL ]).scripts[0].blocks;

		expect(forever).toEqual({
			op: 'forever',
			body: [ {
				op: 'repeat',
				times: 2,
				body: [ { op: 'move', target: 'ball', step: 'right' }, { op: 'wait', seconds: 1 } ],
			} ],
		});
		expect(() => validateProgram(compileWorkspace(workspace, [ BALL ]))).not.toThrow();
	});

	it('carries the settings only when there are some', () => {
		const workspace = workspaceOf('wait');

		expect(compileWorkspace(workspace)).not.toHaveProperty('config');
		expect(compileWorkspace(setConfig(workspace, 'floor', 65)).config).toEqual({ floor: 65 });
		expect(compileWorkspace(setConfig(setConfig(workspace, 'floor', 65), 'floor', undefined))).not.toHaveProperty('config');
	});
});

describe('the examples as blocks and objects', () => {
	/**
	 * The cube after the program ran for a while, as its five faces.
	 */
	function picture (program: unknown, times: number[]): number[][] {
		const engine = new CubeEngine();
		engine.load(program);
		engine.start(0);

		return times.map((time) => {
			engine.tick(time);

			return [ Face.FRONT, Face.RIGHT, Face.BACK, Face.LEFT, Face.TOP ].flatMap((face) => [ ...engine.state.facePixels(face) ]);
		});
	}

	for (const example of EXAMPLE_PROGRAMS) {
		it(`"${example.name}" becomes objects and blocks that are ready to run`, () => {
			const { workspace, objects } = blocksFromProgram(example.program, counter());

			expect(objects.length).toBeGreaterThan(0);
			expect(countBlocks(workspace)).toBeGreaterThan(0);
			expect(problemsOf(workspace, objects.map((object) => object.name))).toEqual(new Map());
			expect(() => validateProgram(compileWorkspace(workspace, objects))).not.toThrow();
		});

		it(`"${example.name}" runs the same as the example`, () => {
			const { workspace, objects } = blocksFromProgram(example.program, counter());
			const times = [ 0, 130, 500, 1700 ];

			expect(picture(compileWorkspace(workspace, objects), times)).toEqual(picture(example.program, times));
		});
	}

	it('moves the create blocks at the start of a script into objects, in order, and keeps the rest', () => {
		const example = EXAMPLE_PROGRAMS.find((candidate) => 'around' === candidate.id)!;
		const { workspace, objects } = blocksFromProgram(example.program, counter());

		expect(objects.map((object) => object.name)).toEqual([ 'hare', 'tortoise' ]);
		expect(workspace.scripts.map((script) => script.blocks.map((block) => block.type))).toEqual([ [ 'forever' ], [ 'forever' ] ]);
	});

	it('keeps the objects a program declares, before the ones in scripts', () => {
		const program = {
			version: 1 as const,
			objects: [ BALL ],
			scripts: [ { trigger: { type: 'start' as const }, blocks: [ { op: 'create' as const, name: 'b', face: 'FRONT' as const, x: 1, y: 1, color: '#000000' } ] } ],
		};

		expect(blocksFromProgram(program, counter()).objects.map((object) => object.name)).toEqual([ 'ball', 'b' ]);
	});

	it('give every block and script its own id', () => {
		const { workspace } = blocksFromProgram(EXAMPLE_PROGRAMS.find((example) => 'blink' === example.id)!.program, counter());
		const ids: number[] = [];

		for (const script of workspace.scripts) {
			ids.push(script.id);
			const walk = (blocks: VisualBlock[]): void => blocks.forEach((block) => {
				ids.push(block.id);
				walk(block.body ?? []);
			});
			walk(script.blocks);
		}

		expect(new Set(ids).size).toBe(ids.length);
	});

	it('refuse a block that has no visual block, such as a create in the middle of a script', () => {
		const program = {
			version: 1 as const,
			scripts: [ { trigger: { type: 'start' as const }, blocks: [ { op: 'wait' as const, seconds: 1 }, { op: 'create' as const, name: 'b', face: 'FRONT' as const, x: 1, y: 1, color: '#000000' } ] } ],
		};

		expect(() => blocksFromProgram(program, counter())).toThrow('create');
	});
});

describe('problemsOf', () => {
	it('is empty when every block is ready', () => {
		expect(problemsOf(withImages(workspaceOf('setBackgroundImage', 'moveObject')), NAMES)).toEqual(new Map());
	});

	it('asks for an image that was not chosen', () => {
		const workspace = workspaceOf('setBackgroundImage');

		expect(problemsOf(workspace, NAMES).get(2)).toBe('Choose an image.');
	});

	it('asks for at least one face', () => {
		const workspace = setValue(workspaceOf('setBackgroundColor'), 2, 'faces', []);

		expect(problemsOf(workspace, NAMES).get(2)).toBe('Choose at least one face.');
	});

	it('refuses numbers that make no sense', () => {
		const workspace = workspaceOf('wait');

		expect(problemsOf(setValue(workspace, 2, 'seconds', Number.NaN), NAMES).get(2)).toBe('Seconds needs a number.');
		expect(problemsOf(setValue(workspace, 2, 'seconds', -1), NAMES).get(2)).toBe('Seconds cannot be less than 0.');
	});

	it('wants whole numbers where cells are counted', () => {
		const workspace = setValue(workspaceOf('moveObjectTo'), 2, 'x', 1.5);

		expect(problemsOf(workspace, NAMES).get(2)).toBe('X needs a whole number.');
	});

	it('wants the object to exist, and notices when it is deleted', () => {
		const workspace = workspaceOf('moveObject');

		expect(problemsOf(workspace, NAMES).size).toBe(0);
		expect(problemsOf(workspace, []).get(2)).toContain('Objects tab');
		expect(problemsOf(setValue(workspace, 2, 'target', 'other'), NAMES).get(2)).toContain('Objects tab');
	});

	it('asks for time between the runs of a script', () => {
		const workspace = setTrigger(workspaceOf('wait'), 1, { type: 'every', seconds: 0 });

		expect(problemsOf(workspace, NAMES).get(1)).toBe('Seconds must be more than zero.');
	});
});

describe('editing', () => {
	it('acts on the last object made by default', () => {
		const block = newBlock('moveObject', 1, [ 'a', 'b' ]);

		expect(block.values['target']).toBe('b');
		expect(newBlock('moveObject', 1, []).values['target']).toBe('');
	});

	it('removes a block with what is inside it, and a script with its blocks', () => {
		let workspace = workspaceOf('forever');
		workspace = addBlock(workspace, 2, newBlock('wait', 3, NAMES));

		expect(countBlocks(workspace)).toBe(2);
		expect(countBlocks(removeItem(workspace, 2))).toBe(0);
		expect(removeItem(workspace, 1).scripts).toEqual([]);
	});

	it('moves a block among its neighbors only, inside its own list', () => {
		let workspace = workspaceOf('forever', 'wait');
		workspace = addBlock(workspace, 2, newBlock('moveObject', 10, NAMES));
		workspace = addBlock(workspace, 2, newBlock('hideObject', 11, NAMES));

		const inside = (w: typeof workspace) => w.scripts[0].blocks[0].body!.map((block) => block.id);

		expect(inside(moveItem(workspace, 11, -1))).toEqual([ 11, 10 ]);
		expect(inside(moveItem(workspace, 10, -1))).toEqual([ 10, 11 ]);
		expect(inside(moveItem(workspace, 11, 1))).toEqual([ 10, 11 ]);
		expect(moveItem(workspace, 3, -1).scripts[0].blocks.map((block) => block.id)).toEqual([ 3, 2 ]);
	});

	it('moves scripts', () => {
		const workspace = addScript(workspaceOf(), newScript(2));

		expect(moveItem(workspace, 2, -1).scripts.map((script) => script.id)).toEqual([ 2, 1 ]);
	});

	it('changes a value of one block and leaves the others', () => {
		const workspace = setValue(workspaceOf('wait', 'wait'), 2, 'seconds', 3);

		expect(workspace.scripts[0].blocks.map((block) => block.values['seconds'])).toEqual([ 3, 1 ]);
	});
});
