import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	OnDestroy,
	afterRenderEffect,
	computed,
	model,
	signal,
	viewChild,
} from '@angular/core';
import {
	BackgroundImages,
	Environment,
	FACE_RESOLUTION,
	FaceBackground,
	FaceName,
	isAnimation,
	pixelate,
} from '../../cube';
import { CroppedPicture, ImageCropperComponent } from './image-cropper.component';
import { FRAMES_PER_SECOND, MAX_SECONDS, OpenedVideo, closeVideo, extractFrames, openVideo } from './video-frames';

/**
 * The faces a picture or video can go on, in the order they are shown.
 */
const FACES: { name: FaceName; label: string }[] = [
	{ name: 'FRONT', label: 'Front' },
	{ name: 'RIGHT', label: 'Right' },
	{ name: 'BACK', label: 'Back' },
	{ name: 'LEFT', label: 'Left' },
	{ name: 'TOP', label: 'Top' },
];

/**
 * Where the user handles the background of the cube. The way to do it for now is a picture or
 * a video:
 *
 *   1. pick a file   2. crop it to a square   3. choose the faces it goes on
 *
 * A picture is shrunk to the 64x64 of a face the way the Raspberry Pi does (see `pixelate`), and
 * the preview shows exactly that. A video is cropped on its first frame, then cut into frames
 * with the same square (see `video-frames.ts`), and the preview plays them. The panel does not
 * touch the cube: it edits the environment, which the page gives to the cube.
 */
@Component({
	selector: 'app-background-panel',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ ImageCropperComponent ],
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
	protected readonly modes = [ { id: 'image', label: 'Picture or video' } ];

	protected readonly mode = signal('image');

	protected readonly faces = FACES;

	protected readonly framesPerSecond = FRAMES_PER_SECOND;

	protected readonly maxSeconds = MAX_SECONDS;

	/**
	 * What the user chose, before cropping: the picture, or the first frame of the video.
	 */
	protected readonly picture = signal<ImageBitmap | null>(null);

	/**
	 * The video the user chose, if it is one, until its frames have been read.
	 */
	private video: OpenedVideo | null = null;

	/**
	 * The cropped result, ready to go on the faces: pixels, or frames. Set once the user accepts
	 * the square (for a video, once all its frames have been read).
	 */
	protected readonly media = signal<FaceBackground | null>(null);

	protected readonly isVideo = computed(() => {
		const media = this.media();

		return null !== media && isAnimation(media);
	});

	/**
	 * How many frames of the video are read out of how many, while that happens.
	 */
	protected readonly progress = signal<{ done: number; total: number } | null>(null);

	protected readonly selected = signal<ReadonlySet<FaceName>>(new Set());

	protected readonly allSelected = computed(() => this.selected().size === FACES.length);

	/**
	 * Whether any selected face already has something, so there is something to remove.
	 */
	protected readonly selectedHaveMedia = computed(() =>
		[ ...this.selected() ].some((name) => 'plain' !== this.kindOf(name)));

	protected readonly message = signal<string | null>(null);

	protected readonly problem = signal<string | null>(null);

	private readonly preview = viewChild<ElementRef<HTMLCanvasElement>>('preview');

	/**
	 * Goes up on every new file and on discard, so work for a file nobody wants any more stops.
	 */
	private job = 0;

	constructor () {
		afterRenderEffect((onCleanup) => {
			const media = this.media();
			const context = this.preview()?.nativeElement.getContext('2d');

			if (!media || !context)
				return;

			if (!isAnimation(media)) {
				context.putImageData(toImageData(media), 0, 0);
				return;
			}

			let index = 0;
			const draw = (): void => {
				context.putImageData(toImageData(media.frames[index]), 0, 0);
				index = (index + 1) % media.frames.length;
			};

			draw();
			const timer = setInterval(draw, 1000 / media.fps);
			onCleanup(() => clearInterval(timer));
		});
	}

	ngOnDestroy (): void {
		this.discard();
	}

	/**
	 * What a face of the cube shows now.
	 */
	protected kindOf (name: FaceName): 'plain' | 'picture' | 'video' {
		const face = this.environment().background?.[name];

		if (!face)
			return 'plain';

		return isAnimation(face) ? 'video' : 'picture';
	}

	protected async pick (event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';

		if (!file)
			return;

		this.problem.set(null);

		try {
			if (file.type.startsWith('video/')) {
				const video = await openVideo(file);

				this.discard();
				this.video = video;
				this.picture.set(video.poster);
			}

			else {
				const picture = await createImageBitmap(file);

				this.discard();
				this.picture.set(picture);
			}
		}

		catch {
			this.problem.set('That file could not be read as a picture or a video.');
		}
	}

	protected async crop ({ pixels, crop }: CroppedPicture): Promise<void> {
		this.message.set(null);

		const video = this.video;
		if (!video) {
			this.media.set(pixelate(pixels));
			return;
		}

		const job = ++this.job;
		this.progress.set({ done: 0, total: 1 });

		try {
			const frames = await extractFrames(
				video,
				crop,
				(done, total) => this.progress.set({ done, total }),
				() => job !== this.job,
			);

			if (frames) {
				this.media.set({ frames, fps: FRAMES_PER_SECOND });
				this.releaseVideo();
			}
		}

		catch {
			this.problem.set('The video could not be read.');
			this.discard();
		}

		finally {
			if (job === this.job)
				this.progress.set(null);
		}
	}

	/**
	 * Goes back to choosing a file.
	 */
	protected discard (): void {
		this.job += 1;
		this.releaseVideo();
		this.picture()?.close();
		this.picture.set(null);
		this.media.set(null);
		this.progress.set(null);
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
	 * Puts the picture or video on the selected faces. What is on the other faces is kept.
	 */
	protected apply (): void {
		const media = this.media();
		if (!media || 0 === this.selected().size)
			return;

		const background: BackgroundImages = { ...this.environment().background };
		for (const name of this.selected())
			background[name] = media;

		this.environment.update((environment) => ({ ...environment, background }));
		this.message.set(`Put on ${this.describe(this.selected())}.`);
	}

	/**
	 * Takes the picture or video off the selected faces.
	 */
	protected remove (): void {
		const background: BackgroundImages = { ...this.environment().background };
		for (const name of this.selected())
			delete background[name];

		this.environment.update((environment) => ({ ...environment, background }));
		this.message.set(`Cleared ${this.describe(this.selected())}.`);
	}

	/**
	 * Lets go of the video file once nothing needs it.
	 */
	private releaseVideo (): void {
		if (this.video) {
			closeVideo(this.video);
			this.video = null;
		}
	}

	private describe (names: ReadonlySet<FaceName>): string {
		return FACES.filter((face) => names.has(face.name)).map((face) => face.label.toLowerCase()).join(', ');
	}
}

/**
 * The pixels of a face as something a canvas can show.
 */
function toImageData (pixels: ArrayLike<number>): ImageData {
	const image = new ImageData(FACE_RESOLUTION, FACE_RESOLUTION);

	for (let index = 0; index < pixels.length; index += 1) {
		const color = pixels[index];

		image.data[index * 4] = color >> 16 & 0xff;
		image.data[index * 4 + 1] = color >> 8 & 0xff;
		image.data[index * 4 + 2] = color & 0xff;
		image.data[index * 4 + 3] = 255;
	}

	return image;
}
