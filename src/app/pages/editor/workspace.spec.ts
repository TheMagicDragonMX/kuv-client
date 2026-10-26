import { CubeEngine, EXAMPLE_PROGRAMS, Face, validateProgram } from '../../cube';
import { workspaceOf, withImages } from './test-workspace';
import {
	VisualBlock,
	addBlock,
	addScript,
	compileWorkspace,
	countBlocks,
	moveItem,
	newBlock,
	newScript,
	objectNames,
	problemsOf,
	removeItem,
	setConfig,
	setTrigger,
	setValue,
	workspaceFromProgram,
} from './workspace';

function counter () {
	let id = 100;

	return () => id++;
}

describe('compileWorkspace', () => {
	it('makes one script for each script of blocks, with its trigger', () => {
		let workspace = workspaceOf('createObject', 'wait');
		workspace = addScript(workspace, newScript(50, { type: 'every', seconds: 2 }));
		workspace = addBlock(workspace, 50, newBlock('hideObject', 51, workspace));

		const program = compileWorkspace(workspace);

		expect(program.scripts.map((script) => script.trigger)).toEqual([ { type: 'start' }, { type: 'every', seconds: 2 } ]);
		expect(program.scripts[0].blocks.map((block) => block.op)).toEqual([ 'create', 'wait' ]);
		expect(program.scripts[1].blocks).toEqual([ { op: 'hide', target: 'object1' } ]);
	});

	it('puts the blocks inside a repeat in its body, as deep as they go', () => {
		let workspace = workspaceOf('createObject', 'forever');
		workspace = addBlock(workspace, 3, newBlock('repeat', 10, workspace));
		workspace = addBlock(workspace, 10, newBlock('moveObject', 11, workspace));
		workspace = addBlock(workspace, 10, newBlock('wait', 12, workspace));

		const [ , forever ] = compileWorkspace(workspace).scripts[0].blocks;

		expect(forever).toEqual({
			op: 'forever',
			body: [ {
				op: 'repeat',
				times: 2,
				body: [ { op: 'move', target: 'object1', step: 'right' }, { op: 'wait', seconds: 1 } ],
			} ],
		});
		expect(() => validateProgram(compileWorkspace(workspace))).not.toThrow();
	});

	it('carries the settings only when there are some', () => {
		const workspace = workspaceOf('wait');

		expect(compileWorkspace(workspace)).not.toHaveProperty('config');
		expect(compileWorkspace(setConfig(workspace, 'floor', 65)).config).toEqual({ floor: 65 });
		expect(compileWorkspace(setConfig(setConfig(workspace, 'floor', 65), 'floor', undefined))).not.toHaveProperty('config');
	});
});

