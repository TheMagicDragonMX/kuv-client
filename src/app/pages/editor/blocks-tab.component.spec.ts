import { TestBed } from '@angular/core/testing';
import { Program } from '../../cube';
import { BlocksTabComponent } from './blocks-tab.component';
import { VisualBlock } from './visual-blocks';

/**
 * The protected members the template uses, so the tab can be driven without a browser (the
 * dialogs and the cropper need a real one).
 */
interface TabInternals {
	stack: { (): VisualBlock[]; set(value: VisualBlock[]): void };
	repeat: { set(value: boolean): void };
	ready: () => boolean;
	add(type: string): void;
	remove(id: number): void;
	move(id: number, offset: -1 | 1): void;
	setValue(id: number, key: string, value: unknown): void;
	toggleFace(block: VisualBlock, key: string, name: string): void;
	toggleAllFaces(block: VisualBlock, key: string): void;
	play(): void;
}

function createTab () {
	const fixture = TestBed.createComponent(BlocksTabComponent);
	const tab = fixture.componentInstance;
	const programs: Program[] = [];

	// The dialogs are a browser feature; the tab only closes the picker after adding a block.
	fixture.nativeElement.querySelectorAll('dialog').forEach((dialog: HTMLDialogElement) => {
		dialog.close = () => undefined;
	});
	tab.run.subscribe((program) => programs.push(program));

	return { fixture, internals: tab as unknown as TabInternals, programs };
}

describe('BlocksTabComponent', () => {
	it('starts empty and cannot run', () => {
		const { fixture, internals } = createTab();
		fixture.detectChanges();

		expect(internals.stack()).toEqual([]);
		expect(internals.ready()).toBe(false);
	});

	it('adds blocks at the end, one after the other', () => {
		const { fixture, internals } = createTab();
		fixture.detectChanges();

		internals.add('createObject');
		internals.add('wait');
		fixture.detectChanges();

		expect(internals.stack().map((block) => block.type)).toEqual([ 'createObject', 'wait' ]);
		expect(fixture.nativeElement.querySelectorAll('article')).toHaveLength(2);
	});

	it('removes and reorders blocks', () => {
		const { fixture, internals } = createTab();
		internals.add('createObject');
		internals.add('wait');
		internals.add('setBackgroundColor');
		const [ first, second ] = internals.stack();

		internals.move(second.id, -1);
		expect(internals.stack().map((block) => block.type)).toEqual([ 'wait', 'createObject', 'setBackgroundColor' ]);

		internals.move(second.id, -1);
		expect(internals.stack()[0].id).toBe(second.id);

		internals.remove(first.id);
		expect(internals.stack().map((block) => block.type)).toEqual([ 'wait', 'setBackgroundColor' ]);
		fixture.detectChanges();
	});

	it('edits the values of one block and leaves the others', () => {
		const { internals } = createTab();
		internals.add('wait');
		internals.add('wait');
		const [ first ] = internals.stack();

		internals.setValue(first.id, 'seconds', 3);

		expect(internals.stack().map((block) => block.values['seconds'])).toEqual([ 3, 1 ]);
	});

	it('toggles faces, keeping them in the order of the cube', () => {
		const { internals } = createTab();
		internals.add('setBackgroundColor');
		const id = internals.stack()[0].id;
		const block = (): VisualBlock => internals.stack().find((candidate) => candidate.id === id)!;

		internals.toggleFace(block(), 'faces', 'TOP');
		internals.toggleFace(block(), 'faces', 'RIGHT');
		expect(block().values['faces']).toEqual([ 'FRONT', 'RIGHT', 'TOP' ]);

		internals.toggleFace(block(), 'faces', 'FRONT');
		expect(block().values['faces']).toEqual([ 'RIGHT', 'TOP' ]);

		internals.toggleAllFaces(block(), 'faces');
		expect(block().values['faces']).toHaveLength(5);

		internals.toggleAllFaces(block(), 'faces');
		expect(block().values['faces']).toEqual([]);
	});

	it('runs the blocks as a program, once or forever', () => {
		const { internals, programs } = createTab();
		internals.add('createObject');
		internals.add('wait');

		internals.play();
		internals.repeat.set(true);
		internals.play();

		expect(programs[0].scripts[0].blocks.map((block) => block.op)).toEqual([ 'create', 'wait' ]);
		expect(programs[1].scripts[0].blocks[0].op).toBe('forever');
	});

	it('does not run while a block is unfinished, and runs once it is', () => {
		const { internals, programs } = createTab();
		internals.add('setBackgroundImage');

		internals.play();
		expect(programs).toEqual([]);
		expect(internals.ready()).toBe(false);

		internals.setValue(internals.stack()[0].id, 'image', new Uint32Array(64 * 64));
		expect(internals.ready()).toBe(true);

		internals.play();
		expect(programs).toHaveLength(1);
	});

	it('draws every kind of block without errors', () => {
		const { fixture, internals } = createTab();
		for (const type of [ 'setBackgroundImage', 'setBackgroundColor', 'createObject', 'moveObject', 'setObjectColor', 'wait' ])
			internals.add(type);

		expect(() => fixture.detectChanges()).not.toThrow();
		expect(fixture.nativeElement.querySelectorAll('article')).toHaveLength(6);
	});
});
