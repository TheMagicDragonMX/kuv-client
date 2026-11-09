import { ChangeDetectionStrategy, Component, OnDestroy, computed, input, linkedSignal, output, signal } from '@angular/core';
import { CreateCommand, RawImage, formatColor, parseColor } from '../../cube';
import { MAX_PICTURE_BYTES, MAX_PICTURE_PIXELS, drawingFromImage, fileProblem, pixelsProblem, sizeOfImage, workingSize } from './image-object';
import { CostumeDraft, costumeNameProblem, costumesOfObject, freeCostumeName, moveCostume, objectFromCostumes } from './costumes';
import { ImageSelectorComponent } from './image-selector.component';
import { ObjectPreviewComponent } from './object-preview.component';
import { CENTER, Drawing, GRID, drawingFromObject, freeObjectName, nameProblem, newDrawing, objectFromDrawing } from './stage-object';

/**
 * How many changes the editor remembers to undo.
 */
const HISTORY_LIMIT = 100;

/**
 * A small pixel editor for making an object. The grid starts with one highlighted pixel in the
 * middle, which is the object itself (the cell blocks move); the user paints the cells around it
 * to give the object a shape. Saving makes the object; the component does not keep it anywhere.
 *
 * Every stroke (from pressing on the grid to letting go), every Clear and every picture brought
 * in is one step of a history, which Ctrl+Z (or the undo button) walks back and Ctrl+Y (or
 * redo) walks forward again.
 *
 * A picture can also be brought in to make the object: the user first chooses the part of it to
 * use, then the size (up to the whole grid), and its transparent parts stay empty. While the
 * picture is being placed, changing the size redoes the drawing from it; painting by hand ends
 * that.
 *
 * An object can have several costumes, drawings of the same object that the blocks switch
 * between to animate it (see `costumes.ts`). The grid shows the costume being edited; a new
 * costume starts as a copy of it, so the next frame of an animation only needs the changes. The
 * object starts with the first costume. The history is of the costume being edited.
 */
@Component({
	selector: 'app-object-editor',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ ImageSelectorComponent, ObjectPreviewComponent ],
	templateUrl: './object-editor.component.html',
	host: { '(document:keydown)': 'onKey($event)' },
})
export class ObjectEditorComponent implements OnDestroy {
	/**
	 * The object being edited, or nothing for a new one. Its name cannot change: blocks use it.
	 */
	readonly object = input<CreateCommand | null>(null);

	/**
	 * The names of the other objects, which a new name cannot repeat.
	 */
	readonly taken = input<string[]>([]);

	/**
	 * The user finished: here is the object.
	 */
	readonly saved = output<CreateCommand>();

	/**
	 * The user closed the editor without saving.
	 */
	readonly cancelled = output<void>();

	/**
	 * One entry per cell of the grid, to repeat the cell in the template.
	 */
	protected readonly cells = Array.from({ length: GRID * GRID }, (_, index) => index);

	/**
	 * Cells per side of the grid.
	 */
	protected readonly grid = GRID;

	/**
	 * Index of the center cell, the object's own cell.
	 */
	protected readonly center = CENTER * GRID + CENTER;

	/**
	 * The name typed for the object. Starts from the object being edited, or a free name.
	 */
	protected readonly name = linkedSignal(() => this.object()?.name ?? freeObjectName(this.taken()));

	/**
	 * The colors of the cells being drawn.
	 */
	protected readonly drawing = linkedSignal<Drawing>(() => {
		const object = this.object();

		return (object && drawingFromObject(object)) ?? newDrawing(parseColor('#f9a8d4'));
	});

	/**
	 * The costumes of the object. The one being edited has its drawing in `drawing` while it is
	 * edited, and goes back to the list when another one is chosen or the object is saved.
	 */
	protected readonly costumes = linkedSignal<CostumeDraft[]>(() => {
		const object = this.object();

		return costumesOfObject(object, (object && drawingFromObject(object)) ?? newDrawing(parseColor('#f9a8d4')));
	});

	/**
	 * Index of the costume being edited.
	 */
	protected readonly current = linkedSignal(() => {
		this.object();

		return 0;
	});

	/**
	 * The name being typed for the costume being edited, or null when it is not being renamed.
	 */
	protected readonly costumeName = signal<string | null>(null);