describe('the examples as blocks', () => {
	for (const example of EXAMPLE_PROGRAMS) {
		it(`"${example.name}" becomes blocks and back to the very same program`, () => {
			const workspace = workspaceFromProgram(example.program, counter());

			expect(compileWorkspace(workspace)).toEqual(example.program);
		});

		it(`"${example.name}" has blocks that are ready to run`, () => {
			const workspace = workspaceFromProgram(example.program, counter());

			expect(problemsOf(workspace)).toEqual(new Map());
			expect(countBlocks(workspace)).toBeGreaterThan(0);
		});
	}

	it('give every block and script its own id', () => {
		const workspace = workspaceFromProgram(EXAMPLE_PROGRAMS.find((example) => 'blink' === example.id)!.program, counter());
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

	it('run the same as the program they came from', () => {
		const example = EXAMPLE_PROGRAMS.find((candidate) => 'around' === candidate.id)!;
		const fromProgram = new CubeEngine();
		const fromBlocks = new CubeEngine();
		fromProgram.load(example.program);
		fromBlocks.load(compileWorkspace(workspaceFromProgram(example.program, counter())));

		fromProgram.start(0);
		fromBlocks.start(0);
		fromProgram.tick(500);
		fromBlocks.tick(500);

		for (const face of [ Face.FRONT, Face.RIGHT, Face.BACK, Face.LEFT, Face.TOP ])
			expect([ ...fromBlocks.state.facePixels(face) ]).toEqual([ ...fromProgram.state.facePixels(face) ]);
	});

	it('refuse a block that has no visual block', () => {
		const program = { version: 1 as const, scripts: [ { trigger: { type: 'start' as const }, blocks: [ { op: 'nope' } as never ] } ] };

		expect(() => workspaceFromProgram(program, counter())).toThrow('nope');
	});
});

describe('problemsOf', () => {
	it('is empty when every block is ready', () => {
		expect(problemsOf(withImages(workspaceOf('setBackgroundImage', 'createObject', 'moveObject')))).toEqual(new Map());
	});

	it('asks for an image that was not chosen', () => {
		const workspace = workspaceOf('setBackgroundImage');
		const block = workspace.scripts[0].blocks[0];

		expect(problemsOf(workspace).get(block.id)).toBe('Choose an image.');
	});

	it('asks for at least one face', () => {
		const workspace = setValue(workspaceOf('setBackgroundColor'), 2, 'faces', []);

		expect(problemsOf(workspace).get(2)).toBe('Choose at least one face.');
	});

	it('refuses numbers that make no sense', () => {
		const workspace = workspaceOf('wait');

		expect(problemsOf(setValue(workspace, 2, 'seconds', Number.NaN)).get(2)).toBe('Seconds needs a number.');
		expect(problemsOf(setValue(workspace, 2, 'seconds', -1)).get(2)).toBe('Seconds cannot be less than 0.');
	});

	it('wants whole numbers where cells are counted', () => {
		const workspace = setValue(workspaceOf('createObject'), 2, 'x', 1.5);

		expect(problemsOf(workspace).get(2)).toBe('X needs a whole number.');
	});

	it('wants an object to exist before acting on it', () => {
		expect(problemsOf(workspaceOf('moveObject')).get(2)).toContain('Create object');
		expect(problemsOf(workspaceOf('createObject', 'moveObject')).size).toBe(0);
	});

	it('lets a script act on an object another script creates', () => {
		let workspace = workspaceOf('createObject');
		workspace = addScript(workspace, newScript(50));
		workspace = addBlock(workspace, 50, newBlock('hideObject', 51, workspace));

		expect(problemsOf(workspace).size).toBe(0);
	});

	it('does not allow two objects with the same name', () => {
		const workspace = setValue(workspaceOf('createObject', 'createObject'), 3, 'name', 'object1');

		expect(problemsOf(workspace).get(3)).toContain('already an object');
		expect(problemsOf(workspace).has(2)).toBe(false);
	});

	it('asks for time between the runs of a script', () => {
		const workspace = setTrigger(workspaceOf('wait'), 1, { type: 'every', seconds: 0 });

		expect(problemsOf(workspace).get(1)).toBe('Seconds must be more than zero.');
	});
});

describe('editing', () => {
	it('names new objects after the ones that exist and acts on the last', () => {
		const workspace = workspaceOf('createObject', 'createObject', 'moveObject');

		expect(objectNames(workspace)).toEqual([ 'object1', 'object2' ]);
		expect(workspace.scripts[0].blocks[2].values['target']).toBe('object2');
	});

	it('removes a block with what is inside it, and a script with its blocks', () => {
		let workspace = workspaceOf('forever');
		workspace = addBlock(workspace, 2, newBlock('wait', 3, workspace));

		expect(countBlocks(workspace)).toBe(2);
		expect(countBlocks(removeItem(workspace, 2))).toBe(0);
		expect(removeItem(workspace, 1).scripts).toEqual([]);
	});

	it('moves a block among its neighbors only, inside its own list', () => {
		let workspace = workspaceOf('forever', 'wait');
		workspace = addBlock(workspace, 2, newBlock('createObject', 10, workspace));
		workspace = addBlock(workspace, 2, newBlock('hideObject', 11, workspace));

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
