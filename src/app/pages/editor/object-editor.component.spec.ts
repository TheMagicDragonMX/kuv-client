import { TestBed } from '@angular/core/testing';
import { CreateCommand } from '../../cube';
import { MAX_PICTURE_BYTES } from './image-object';
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

	/**
	 * The picture being placed.
	 */
	picture: { (): unknown; set(value: { width: number; height: number; data: Uint8ClampedArray } | null): void };

	/**
	 * Changes the size of the picture in the drawing.
	 */
	resize(size: number): void;

	/**
	 * Keeps the picture.
	 */
	acceptPicture(): void;

	/**
	 * Drops the picture.
	 */
	cancelPicture(): void;

	/**
	 * True while the part of the picture to use is being chosen.
	 */
	selecting: { (): boolean; set(value: boolean): void };

	/**
	 * Makes the drawing from the part of the picture the user chose.
	 */
	useSelection(picture: { width: number; height: number; data: Uint8ClampedArray }): void;

	/**
	 * The user left the part chooser.
	 */
	stopSelecting(): void;

	/**
	 * Goes back to choosing the part of the picture.
	 */
	chooseAgain(): void;

	/**
	 * Chooses sharp edges or blended pixels.
	 */
	setCrisp(crisp: boolean): void;

	/**
	 * Reads the file the user chose.
	 */
	choose(event: Event): Promise<void>;

	/**
	 * Why the picture could not be used, or null.
	 */
	pictureProblem: () => string | null;
};

/**
 * A 2 by 2 red picture with a see-through bottom right corner.
 */
const RED_PICTURE = {
	width: 2,
	height: 2,
	data: new Uint8ClampedArray([ 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 0, 0 ]),
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

	describe('with a picture', () => {
		/**
		 * Brings the picture in the way `choose` does once it has read the file.
		 */
		function bringIn (size: number): void {
			editor.picture.set(RED_PICTURE);
			(editor as unknown as { beforePicture: unknown }).beforePicture = editor.drawing();
			editor.resize(size);
		}

		it('makes the drawing from the picture at the chosen size, leaving see-through parts empty', () => {
			bringIn(2);

			expect(painted(editor)).toHaveLength(3);

			editor.resize(1);

			expect(painted(editor)).toHaveLength(1);
		});

		it('is one step of the history once it is kept', () => {
			bringIn(2);
			editor.acceptPicture();

			editor.undo();

			expect(painted(editor)).toEqual([ CENTER_CELL ]);
		});

		it('goes away when it is discarded, with no step in the history', () => {
			bringIn(2);
			editor.cancelPicture();

			expect(painted(editor)).toEqual([ CENTER_CELL ]);

			editor.undo();

			expect(painted(editor)).toEqual([ CENTER_CELL ]);
		});

		it('is kept when the user paints over it', () => {
			bringIn(2);
			stroke(editor, 0);

			expect(editor.picture()).toBeNull();

			editor.undo();
			editor.undo();

			expect(painted(editor)).toEqual([ CENTER_CELL ]);
		});

		it('is made from the part the user chose, and a different part can be chosen later', () => {
			editor.selecting.set(true);
			editor.useSelection(RED_PICTURE);
			editor.resize(2);

			expect(editor.selecting()).toBe(false);
			expect(painted(editor)).toHaveLength(3);

			editor.chooseAgain();

			expect(editor.selecting()).toBe(true);

			editor.useSelection({ width: 1, height: 1, data: new Uint8ClampedArray([ 0, 0, 255, 255 ]) });

			// A single pixel is stretched to the size chosen.
			expect(painted(editor)).toHaveLength(4);

			editor.resize(1);

			expect(painted(editor)).toEqual([ CENTER_CELL ]);

			editor.cancelPicture();

			expect(painted(editor)).toEqual([ CENTER_CELL ]);
		});

		it('goes back to the drawing from before it, whatever part was chosen last', () => {
			stroke(editor, CENTER_CELL + 1);
			editor.useSelection(RED_PICTURE);
			editor.useSelection({ width: 1, height: 1, data: new Uint8ClampedArray([ 0, 0, 255, 255 ]) });

			editor.cancelPicture();

			expect(painted(editor)).toEqual([ CENTER_CELL, CENTER_CELL + 1 ]);
		});

		it('switches between blended pixels and sharp edges', () => {
			editor.useSelection({ width: 2, height: 1, data: new Uint8ClampedArray([ 255, 0, 0, 255, 0, 0, 255, 255 ]) });
			editor.resize(1);

			expect(painted(editor)).toHaveLength(1);

			editor.setCrisp(true);

			expect(painted(editor)).toHaveLength(1);
		});

		it('ignores Ctrl+Z while the part is being chosen, so the picture is not lost', () => {
			stroke(editor, CENTER_CELL + 1);
			editor.selecting.set(true);

			editor.onKey(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));

			expect(painted(editor)).toEqual([ CENTER_CELL, CENTER_CELL + 1 ]);
		});

		it('refuses a file that is too big without opening it', async () => {
			const input = { files: [ { size: MAX_PICTURE_BYTES + 1 } ], value: 'big.png' };

			await editor.choose({ target: input } as unknown as Event);

			expect(editor.pictureProblem()).toContain('too big');
			expect(editor.selecting()).toBe(false);
			expect(input.value).toBe('');
		});
	});
});