	/**
	 * Why the name being typed cannot be used, or null.
	 */
	protected readonly costumeNameProblem = computed(() => {
		const name = this.costumeName();

		return null === name ? null : costumeNameProblem(this.costumes(), this.current(), name);
	});

	/**
	 * What each costume looks like, for the list (the one being edited as it is drawn now).
	 */
	protected readonly costumeLooks = computed(() => this.withDrawing().map((costume) => objectFromDrawing(costume.name, costume.drawing)));

	/**
	 * The drawings before the current one, oldest first, to undo to. Starts empty for each object.
	 */
	protected readonly past = linkedSignal<Drawing[]>(() => {
		this.object();

		return [];
	});

	/**
	 * The drawings that were undone, the next one last, to redo to. A new change empties it.
	 */
	protected readonly future = linkedSignal<Drawing[]>(() => {
		this.object();

		return [];
	});

	/**
	 * What the pictures can be like, shown on the button that opens one.
	 */
	protected readonly imageLimit = `Pictures of up to ${MAX_PICTURE_BYTES / 1024 / 1024} MB and ${MAX_PICTURE_PIXELS / 1_000_000} megapixels. Bigger ones are shrunk.`;

	/**
	 * The picture the user opened, while a part of it is being chosen or can be chosen again.
	 * Whatever part is chosen is cut from this, at full quality.
	 */
	protected readonly bitmap = signal<ImageBitmap | null>(null);

	/**
	 * True while the user is choosing the part of the picture to use.
	 */
	protected readonly selecting = signal(false);

	/**
	 * The part of the picture chosen, being turned into the object while its size can still be
	 * changed.
	 */
	protected readonly picture = signal<RawImage | null>(null);

	/**
	 * True to keep the edges of the picture sharp (pixel art) instead of blending the pixels
	 * that fall in one cell, which is better for photos.
	 */
	protected readonly crisp = signal(false);

	/**
	 * Longest side, in cells, the picture is shrunk to.
	 */
	protected readonly size = signal(GRID);

	/**
	 * Largest size the picture can have: the grid.
	 */
	protected readonly maxSize = GRID;

	/**
	 * Why the picture could not be used, or null.
	 */
	protected readonly pictureProblem = signal<string | null>(null);

	/**
	 * Cells across and down the picture takes at the chosen size, to tell the user.
	 */
	protected readonly pictureCells = computed(() => {
		const picture = this.picture();

		return picture && sizeOfImage(picture, this.size());
	});

	/**
	 * The color being painted.
	 */
	protected readonly color = signal('#f9a8d4');

	/**
	 * True when the pointer erases cells instead of painting them.
	 */
	protected readonly erasing = signal(false);

	/**
	 * Why the object cannot be saved yet, or null.
	 */
	protected readonly problem = computed(() => this.object() ? null : nameProblem(this.name(), this.taken()));

	/**
	 * True while the pointer is held down over the grid.
	 */
	private painting = false;

	/**
	 * The drawing when the stroke began, which is what an undo brings back.
	 */
	private strokeStart: Drawing | null = null;

	/**
	 * The drawing before the picture was brought in, to go back to if the user cancels it.
	 */
	private beforePicture: Drawing | null = null;

	/**
	 * The CSS color of a cell of the grid, or nothing when it is empty.
	 */
	protected paint (index: number): string | null {
		const color = this.drawing()[index];

		return null === color ? null : formatColor(color);
	}

	/**
	 * Starts painting at the cell.
	 */
	protected begin (index: number, event: PointerEvent): void {
		/**
		 * A finger would keep sending its events to the first cell; let each cell have its own.
		 */
		(event.target as Element).releasePointerCapture?.(event.pointerId);
		this.acceptPicture();
		this.painting = true;
		this.strokeStart = this.drawing();
		this.touch(index);
	}

	/**
	 * Paints the cell when the pointer slides over it while pressed.
	 */
	protected over (index: number): void {
		if (this.painting)
			this.touch(index);
	}

	/**
	 * Stops painting.
	 */
	protected end (): void {
		if (this.painting && this.strokeStart && this.strokeStart !== this.drawing())
			this.remember(this.strokeStart);

		this.painting = false;
		this.strokeStart = null;
	}

	/**
	 * Keeps a drawing as the next step to undo to, and forgets what was undone.
	 */
	private remember (drawing: Drawing): void {
		this.past.update((past) => [ ...past, drawing ].slice(-HISTORY_LIMIT));
		this.future.set([]);
	}

