import { NgTemplateOutlet } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	OnDestroy,
	computed,
	input,
	model,
	output,
	signal,
	viewChild,
} from '@angular/core';
import { CreateCommand, EXAMPLE_PROGRAMS, FaceName, Program, RawImage, SideName, pixelate } from '../../cube';
import { FACE_OPTIONS } from './faces';
import { ImageCropperComponent } from './image-cropper.component';
import { PixelPreviewComponent } from './pixel-preview.component';
import { CATEGORIES, Category, FieldValue, VISUAL_BLOCKS, VisualBlockSpec, specOf } from './visual-blocks';
import {
	VisualBlock,
	VisualScript,
	Workspace,
	addBlock,
	addScript,
	compileWorkspace,
	countBlocks,
	emptyWorkspace,
	moveItem,
	newBlock,
	newScript,
	problemsOf,
	removeItem,
	setConfig,
	setTrigger,
	setValue,
	blocksFromProgram,
} from './workspace';

/**
 * Colors that tell the categories apart: the stripe of a block and the dot in the picker.
 */
const ACCENTS: Record<Category, string> = {
	Background: 'border-l-sky-400',
	Objects: 'border-l-pink-400',
	Control: 'border-l-amber-400',
};

/**
 * Where the user builds a program out of blocks. The blocks are the source of truth: the
 * program (the JSON of the Program tab, and what the cube runs) is made from them and from the
 * objects of the Objects tab, never the other way round. They are stacked in scripts, a plus button adds the next one, and Run sends
 * the program to the cube (see `workspace.ts`). The examples are programs turned into blocks.
 * When Blockly arrives this component is replaced by the block workspace, and the page does not
 * change: all that matters is that it emits a program on `run`.
 */
@Component({
	selector: 'app-blocks-tab',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ ImageCropperComponent, NgTemplateOutlet, PixelPreviewComponent ],
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

	protected readonly examples = EXAMPLE_PROGRAMS;

	protected readonly sides: SideName[] = [ 'FRONT', 'RIGHT', 'BACK', 'LEFT' ];

	/**
	 * The picker, grouped the way it is shown.
	 */
	protected readonly categories = CATEGORIES.map((name) => ({
		name,
		accent: ACCENTS[name],
		blocks: VISUAL_BLOCKS.filter((spec) => spec.category === name),
	}));

	/**
	 * Everything the user built. It starts with one script that runs when the program starts.
	 */
	protected readonly workspace = signal<Workspace>(addScript(emptyWorkspace(), newScript(0)));

	/**
	 * The objects the user made in the Objects tab: what the blocks act on. Loading an example
	 * replaces them along with the blocks.
	 */
	readonly objects = model<CreateCommand[]>([]);

	/**
	 * Their names.
	 */
	protected readonly names = computed(() => this.objects().map((object) => object.name));

	/**
	 * What is missing in each block or script, by id.
	 */
	protected readonly problems = computed(() => problemsOf(this.workspace(), this.names()));

	protected readonly ready = computed(() => 0 < countBlocks(this.workspace()) && 0 === this.problems().size);

	/**
	 * The program the blocks stand for, or null while they are not ready to run. The page shows
	 * it in the Program tab.
	 */
	readonly program = computed<Program | null>(() => this.ready() ? compileWorkspace(this.workspace(), this.objects()) : null);

	/**
	 * Where the picker adds the block: the id of the script or block it goes in.
	 */
	private pickerTarget = 0;

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

	protected readonly specOf: (type: string) => VisualBlockSpec = specOf;

	protected accent (category: Category): string {
		return ACCENTS[category];
	}

	// --- The workspace

	/**
	 * Opens the picker to add a block to a script, or inside a block.
	 */
	protected openPicker (containerId: number): void {
		this.pickerTarget = containerId;
		this.picker().nativeElement.showModal();
	}

	protected closeDialog (dialog: HTMLDialogElement): void {
		dialog.close();
	}

	/**
	 * Adds a block at the end of the place the picker was opened from, and closes the picker.
	 */
	protected add (type: string): void {
		this.workspace.update((workspace) => addBlock(workspace, this.pickerTarget, newBlock(type, this.nextId++, this.names())));
		this.picker().nativeElement.close();
	}

	protected addScript (): void {
		this.workspace.update((workspace) => addScript(workspace, newScript(this.nextId++)));
	}

	/**
	 * Removes a script or a block, with what is inside it.
	 */
	protected remove (id: number): void {
		this.workspace.update((workspace) => removeItem(workspace, id));
	}

	protected move (id: number, offset: -1 | 1): void {
		this.workspace.update((workspace) => moveItem(workspace, id, offset));
	}

	protected setValue (id: number, key: string, value: FieldValue): void {
		this.workspace.update((workspace) => setValue(workspace, id, key, value));
	}

	protected setEvent (script: VisualScript, type: string): void {
		this.workspace.update((workspace) => setTrigger(workspace, script.id, 'every' === type ? { type: 'every', seconds: 1 } : { type: 'start' }));
	}

	protected setEvery (script: VisualScript, seconds: number): void {
		this.workspace.update((workspace) => setTrigger(workspace, script.id, { type: 'every', seconds }));
	}

	protected setFloor (value: number): void {
		this.workspace.update((workspace) => setConfig(workspace, 'floor', Number.isFinite(value) ? value : undefined));
	}

	protected setTopAnchor (value: string): void {
		this.workspace.update((workspace) => setConfig(workspace, 'topAnchor', value ? value as SideName : undefined));
	}

	/**
	 * Replaces everything with the blocks of an example.
	 */
	protected load (id: string): void {
		const example = this.examples.find((candidate) => candidate.id === id);

		if (!example)
			return;

		const { workspace, objects } = blocksFromProgram(example.program, () => this.nextId++);

		this.workspace.set(workspace);
		this.objects.set(objects);
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
		const program = this.program();

		if (program)
			this.run.emit(program);
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
