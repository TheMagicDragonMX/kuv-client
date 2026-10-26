import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	OnDestroy,
	computed,
	input,
	output,
	signal,
	viewChild,
} from '@angular/core';
import { FaceName, Program, RawImage, pixelate } from '../../cube';
import { FACE_OPTIONS } from './faces';
import { ImageCropperComponent } from './image-cropper.component';
import { PixelPreviewComponent } from './pixel-preview.component';
import {
	CATEGORIES,
	Category,
	FieldValue,
	VISUAL_BLOCKS,
	VisualBlock,
	compileBlocks,
	newBlock,
	objectsAbove,
	problemsOf,
	specOf,
} from './visual-blocks';

/**
 * Colors that tell the categories apart: the stripe of a block and the dot in the picker.
 */
const ACCENTS: Record<Category, string> = {
	Background: 'border-l-sky-400',
	Objects: 'border-l-pink-400',
	Time: 'border-l-amber-400',
};

/**
 * Where the user builds a program out of blocks. For now the blocks are only a picture of the
 * program: they are stacked in a container, a plus button adds the next one, and Run turns the
 * stack into the program the cube runs (see `visual-blocks.ts`). When Blockly arrives this
 * component is replaced by the block workspace, and the page does not change: all that
 * matters is that it emits a program on `run`.
 */
@Component({
	selector: 'app-blocks-tab',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ ImageCropperComponent, PixelPreviewComponent ],
	templateUrl: './blocks-tab.component.html',
})
export class BlocksTabComponent implements OnDestroy {
	/**
	 * Whether the program is running, so the buttons can tell.
	 */
	readonly running = input(false);

	/**
	 * Why the last run failed, as reported by the cube.
	 */
	readonly problem = input<string | null>(null);

	/**
	 * The user asked to run the blocks, as a program.
	 */
	readonly run = output<Program>();

	/**
	 * The user asked to stop it.
	 */
	readonly stop = output<void>();

	/**
	 * The user asked to stop it and clear the cube.
	 */
	readonly reset = output<void>();

	protected readonly faces = FACE_OPTIONS;

	protected readonly blockTypes = VISUAL_BLOCKS;

	/**
	 * The picker, grouped the way it is shown.
	 */
	protected readonly categories = CATEGORIES.map((name) => ({
		name,
		accent: ACCENTS[name],
		blocks: VISUAL_BLOCKS.filter((spec) => spec.category === name),
	}));

	protected readonly stack = signal<VisualBlock[]>([]);

	/**
	 * Run the stack again and again instead of once.
	 */
	protected readonly repeat = signal(false);

	/**
	 * What is missing in each block, by id.
	 */
	protected readonly problems = computed(() => problemsOf(this.stack()));

	/**
	 * The objects the blocks above each block create, by id: what a block can act on.
	 */
	protected readonly objects = computed(() => objectsAbove(this.stack()));

	protected readonly ready = computed(() => 0 < this.stack().length && 0 === this.problems().size);

	/**
	 * The image field being filled in the dialog: which block and which field.
	 */
	protected readonly imageTarget = signal<{ id: number; key: string } | null>(null);

	/**
	 * The picture chosen in the dialog, before cropping.
	 */
	protected readonly picture = signal<ImageBitmap | null>(null);

	protected readonly imageProblem = signal<string | null>(null);

	private nextId = 1;

	private readonly picker = viewChild.required<ElementRef<HTMLDialogElement>>('picker');

	private readonly imageDialog = viewChild.required<ElementRef<HTMLDialogElement>>('imageDialog');

	ngOnDestroy (): void {
		this.picture()?.close();
	}

	protected specOf = specOf;

	protected accent (category: Category): string {
		return ACCENTS[category];
	}

	// --- The stack

	protected openPicker (): void {
		this.picker().nativeElement.showModal();
	}

	protected closeDialog (dialog: HTMLDialogElement): void {
		dialog.close();
	}

	/**
	 * Adds a block at the end of the stack and closes the picker.
	 */
	protected add (type: string): void {
		this.stack.update((stack) => [ ...stack, newBlock(type, this.nextId++, stack) ]);
		this.picker().nativeElement.close();
	}

	protected remove (id: number): void {
		this.stack.update((stack) => stack.filter((block) => block.id !== id));
	}

	protected move (id: number, offset: -1 | 1): void {
		this.stack.update((stack) => {
			const index = stack.findIndex((block) => block.id === id);
			const target = index + offset;

			if (0 > target || target >= stack.length)
				return stack;

			const moved = [ ...stack ];
			[ moved[index], moved[target] ] = [ moved[target], moved[index] ];

			return moved;
		});
	}

	protected setValue (id: number, key: string, value: FieldValue): void {
		this.stack.update((stack) => stack.map((block) =>
			block.id === id ? { ...block, values: { ...block.values, [key]: value } } : block));
	}

	protected hasFace (block: VisualBlock, key: string, name: FaceName): boolean {
		return (block.values[key] as FaceName[]).includes(name);
	}

	protected allFaces (block: VisualBlock, key: string): boolean {
		return (block.values[key] as FaceName[]).length === FACE_OPTIONS.length;
	}

	protected toggleFace (block: VisualBlock, key: string, name: FaceName): void {
		const current = block.values[key] as FaceName[];
		const next = current.includes(name) ? current.filter((face) => face !== name) : [ ...current, name ];

		this.setValue(block.id, key, FACE_OPTIONS.map((face) => face.name).filter((face) => next.includes(face)));
	}

	protected toggleAllFaces (block: VisualBlock, key: string): void {
		this.setValue(block.id, key, this.allFaces(block, key) ? [] : FACE_OPTIONS.map((face) => face.name));
	}

	// --- Running

	protected play (): void {
		if (this.ready())
			this.run.emit(compileBlocks(this.stack(), this.repeat()));
	}

	// --- Choosing an image for a block

	protected openImage (id: number, key: string): void {
		this.imageTarget.set({ id, key });
		this.imageProblem.set(null);
		this.imageDialog().nativeElement.showModal();
	}

	/**
	 * Lets go of the picture when the dialog closes, however it closed.
	 */
	protected imageClosed (): void {
		this.picture()?.close();
		this.picture.set(null);
		this.imageTarget.set(null);
	}

	/**
	 * Goes back to choosing a picture.
	 */
	protected discardPicture (): void {
		this.picture()?.close();
		this.picture.set(null);
	}

	protected async pick (event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';

		if (!file)
			return;

		this.imageProblem.set(null);

		try {
			const picture = await createImageBitmap(file);

			this.picture()?.close();
			this.picture.set(picture);
		}

		catch {
			this.imageProblem.set('That file could not be read as a picture.');
		}
	}

	/**
	 * The user accepted the square: shrink it to a face and keep it in the block.
	 */
	protected crop (cropped: RawImage): void {
		const target = this.imageTarget();

		if (target)
			this.setValue(target.id, target.key, pixelate(cropped));

		this.imageDialog().nativeElement.close();
	}
}
