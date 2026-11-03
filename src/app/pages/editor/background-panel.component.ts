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
	{ id: 'objects', label: 'Objects' },
];

/**
 * Where the user handles the background of the cube. The way to do it for now is an image:
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
	 * True when the face already has a picture.
	 */
	protected hasImage (name: FaceName): boolean {
		return !!this.environment().background?.[name];
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
	 * Goes back to the usual intensities: objects at full, background softer.
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
	 * Puts the picture on the selected faces. Pictures on the other faces are kept.
	 */
	protected apply (): void {
		const pixels = this.pixels();
		if (!pixels || 0 === this.selected().size)
			return;

		const background: BackgroundImages = { ...this.environment().background };
		for (const name of this.selected())
			background[name] = pixels;

		this.environment.update((environment) => ({ ...environment, background }));
		this.message.set(`Put on ${this.describe(this.selected())}.`);
	}

	/**
	 * Takes the picture off the selected faces.
	 */
	protected remove (): void {
		const background: BackgroundImages = { ...this.environment().background };
		for (const name of this.selected())
			delete background[name];

		this.environment.update((environment) => ({ ...environment, background }));
		this.message.set(`Cleared ${this.describe(this.selected())}.`);
	}

	/**
	 * Lists the faces in plain words, for the messages.
	 */
	private describe (names: ReadonlySet<FaceName>): string {
		return FACES.filter((face) => names.has(face.name)).map((face) => face.label.toLowerCase()).join(', ');
	}
}
