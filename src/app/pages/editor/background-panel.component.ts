import {
	ChangeDetectionStrategy,
	Component,
	OnDestroy,
	computed,
	model,
	signal,
} from '@angular/core';
import { BackgroundImages, Brightness, DEFAULT_BRIGHTNESS, Environment, FaceName, RawImage, pixelate } from '../../cube';
import { FACE_OPTIONS } from './faces';
import { ImageCropperComponent } from './image-cropper.component';
import {
	addBackground,
	backgroundNameProblem,
	backgroundsOf,
	coverOf,
	removeBackground,
	renameBackground,
	selectBackground,
	selectedBackground,
	setSelectedImages,
} from './backgrounds';
import { PixelPreviewComponent } from './pixel-preview.component';

/**
 * The faces the picture can go on, with their labels.
 */
const FACES = FACE_OPTIONS;

/**
 * The two intensities the user can set, with their labels.
 */
const LEVELS: { id: keyof Brightness; label: string }[] = [
	{ id: 'background', label: 'Background' },
	{ id: 'behindObjects', label: 'Behind objects' },
	{ id: 'objects', label: 'Objects' },
];

/**
 * Where the user handles the background of the cube. There can be several backgrounds, and a
 * program switches between them with the background blocks; the selected one is the one the cube
 * shows and the program starts with. Its pictures are made from images:
 *
 *   1. pick a picture   2. crop it to a square   3. choose the faces it goes on
 *
 * The picture is shrunk to the 64x64 of a face the way the Raspberry Pi does (see `pixelate`),
 * and the preview shows exactly that. The panel does not touch the cube: it edits the
 * environment, which the page gives to the cube. The same panel sets how intensely the background
 * and the objects shine, so the objects can stand out from the picture behind them.
 */
@Component({
	selector: 'app-background-panel',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ ImageCropperComponent, PixelPreviewComponent ],
	templateUrl: './background-panel.component.html',
})
export class BackgroundPanelComponent implements OnDestroy {
	/**
	 * The environment being edited. Two-way: the page keeps it and shows it on the cube.
	 */
	readonly environment = model<Environment>({});

	/**
	 * The backgrounds, in order.
	 */
	protected readonly backgrounds = computed(() => backgroundsOf(this.environment()));

	/**
	 * The background being edited, which is the one the program starts with.
	 */
	protected readonly current = computed(() => selectedBackground(this.environment()));

	/**
	 * The picture that stands for a background in the list.
	 */
	protected readonly coverOf = coverOf;

	/**
	 * The name being typed for the selected background, or null when it is not being renamed.
	 */
	protected readonly newName = signal<string | null>(null);

	/**
	 * Why the name being typed cannot be used, or null.
	 */
	protected readonly nameProblem = computed(() => {
		const name = this.newName();

		return null === name ? null : backgroundNameProblem(this.environment(), this.current().name, name);
	});

	/**
	 * The intensities that can be set.
	 */
	protected readonly levels = LEVELS;

	/**
	 * Ways to handle the background. More can be added here.
	 */
	protected readonly modes = [ { id: 'image', label: 'Image' } ];

	/**
	 * The way of handling the background that is selected.
	 */
	protected readonly mode = signal('image');

	/**
	 * The faces the user can choose from.
	 */
	protected readonly faces = FACES;

	/**
	 * The picture the user chose, before cropping.
	 */
	protected readonly picture = signal<ImageBitmap | null>(null);

	/**
	 * The cropped picture, already shrunk to a face. Set once the user accepts the square.
	 */
	protected readonly pixels = signal<Uint32Array | null>(null);

	/**
	 * The faces the picture will be put on or removed from.
	 */
	protected readonly selected = signal<ReadonlySet<FaceName>>(new Set());

	/**
	 * True when every face is selected.
	 */
	protected readonly allSelected = computed(() => this.selected().size === FACES.length);

	/**
	 * Whether any selected face already has a picture, so there is something to remove.
	 */
	protected readonly selectedHaveImage = computed(() =>
		[ ...this.selected() ].some((name) => this.hasImage(name)));

	/**
	 * What the last action did, or null.
	 */
	protected readonly message = signal<string | null>(null);

	/**
	 * Why the last action failed, or null.
	 */
	protected readonly problem = signal<string | null>(null);

	/**
	 * Releases the picture.
	 */
	ngOnDestroy (): void {
		this.picture()?.close();
	}