	/**
	 * Goes back to the drawing before the last change.
	 */
	protected undo (): void {
		this.acceptPicture();

		const past = this.past();

		if (0 === past.length)
			return;

		this.future.update((future) => [ ...future, this.drawing() ]);
		this.drawing.set(past[past.length - 1]);
		this.past.set(past.slice(0, -1));
	}

	/**
	 * Brings back the change that was undone last.
	 */
	protected redo (): void {
		this.acceptPicture();

		const future = this.future();

		if (0 === future.length)
			return;

		this.past.update((past) => [ ...past, this.drawing() ]);
		this.drawing.set(future[future.length - 1]);
		this.future.set(future.slice(0, -1));
	}

	/**
	 * Ctrl+Z undoes and Ctrl+Y (or Ctrl+Shift+Z) redoes, with Command on a Mac. Inside a text box
	 * the keys are left to the box, which has an undo of its own for what is typed.
	 */
	protected onKey (event: KeyboardEvent): void {
		if (!(event.ctrlKey || event.metaKey) || event.altKey || this.selecting())
			return;

		const target = event.target as HTMLElement | null;

		if ('INPUT' === target?.tagName && 'text' === (target as HTMLInputElement).type)
			return;

		const key = event.key.toLowerCase();

		if ('z' === key && !event.shiftKey)
			this.undo();

		else if ('y' === key || ('z' === key && event.shiftKey))
			this.redo();

		else
			return;

		event.preventDefault();
	}

	/**
	 * Paints the cell with the chosen color, or empties it. The center cannot be emptied: the
	 * object always has it.
	 */
	protected touch (index: number): void {
		const erase = this.erasing();

		if (erase && index === this.center)
			return;

		const color = erase ? null : parseColor(this.color());

		this.drawing.update((drawing) => drawing[index] === color ? drawing : drawing.map((cell, at) => at === index ? color : cell));
	}

	/**
	 * Empties the drawing, leaving the center cell.
	 */
	protected clear (): void {
		this.acceptPicture();
		this.remember(this.drawing());
		this.drawing.set(newDrawing(this.drawing()[this.center] ?? parseColor(this.color())));
	}

	/**
	 * Reads the picture the user chose and makes the drawing from it at the chosen size.
	 */
	protected async choose (event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';

		if (!file)
			return;

		const tooBig = fileProblem(file.size);

		this.pictureProblem.set(tooBig);

		if (tooBig)
			return;

		try {
			const opened = await createImageBitmap(file);
			const tooMany = pixelsProblem(opened.width, opened.height);

			if (tooMany) {
				opened.close();
				this.pictureProblem.set(tooMany);

				return;
			}

			const bitmap = await this.shrunk(opened);

			this.acceptPicture();
			this.bitmap.set(bitmap);
			this.selecting.set(true);
		}

		catch {
			this.pictureProblem.set('That file could not be read as a picture.');
		}
	}

	/**
	 * The picture at the size it is worked at: the same one if it is small enough, otherwise a
	 * smaller copy (the big one is let go of).
	 */
	private async shrunk (opened: ImageBitmap): Promise<ImageBitmap> {
		const { width, height } = workingSize(opened.width, opened.height);

		if (width === opened.width && height === opened.height)
			return opened;

		try {
			return await createImageBitmap(opened, { resizeWidth: width, resizeHeight: height, resizeQuality: 'high' });
		}

		finally {
			opened.close();
		}
	}

	/**
	 * The user chose the part of the picture to use: make the drawing from it.
	 */
	protected useSelection (picture: RawImage): void {
		this.beforePicture ??= this.drawing();
		this.picture.set(picture);
		this.selecting.set(false);
		this.place();
	}

	/**
	 * The user left the part chooser: back to the size if a part was already chosen, otherwise
	 * the picture is dropped.
	 */
	protected stopSelecting (): void {
		this.selecting.set(false);

		if (!this.picture())
			this.closeBitmap();
	}

	/**
	 * Goes back to choosing the part of the picture.
	 */
	protected chooseAgain (): void {
		this.selecting.set(true);
	}

	/**
	 * Changes the size of the picture in the drawing.
	 */
	protected resize (size: number): void {
		this.size.set(size);
		this.place();
	}

