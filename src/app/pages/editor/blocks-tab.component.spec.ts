import { TestBed } from '@angular/core/testing';
import { CreateCommand, EXAMPLE_PROGRAMS, Program } from '../../cube';
import { BALL } from './test-workspace';
import { BlocksTabComponent } from './blocks-tab.component';
import { VisualBlock, VisualScript, Workspace } from './workspace';

/**
 * The protected members the template uses, so the tab can be driven without a browser (the
 * dialogs and the cropper need a real one).
 */
interface TabInternals {
	workspace: { (): Workspace; set(value: Workspace): void };
	objects: { (): CreateCommand[]; set(value: CreateCommand[]): void };
	program: () => Program | null;
	ready: () => boolean;
	openPicker(containerId: number): void;
	add(type: string): void;
	addScript(): void;
	remove(id: number): void;
	move(id: number, offset: -1 | 1): void;
	setValue(id: number, key: string, value: unknown): void;
	setEvent(script: VisualScript, type: string): void;
	setFloor(value: number): void;
	load(id: string): void;
	toggleFace(block: VisualBlock, key: string, name: string): void;
	toggleAllFaces(block: VisualBlock, key: string): void;
	play(): void;
}

function createTab () {
	const fixture = TestBed.createComponent(BlocksTabComponent);
	const tab = fixture.componentInstance;
	const programs: Program[] = [];

	// The dialogs are a browser feature; the tab only opens and closes the picker.
	fixture.nativeElement.querySelectorAll('dialog').forEach((dialog: HTMLDialogElement) => {
		dialog.close = () => undefined;
		dialog.showModal = () => undefined;
	});
	tab.run.subscribe((program) => programs.push(program));

	const internals = tab as unknown as TabInternals;
	internals.objects.set([ BALL ]);

	/**
	 * Adds a block the way the user does: the plus of a script (or block), then the picker.
	 */
	const addTo = (containerId: number, type: string): void => {
		internals.openPicker(containerId);
		internals.add(type);
	};

	return { fixture, internals, programs, addTo };
}

