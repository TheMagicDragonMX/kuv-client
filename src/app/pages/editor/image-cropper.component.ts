import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	afterRenderEffect,
	computed,
	input,
	linkedSignal,
	output,
	viewChild,
} from '@angular/core';
import { RawImage } from '../../cube';
import { MAX_ZOOM, centerOf, cropOf } from './crop';

/**
 * Size, in pixels, the crop window is drawn at. The element scales to the width it is given.
 */
const WINDOW = 480;

/**
 * Biggest side, in pixels, of the picture handed back. A bigger crop is shrunk to this first,
 * only to keep the work small: the final shrinking to a face is done by `pixelate`.
 */
const MAX_OUTPUT = 1024;

/**
 * Lets the user choose a square part of a picture: drag to move, wheel or slider to zoom. It
 * knows nothing about cubes; it hands back the pixels of the part that was chosen.
 */
@Component({
	selector: 'app-image-cropper',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './image-cropper.component.html',
})
export class ImageCropperComponent {
	/**
	 * The picture to crop.
	 */
	readonly image = input.required<ImageBitmap>();

	/**
	 * The user is happy with the square: here are its pixels.
	 */
	readonly cropped = output<RawImage>();

	/**
	 * The user wants to choose another picture.
	 */
	readonly cancelled = output<void>();

	protected readonly maxZoom = MAX_ZOOM;

	protected readonly windowSize = WINDOW;

	/**
	 * A new picture starts unzoomed.
	 */
	protected readonly zoom = linkedSignal({ source: this.image, computation: () => 1 });

	/**
	 * Center of the window, in pixels of the picture. `null` until the user moves it, which
	 * means the middle of the picture (so a new picture always starts centered).
	 */
	private readonly center = linkedSignal<ImageBitmap, { x: number; y: number } | null>({
		source: this.image,
		computation: () => null,
	});

	private readonly crop = computed(() => {
		const { width, height } = this.image();
		const center = this.center() ?? { x: width / 2, y: height / 2 };

		return cropOf(width, height, this.zoom(), center.x, center.y);
	});

	private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

	private drag: { x: number; y: number } | null = null;

	constructor () {
		afterRenderEffect(() => {
			const { x, y, side } = this.crop();
			const canvas = this.canvas().nativeElement;
			const context = canvas.getContext('2d');

			if (!context)
				return;

			context.imageSmoothingQuality = 'high';
			context.drawImage(this.image(), x, y, side, side, 0, 0, canvas.width, canvas.height);
		});
	}

	protected setZoom (value: number): void {
		this.zoomTo(value);
	}

	protected wheel (event: WheelEvent): void {
		event.preventDefault();
		this.setZoom(this.zoom() * (0 > event.deltaY ? 1.1 : 1 / 1.1));
	}

	protected pointerDown (event: PointerEvent): void {
		this.drag = { x: event.clientX, y: event.clientY };
		(event.target as HTMLElement).setPointerCapture(event.pointerId);
	}

	protected pointerMove (event: PointerEvent): void {
		if (!this.drag)
			return;

		// The picture follows the pointer, so the window goes the other way.
		const crop = this.crop();
		const scale = crop.side / (event.target as HTMLElement).getBoundingClientRect().width;
		const center = centerOf(crop);

		this.center.set(centerOf(cropOf(
			this.image().width,
			this.image().height,
			this.zoom(),
			center.x - (event.clientX - this.drag.x) * scale,
			center.y - (event.clientY - this.drag.y) * scale,
		)));
		this.drag = { x: event.clientX, y: event.clientY };
	}

	protected pointerUp (): void {
		this.drag = null;
	}

	protected key (event: KeyboardEvent): void {
		const arrows: Record<string, [ number, number ]> = {
			ArrowLeft: [ -1, 0 ],
			ArrowRight: [ 1, 0 ],
			ArrowUp: [ 0, -1 ],
			ArrowDown: [ 0, 1 ],
		};
		const direction = arrows[event.key];

		if (!direction)
			return;

		event.preventDefault();

		const crop = this.crop();
		const center = centerOf(crop);

		this.center.set(centerOf(cropOf(
			this.image().width,
			this.image().height,
			this.zoom(),
			center.x + direction[0] * crop.side / 20,
			center.y + direction[1] * crop.side / 20,
		)));
	}

	/**
	 * Hands back the pixels of the chosen square.
	 */
	protected confirm (): void {
		const { x, y, side } = this.crop();
		const size = Math.max(1, Math.min(Math.round(side), MAX_OUTPUT));

		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;

		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (!context)
			return;

		context.imageSmoothingQuality = 'high';
		context.drawImage(this.image(), x, y, side, side, 0, 0, size, size);

		const { width, height, data } = context.getImageData(0, 0, size, size);
		this.cropped.emit({ width, height, data });
	}

	/**
	 * Changes the zoom keeping the center of the window where it is.
	 */
	private zoomTo (zoom: number): void {
		this.center.set(centerOf(this.crop()));
		this.zoom.set(Math.min(Math.max(zoom, 1), MAX_ZOOM));
	}
}