	/**
	 * Chooses sharp edges or blended pixels for the picture.
	 */
	protected setCrisp (crisp: boolean): void {
		this.crisp.set(crisp);
		this.place();
	}

	/**
	 * Makes the drawing from the picture at the chosen size, or says it has nothing to show.
	 */
	private place (): void {
		const picture = this.picture();

		if (!picture)
			return;

		const result = drawingFromImage(picture, this.size(), this.crisp());

		this.pictureProblem.set(result.visible ? null : 'The picture has nothing to show: all of it is see-through.');

		if (result.visible)
			this.drawing.set(result.drawing);
	}

	/**
	 * Keeps the drawing made from the picture, as one step of the history, and stops placing it.
	 */
	protected acceptPicture (): void {
		if (this.beforePicture && this.beforePicture !== this.drawing())
			this.remember(this.beforePicture);

		this.picture.set(null);
		this.beforePicture = null;
		this.selecting.set(false);
		this.closeBitmap();
	}

	/**
	 * Drops the picture and goes back to the drawing from before it.
	 */
	protected cancelPicture (): void {
		if (this.beforePicture)
			this.drawing.set(this.beforePicture);

		this.picture.set(null);
		this.beforePicture = null;
		this.selecting.set(false);
		this.pictureProblem.set(null);
		this.closeBitmap();
	}

	/**
	 * Lets go of the picture that was opened.
	 */
	private closeBitmap (): void {
		this.bitmap()?.close();
		this.bitmap.set(null);
	}

	ngOnDestroy (): void {
		this.closeBitmap();
	}

	/**
	 * Edits another costume.
	 */
	protected showCostume (index: number): void {
		this.acceptPicture();

		if (index === this.current())
			return;

		this.costumes.set(this.withDrawing());
		this.edit(index);
	}

	/**
	 * Adds a costume that starts as a copy of the one being edited, and edits it.
	 */
	protected addCostume (): void {
		this.acceptPicture();

		const costumes = this.withDrawing();

		this.costumes.set([ ...costumes, { name: freeCostumeName(costumes.map((costume) => costume.name)), drawing: this.drawing() } ]);
		this.edit(costumes.length);
	}

	/**
	 * Removes the costume being edited and edits the one before it. The last one stays.
	 */
	protected removeCostume (): void {
		const costumes = this.costumes();
		const index = this.current();

		if (2 > costumes.length)
			return;

		this.cancelPicture();
		this.costumes.set(costumes.filter((_costume, at) => at !== index));
		this.edit(Math.max(0, index - 1));
	}

	/**
	 * Moves the costume being edited one place to the left (-1) or right (1). The first one is
	 * the one the object starts with.
	 */
	protected moveCurrentCostume (direction: 1 | -1): void {
		const index = this.current();
		const costumes = this.withDrawing();
		const to = index + direction;

		if (0 > to || to >= costumes.length)
			return;

		this.costumes.set(moveCostume(costumes, index, direction));
		this.current.set(to);
	}

	/**
	 * Starts renaming the costume being edited.
	 */
	protected startCostumeRename (): void {
		this.costumeName.set(this.costumes()[this.current()].name);
	}

	/**
	 * Gives the costume being edited the name typed, if it can have it.
	 */
	protected saveCostumeName (): void {
		const name = this.costumeName();

		if (null === name || this.costumeNameProblem())
			return;

		this.costumes.update((costumes) => costumes.map((costume, at) => at === this.current() ? { ...costume, name: name.trim() } : costume));
		this.costumeName.set(null);
	}

	/**
	 * The costumes, with the drawing of the one being edited as it is now.
	 */
	private withDrawing (): CostumeDraft[] {
		return this.costumes().map((costume, at) => at === this.current() ? { ...costume, drawing: this.drawing() } : costume);
	}

	/**
	 * Starts editing a costume of the list: its drawing goes on the grid, with a history of its own.
	 */
	private edit (index: number): void {
		this.current.set(index);
		this.drawing.set(this.costumes()[index].drawing);
		this.past.set([]);
		this.future.set([]);
		this.costumeName.set(null);
	}

	/**
	 * Hands back the object when it has no problem.
	 */
	protected save (): void {
		if (!this.problem())
			this.saved.emit(objectFromCostumes(this.name(), this.withDrawing()));
	}
}