describe('ObjectEditorComponent costumes', () => {
	/**
	 * The protected members that handle the costumes.
	 */
	type CostumeInternals = EditorInternals & {
		costumes(): { name: string }[];
		current(): number;
		addCostume(): void;
		showCostume(index: number): void;
		removeCostume(): void;
		moveCurrentCostume(direction: 1 | -1): void;
		save(): void;
	};

	let editor: CostumeInternals;
	let saved: CreateCommand[];

	beforeEach(() => {
		const fixture = TestBed.createComponent(ObjectEditorComponent);
		saved = [];
		fixture.componentInstance.saved.subscribe((object) => saved.push(object));
		fixture.detectChanges();
		editor = fixture.componentInstance as unknown as CostumeInternals;
	});

	it('starts with one costume, and a new one is a copy of the one being edited', () => {
		stroke(editor, CENTER_CELL + 1);

		editor.addCostume();

		expect(editor.costumes().map((costume) => costume.name)).toEqual([ 'Costume 1', 'Costume 2' ]);
		expect(editor.current()).toBe(1);
		expect(painted(editor)).toEqual([ CENTER_CELL, CENTER_CELL + 1 ]);
	});

	it('keeps the drawing of each costume when going from one to another', () => {
		editor.addCostume();
		stroke(editor, CENTER_CELL + GRID);

		editor.showCostume(0);
		expect(painted(editor)).toEqual([ CENTER_CELL ]);

		editor.showCostume(1);
		expect(painted(editor)).toEqual([ CENTER_CELL, CENTER_CELL + GRID ]);
	});

	it('has a history of its own for each costume', () => {
		stroke(editor, CENTER_CELL + 1);
		editor.addCostume();

		editor.undo();

		expect(painted(editor)).toEqual([ CENTER_CELL, CENTER_CELL + 1 ]);
	});

	it('saves the object with every costume, starting with the first', () => {
		editor.addCostume();
		stroke(editor, CENTER_CELL + GRID);
		editor.moveCurrentCostume(-1);

		editor.save();

		expect(saved[0].costumes?.map((costume) => costume.name)).toEqual([ 'Costume 2', 'Costume 1' ]);
		expect(saved[0].pixels).toHaveLength(2);
	});

	it('removes a costume, but never the last one', () => {
		editor.addCostume();

		editor.removeCostume();
		editor.removeCostume();

		expect(editor.costumes()).toHaveLength(1);
		expect(editor.current()).toBe(0);
	});
});