	/**
	 * Selects a background: the cube shows it, and the program starts with it.
	 */
	protected select (name: string): void {
		this.newName.set(null);
		this.environment.update((environment) => selectBackground(environment, name));
		this.message.set(null);
	}

	/**
	 * Adds a background without pictures and selects it, ready to get some.
	 */
	protected add (): void {
		this.newName.set(null);
		this.environment.update((environment) => addBackground(environment));
		this.message.set(null);
	}

	/**
	 * Removes the selected background. There is always at least one.
	 */
	protected removeSelected (): void {
		const name = this.current().name;

		this.newName.set(null);
		this.environment.update((environment) => removeBackground(environment, name));
		this.message.set(`Removed "${name}".`);
	}

	/**
	 * Starts renaming the selected background.
	 */
	protected startRename (): void {
		this.newName.set(this.current().name);
	}

	/**
	 * Gives the selected background the name typed, if it can have it.
	 */
	protected saveName (): void {
		const name = this.newName();

		if (null === name || this.nameProblem())
			return;

		this.environment.update((environment) => renameBackground(environment, this.current().name, name));
		this.newName.set(null);
	}

	/**
	 * True when the selected background has a picture on the face.
	 */
	protected hasImage (name: FaceName): boolean {
		return !!this.current().images[name];
	}

	/**
	 * The intensity of the background or of the objects, as a percentage.
	 */
	protected percent (id: keyof Brightness): number {
		return Math.round((this.environment().brightness?.[id] ?? 1) * 100);
	}

	/**
	 * Sets the intensity of the background or of the objects, from a percentage.
	 */
	protected setLevel (id: keyof Brightness, percent: number): void {
		this.environment.update((environment) => ({
			...environment,
			brightness: { ...environment.brightness, [id]: Math.min(100, Math.max(0, percent)) / 100 },
		}));
	}

	/**
	 * Goes back to the usual intensities: everything at full, but the background softer (40%) on a
	 * face that has objects.
	 */
	protected resetLevels (): void {
		this.environment.update((environment) => ({ ...environment, brightness: { ...DEFAULT_BRIGHTNESS } }));
	}

	/**
	 * Reads the file the user picked and shows it for cropping.
	 */
	protected async pick (event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';

		if (!file)
			return;

		this.problem.set(null);

		try {
			const picture = await createImageBitmap(file);

			this.discard();
			this.picture.set(picture);
		}

		catch {
			this.problem.set('That file could not be read as a picture.');
		}
	}

	/**
	 * Shrinks the cropped square to the size of a face.
	 */
	protected crop (cropped: RawImage): void {
		this.pixels.set(pixelate(cropped));
		this.message.set(null);
	}

	/**
	 * Goes back to choosing a picture.
	 */
	protected discard (): void {
		this.picture()?.close();
		this.picture.set(null);
		this.pixels.set(null);
		this.message.set(null);
	}

	/**
	 * Adds the face to the selection, or removes it when already selected.
	 */
	protected toggle (name: FaceName): void {
		const selected = new Set(this.selected());

		if (!selected.delete(name))
			selected.add(name);

		this.selected.set(selected);
	}

	/**
	 * Selects every face, or none when all are selected.
	 */
	protected toggleAll (): void {
		this.selected.set(this.allSelected() ? new Set() : new Set(FACES.map((face) => face.name)));
	}

	/**
	 * Makes the picture the one of the selected background, on the selected faces only. It replaces
	 * the picture the background had: the faces that showed it and are not selected now are cleared.
	 * Different pictures on different faces are different backgrounds, which combine on the cube.
	 */
	protected apply (): void {
		const pixels = this.pixels();
		if (!pixels || 0 === this.selected().size)
			return;

		const background: BackgroundImages = {};
		for (const name of this.selected())
			background[name] = pixels;

		this.environment.update((environment) => setSelectedImages(environment, background));
		this.message.set(`Put on ${this.describe(this.selected())}.`);
	}

	/**
	 * Takes the picture off the selected faces.
	 */
	protected remove (): void {
		const background: BackgroundImages = { ...this.current().images };
		for (const name of this.selected())
			delete background[name];

		this.environment.update((environment) => setSelectedImages(environment, background));
		this.message.set(`Cleared ${this.describe(this.selected())}.`);
	}

	/**
	 * Lists the faces in plain words, for the messages.
	 */
	private describe (names: ReadonlySet<FaceName>): string {
		return FACES.filter((face) => names.has(face.name)).map((face) => face.label.toLowerCase()).join(', ');
	}
}