describe('BlocksTabComponent', () => {
	it('starts with one empty script and cannot run', () => {
		const { fixture, internals } = createTab();
		fixture.detectChanges();

		expect(internals.workspace().scripts).toHaveLength(1);
		expect(internals.workspace().scripts[0].blocks).toEqual([]);
		expect(internals.ready()).toBe(false);
		expect(internals.program()).toBeNull();
	});

	it('adds blocks at the end of the script that opened the picker', () => {
		const { fixture, internals, addTo } = createTab();
		fixture.detectChanges();
		internals.addScript();
		const [ first, second ] = internals.workspace().scripts;

		addTo(first.id, 'moveObject');
		addTo(second.id, 'wait');
		addTo(first.id, 'wait');
		fixture.detectChanges();

		expect(internals.workspace().scripts.map((script) => script.blocks.map((block) => block.type))).toEqual([ [ 'moveObject', 'wait' ], [ 'wait' ] ]);
		expect(fixture.nativeElement.querySelectorAll('article')).toHaveLength(3);
	});

	it('adds blocks inside a repeat', () => {
		const { fixture, internals, addTo } = createTab();
		const script = internals.workspace().scripts[0];

		addTo(script.id, 'forever');
		const forever = internals.workspace().scripts[0].blocks[0];
		addTo(forever.id, 'wait');
		fixture.detectChanges();

		expect(internals.workspace().scripts[0].blocks[0].body?.map((block) => block.type)).toEqual([ 'wait' ]);
		expect(fixture.nativeElement.querySelectorAll('article')).toHaveLength(2);
	});

	it('removes and reorders blocks', () => {
		const { fixture, internals, addTo } = createTab();
		const script = internals.workspace().scripts[0];
		addTo(script.id, 'moveObject');
		addTo(script.id, 'wait');
		addTo(script.id, 'setBackgroundColor');
		const [ first, second ] = internals.workspace().scripts[0].blocks;
		const types = () => internals.workspace().scripts[0].blocks.map((block) => block.type);

		internals.move(second.id, -1);
		expect(types()).toEqual([ 'wait', 'moveObject', 'setBackgroundColor' ]);

		internals.remove(first.id);
		expect(types()).toEqual([ 'wait', 'setBackgroundColor' ]);
		fixture.detectChanges();
	});

	it('changes when a script runs', () => {
		const { internals } = createTab();
		const script = internals.workspace().scripts[0];

		internals.setEvent(script, 'every');
		expect(internals.workspace().scripts[0].trigger).toEqual({ type: 'every', seconds: 1 });

		internals.setEvent(script, 'start');
		expect(internals.workspace().scripts[0].trigger).toEqual({ type: 'start' });
	});

	it('toggles faces, keeping them in the order of the cube', () => {
		const { internals, addTo } = createTab();
		addTo(internals.workspace().scripts[0].id, 'setBackgroundColor');
		const id = internals.workspace().scripts[0].blocks[0].id;
		const block = (): VisualBlock => internals.workspace().scripts[0].blocks.find((candidate) => candidate.id === id)!;

		internals.toggleFace(block(), 'faces', 'TOP');
		internals.toggleFace(block(), 'faces', 'RIGHT');
		expect(block().values['faces']).toEqual([ 'FRONT', 'RIGHT', 'TOP' ]);

		internals.toggleAllFaces(block(), 'faces');
		expect(block().values['faces']).toHaveLength(5);

		internals.toggleAllFaces(block(), 'faces');
		expect(block().values['faces']).toEqual([]);
	});

	it('runs the blocks as a program', () => {
		const { internals, programs, addTo } = createTab();
		const script = internals.workspace().scripts[0];
		addTo(script.id, 'moveObject');
		addTo(script.id, 'wait');

		internals.play();

		expect(programs).toHaveLength(1);
		expect(programs[0].objects).toEqual([ BALL ]);
		expect(programs[0].scripts[0].blocks.map((block) => block.op)).toEqual([ 'move', 'wait' ]);
		expect(internals.program()).toEqual(programs[0]);
	});

	it('does not run while a block is unfinished, and runs once it is', () => {
		const { internals, programs, addTo } = createTab();
		addTo(internals.workspace().scripts[0].id, 'setBackgroundImage');

		internals.play();
		expect(programs).toEqual([]);
		expect(internals.ready()).toBe(false);

		internals.setValue(internals.workspace().scripts[0].blocks[0].id, 'image', new Uint32Array(64 * 64));
		expect(internals.ready()).toBe(true);

		internals.play();
		expect(programs).toHaveLength(1);
	});

	it('does not run while a block acts on an object that does not exist', () => {
		const { internals, addTo } = createTab();
		addTo(internals.workspace().scripts[0].id, 'moveObject');
		expect(internals.ready()).toBe(true);

		internals.objects.set([]);

		expect(internals.ready()).toBe(false);
	});

	it('loads every example as objects and blocks that are ready to run', () => {
		const { fixture, internals } = createTab();

		for (const example of EXAMPLE_PROGRAMS) {
			internals.load(example.id);
			fixture.detectChanges();

			expect(internals.ready(), example.id).toBe(true);
			expect(internals.program()?.objects?.length, example.id).toBeGreaterThan(0);
		}
	});

	it('keeps the settings of an example, and lets them change', () => {
		const { internals } = createTab();
		internals.load('raindrops');
		expect(internals.program()?.config).toEqual({ floor: 65 });

		internals.setFloor(Number.NaN);
		expect(internals.program()).not.toHaveProperty('config');
	});

	it('draws every kind of block without errors', () => {
		const { fixture, internals, addTo } = createTab();
		const script = internals.workspace().scripts[0];

		for (const type of [ 'setBackgroundImage', 'setBackgroundColor', 'moveObject', 'moveObjectTo', 'setObjectColor', 'showObject', 'hideObject', 'deleteObject', 'pointObjectUp', 'wait', 'repeat', 'forever' ])
			addTo(script.id, type);

		expect(() => fixture.detectChanges()).not.toThrow();
		expect(fixture.nativeElement.querySelectorAll('article')).toHaveLength(12);
	});
});
