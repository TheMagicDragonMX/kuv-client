import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { CreateCommand, formatColor, parseColor } from '../../cube';
import { CENTER, Drawing, GRID, drawingFromObject, freeObjectName, nameProblem, newDrawing, objectFromDrawing } from './stage-object';

/**
 * A small pixel editor for making an object. The grid starts with one highlighted pixel in the
 * middle, which is the object itself (the cell blocks move); the user paints the cells around it
 * to give the object a shape. Saving makes the object; the component does not keep it anywhere.
 */
@Component({
	selector: 'app-object-editor',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './object-editor.component.html',
})
export class ObjectEditorComponent {
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
		this.painting = true;
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
		this.painting = false;
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
		this.drawing.set(newDrawing(this.drawing()[this.center] ?? parseColor(this.color())));
	}

	/**
	 * Hands back the object when it has no problem.
	 */
	protected save (): void {
		if (!this.problem())
			this.saved.emit(objectFromDrawing(this.name(), this.drawing()));
	}
}
