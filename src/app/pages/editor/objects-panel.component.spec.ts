import { TestBed } from '@angular/core/testing';
import { CreateCommand } from '../../cube';
import { ObjectEditorComponent } from './object-editor.component';
import { ObjectsPanelComponent } from './objects-panel.component';
import { CENTER, GRID } from './stage-object';

interface EditorInternals {
	name: { (): string; set(value: string): void };
	drawing: () => (number | null)[];
	color: { set(value: string): void };
	erasing: { set(value: boolean): void };
	problem: () => string | null;
	begin(index: number, event: PointerEvent): void;
	over(index: number): void;
	end(): void;
	touch(index: number): void;
	clear(): void;
	save(): void;
}

const CENTER_CELL = CENTER * GRID + CENTER;

function createEditor (object: CreateCommand | null = null, taken: string[] = []) {
	const fixture = TestBed.createComponent(ObjectEditorComponent);
	fixture.componentRef.setInput('object', object);
	fixture.componentRef.setInput('taken', taken);
	const saved: CreateCommand[] = [];
	fixture.componentInstance.saved.subscribe((value) => saved.push(value));
	fixture.detectChanges();

	return { fixture, editor: fixture.componentInstance as unknown as EditorInternals, saved };
}

describe('ObjectEditorComponent', () => {
	it('starts with a highlighted center pixel and a name nobody uses', () => {
		const { fixture, editor } = createEditor(null, [ 'object1' ]);

		expect(editor.name()).toBe('object2');
		expect(editor.drawing().filter((cell) => null !== cell)).toHaveLength(1);
		expect(editor.drawing()[CENTER_CELL]).not.toBeNull();
		expect(fixture.nativeElement.querySelectorAll('[data-cell]')).toHaveLength(GRID * GRID);
	});

	it('paints the cells around the center with the chosen color, also by dragging', () => {
		const { editor } = createEditor();
		editor.color.set('#00ff00');

		editor.begin(CENTER_CELL + 1, { target: document.createElement('div'), pointerId: 1 } as unknown as PointerEvent);
		editor.over(CENTER_CELL + 2);
		editor.end();
		editor.over(CENTER_CELL + 3);

		expect(editor.drawing()[CENTER_CELL + 1]).toBe(0x00ff00);
		expect(editor.drawing()[CENTER_CELL + 2]).toBe(0x00ff00);
		expect(editor.drawing()[CENTER_CELL + 3]).toBeNull();
	});

	it('erases cells, but never the center', () => {
		const { editor } = createEditor();
		editor.touch(CENTER_CELL + 1);
		editor.erasing.set(true);

		editor.touch(CENTER_CELL + 1);
		editor.touch(CENTER_CELL);

		expect(editor.drawing()[CENTER_CELL + 1]).toBeNull();
		expect(editor.drawing()[CENTER_CELL]).not.toBeNull();
	});

	it('clears back to the center', () => {
		const { editor } = createEditor();
		editor.touch(0);
		editor.touch(1);

		editor.clear();

		expect(editor.drawing().filter((cell) => null !== cell)).toHaveLength(1);
	});

	it('makes the object when saved: on the front face, with the shape drawn', () => {
		const { editor, saved } = createEditor();
		editor.name.set('star');
		editor.color.set('#ffff00');
		editor.touch(CENTER_CELL - GRID);

		editor.save();

		expect(saved).toHaveLength(1);
		expect(saved[0]).toMatchObject({ op: 'create', name: 'star', face: 'FRONT', x: 32, y: 32 });
		expect(saved[0].pixels).toHaveLength(2);
	});

	it('does not save a name that is empty or taken', () => {
		const { editor, saved } = createEditor(null, [ 'ball' ]);

		editor.name.set('ball');
		expect(editor.problem()).toContain('already an object');
		editor.save();

		editor.name.set('');
		editor.save();

		expect(saved).toEqual([]);
	});

	it('edits an existing object, keeping its name', () => {
		const { editor, saved } = createEditor({ op: 'create', name: 'ball', face: 'FRONT', x: 32, y: 32, color: '#ff0000' }, [ 'ball' ]);
		editor.touch(CENTER_CELL + 1);

		editor.save();

		expect(saved[0].name).toBe('ball');
		expect(saved[0].pixels).toHaveLength(2);
	});
});

describe('ObjectsPanelComponent', () => {
	const ball: CreateCommand = { op: 'create', name: 'ball', face: 'FRONT', x: 32, y: 32, color: '#ff0000' };

	function createPanel (objects: CreateCommand[]) {
		const fixture = TestBed.createComponent(ObjectsPanelComponent);
		fixture.componentRef.setInput('objects', objects);
		fixture.nativeElement.querySelectorAll('dialog').forEach((dialog: HTMLDialogElement) => {
			dialog.showModal = () => undefined;
			dialog.close = () => undefined;
		});
		fixture.detectChanges();

		return { fixture, panel: fixture.componentInstance as unknown as {
			objects: { (): CreateCommand[] };
			create(): void;
			edit(object: CreateCommand): void;
			remove(name: string): void;
			save(object: CreateCommand): void;
			taken: () => string[];
		} };
	}

	it('lists the objects', () => {
		const { fixture } = createPanel([ ball, { ...ball, name: 'other' } ]);

		expect(fixture.nativeElement.querySelectorAll('li')).toHaveLength(2);
		expect(fixture.nativeElement.textContent).toContain('other');
	});

	it('adds a new object at the end', () => {
		const { fixture, panel } = createPanel([ ball ]);
		panel.create();
		fixture.detectChanges();

		panel.save({ ...ball, name: 'second' });

		expect(panel.objects().map((object) => object.name)).toEqual([ 'ball', 'second' ]);
	});

	it('replaces the object that was edited, in its place', () => {
		const { fixture, panel } = createPanel([ ball, { ...ball, name: 'other' } ]);
		panel.edit(ball);
		fixture.detectChanges();

		expect(panel.taken()).toEqual([ 'other' ]);
		panel.save({ ...ball, color: '#00ff00' });

		expect(panel.objects().map((object) => object.color)).toEqual([ '#00ff00', '#ff0000' ]);
	});

	it('deletes an object', () => {
		const { panel } = createPanel([ ball, { ...ball, name: 'other' } ]);

		panel.remove('ball');

		expect(panel.objects().map((object) => object.name)).toEqual([ 'other' ]);
	});

	it('does not offer to edit an object too big for the editor', () => {
		const wide: CreateCommand = { ...ball, name: 'wide', pixels: [ { dx: -100, dy: 0 } ] };
		const { fixture } = createPanel([ ball, wide ]);

		const buttons = [ ...fixture.nativeElement.querySelectorAll('button[aria-label^="Edit"]') ] as HTMLElement[];

		expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([ 'Edit ball' ]);
	});
});
