import {
	ChangeDetectionStrategy,
	Component,
	OnDestroy,
	computed,
	model,
	signal,
} from '@angular/core';
import { BackgroundImages, Environment, FaceName, RawImage, pixelate } from '../../cube';
import { FACE_OPTIONS } from './faces';
import { ImageCropperComponent } from './image-cropper.component';
import { PixelPreviewComponent } from './pixel-preview.component';

const FACES = FACE_OPTIONS;

/**
 * Where the user handles the background of the cube. The way to do it for now is an image:
 *
 *   1. pick a picture   2. crop it to a square   3. choose the faces it goes on
 *
 * The picture is shrunk to the 64x64 of a face the way the Raspberry Pi does (see `pixelate`),
 * and the preview shows exactly that. The panel does not touch the cube: it edits the
 * environment, which the page gives to the cube.
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
	 * Ways to handle the background. More can be added here.
	 */
	protected readonly modes = [ { id: 'image', label: 'Image' } ];

	protected readonly mode = signal('image');

	protected readonly faces = FACES;

	/**
	 * The picture the user chose, before cropping.
	 */
	protected readonly picture = signal<ImageBitmap | null>(null);

	/**
	 * The cropped picture, already shrunk to a face. Set once the user accepts the square.
	 */
	protected readonly pixels = signal<Uint32Array | null>(null);

	protected readonly selected = signal<ReadonlySet<FaceName>>(new Set());

	protected readonly allSelected = computed(() => this.selected().size === FACES.length);

	/**
	 * Whether any selected face already has a picture, so there is something to remove.
	 */
	protected readonly selectedHaveImage = computed(() =>
		[ ...this.selected() ].some((name) => this.hasImage(name)));

	protected readonly message = signal<string | null>(null);

	protected readonly problem = signal<string | null>(null);

	ngOnDestroy (): void {
		this.picture()?.close();
	}

	protected hasImage (name: FaceName): boolean {
		return !!this.environment().background?.[name];
	}

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

	protected toggle (name: FaceName): void {
		const selected = new Set(this.selected());

		if (!selected.delete(name))
			selected.add(name);

		this.selected.set(selected);
	}

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

	private describe (names: ReadonlySet<FaceName>): string {
		return FACES.filter((face) => names.has(face.name)).map((face) => face.label.toLowerCase()).join(', ');
	}
}
