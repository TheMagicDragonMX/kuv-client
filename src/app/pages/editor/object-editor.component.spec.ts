import { TestBed } from '@angular/core/testing';
import { ObjectEditorComponent } from './object-editor.component';
import { CENTER, GRID } from './stage-object';

/**
 * The protected members of the object editor that the tests drive.
 */
type EditorInternals = {
	/**
	 * The colors of the cells.
	 */
	drawing: () => (number | null)[];

	/**
	 * The color chosen to paint with.
	 */
	color: { set(value: string): void };

	/**
	 * Starts painting at a cell.
	 */
	begin(index: number, event: PointerEvent): void;

	/**
	 * Paints a cell when the pointer slides over it.
	 */
	over(index: number): void;

	/**
	 * Stops painting.
	 */
	end(): void;

	/**
	 * Empties the drawing.
	 */
	clear(): void;

	/**
	 * Goes back one change.
	 */
	undo(): void;

	/**
	 * Brings back the change that was undone.
	 */
	redo(): void;

	/**
	 * Handles a key press.
	 */
	onKey(event: KeyboardEvent): void;
};

/**
 * Index of the center cell of the drawing.
 */
const CENTER_CELL = CENTER * GRID + CENTER;

/**
 * A stroke on the grid over some cells, from pressing to letting go.
 */
function stroke (editor: EditorInternals, ...cells: number[]): void {
	editor.begin(cells[0], { target: document.createElement('div'), pointerId: 1 } as unknown as PointerEvent);
	cells.slice(1).forEach((cell) => editor.over(cell));
	editor.end();
}

/**
 * The cells of the drawing that are painted.
 */
function painted (editor: EditorInternals): number[] {
	return editor.drawing().flatMap((cell, index) => null === cell ? [] : [ index ]);
}

describe('ObjectEditorComponent history', () => {
	let editor: EditorInternals;

	beforeEach(() => {
		const fixture = TestBed.createComponent(ObjectEditorComponent);
		fixture.detectChanges();
		editor = fixture.componentInstance as unknown as EditorInternals;
	});

	it('undoes a whole stroke in one step and redoes it', () => {
		stroke(editor, CENTER_CELL + 1, CENTER_CELL + 2, CENTER_CELL + 3);

		expect(painted(editor)).toEqual([ CENTER_CELL, CENTER_CELL + 1, CENTER_CELL + 2, CENTER_CELL + 3 ]);

		editor.undo();

		expect(painted(editor)).toEqual([ CENTER_CELL ]);

		editor.redo();

		expect(painted(editor)).toEqual([ CENTER_CELL, CENTER_CELL + 1, CENTER_CELL + 2, CENTER_CELL + 3 ]);
	});

	it('undoes the strokes one by one, newest first', () => {
		stroke(editor, CENTER_CELL + 1);
		stroke(editor, CENTER_CELL + 2);

		editor.undo();

		expect(painted(editor)).toEqual([ CENTER_CELL, CENTER_CELL + 1 ]);

		editor.undo();

		expect(painted(editor)).toEqual([ CENTER_CELL ]);
	});

	it('undoes a clear', () => {
		stroke(editor, CENTER_CELL + 1);
		editor.clear();

		editor.undo();

		expect(painted(editor)).toEqual([ CENTER_CELL, CENTER_CELL + 1 ]);
	});

	it('forgets what was undone when something new is painted', () => {
		stroke(editor, CENTER_CELL + 1);
		editor.undo();
		stroke(editor, CENTER_CELL + 2);

		editor.redo();

		expect(painted(editor)).toEqual([ CENTER_CELL, CENTER_CELL + 2 ]);
	});

	it('does not count a stroke that changed nothing', () => {
		stroke(editor, CENTER_CELL);

		editor.undo();

		expect(painted(editor)).toEqual([ CENTER_CELL ]);
	});

	it('undoes with Ctrl+Z and redoes with Ctrl+Y or Ctrl+Shift+Z', () => {
		stroke(editor, CENTER_CELL + 1);

		editor.onKey(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
		expect(painted(editor)).toEqual([ CENTER_CELL ]);

		editor.onKey(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }));
		expect(painted(editor)).toEqual([ CENTER_CELL, CENTER_CELL + 1 ]);

		editor.onKey(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
		editor.onKey(new KeyboardEvent('keydown', { key: 'Z', ctrlKey: true, shiftKey: true }));
		expect(painted(editor)).toEqual([ CENTER_CELL, CENTER_CELL + 1 ]);
	});
});
