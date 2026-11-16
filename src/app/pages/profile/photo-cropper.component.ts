import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, input, linkedSignal, output, viewChild } from '@angular/core';
import { Crop, CropView, MAX_ZOOM, PictureSize, centeredView, clampView, cropOf, drawCrop } from './profile-photo';

/**
 * Part of the visible square that an arrow key moves the picture.
 */
const KEY_STEP = 0.05;

/**
 * How much one step of the + and − keys or buttons zooms, as a factor.
 */
const KEY_ZOOM = 1.15;

/**
 * How fast the mouse wheel zooms: the zoom is multiplied by e to this times the pixels scrolled.
 */
const WHEEL_SPEED = 0.0015;

/**
 * A picture the cropper can show: something to draw, with its size.
 */
export type CropPicture = CanvasImageSource & PictureSize;

/**
 * A finger or mouse button holding the picture.
 */
type Grip = {
	/**
	 * Which pointer it is.
	 */
	pointer: number;

	/**
	 * Where it was last, from the left of the window, in screen pixels.
	 */
	x: number;

	/**
	 * Where it was last, from the top of the window, in screen pixels.
	 */
	y: number;
};

/**
 * Lets the user frame their profile photo: the picture fills a square with a circle over it,
 * showing what the avatar will show. It is dragged (or moved with the arrow keys) and zoomed
 * (with the slider, the mouse wheel or + and −), never so far that the circle has empty parts.
 */
@Component({
	selector: 'app-photo-cropper',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './photo-cropper.component.html',
})
export class PhotoCropperComponent {
	/**
	 * The picture to frame.
	 */
	readonly picture = input.required<CropPicture>();

	/**
	 * True while the photo is being saved: the buttons wait.
	 */
	readonly busy = input(false);

	/**
	 * Why saving the photo failed, or null.
	 */
	readonly problem = input<string | null>(null);

	/**
	 * The square of the picture the user chose, in its pixels.
	 */
	readonly cropped = output<Crop>();

	/**
	 * The user gave up on this picture.
	 */
	readonly cancelled = output<void>();

	/**
	 * Most it zooms in.
	 */
	protected readonly maxZoom = MAX_ZOOM;

	/**
	 * How the picture is framed. A new picture starts on its middle, not zoomed in.
	 */
	protected readonly view = linkedSignal(() => centeredView(this.picture()));

	/**
	 * The square the picture is shown in.
	 */
	private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');

	/**
	 * The canvas the framed picture is drawn on.
	 */
	private readonly preview = viewChild.required<ElementRef<HTMLCanvasElement>>('preview');

	/**
	 * The pointer dragging the picture, or null.
	 */
	private grip: Grip | null = null;

	constructor () {
		afterRenderEffect(() => drawCrop(this.preview().nativeElement, this.picture(), cropOf(this.picture(), this.view())));
	}

	/**
	 * Zooms to the value of the slider.
	 */
	protected slide (event: Event): void {
		this.change({ zoom: Number((event.target as HTMLInputElement).value) });
	}

	/**
	 * Starts dragging the picture.
	 */
	protected grab (event: PointerEvent): void {
		if (this.grip || (0 !== event.button && 'mouse' === event.pointerType))
			return;

		this.frame().nativeElement.setPointerCapture?.(event.pointerId);
		this.grip = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
	}

	/**
	 * Moves the picture with the pointer dragging it, so the point under it stays under it.
	 */
	protected drag (event: PointerEvent): void {
		if (event.pointerId !== this.grip?.pointer)
			return;

		const side = this.frame().nativeElement.getBoundingClientRect().width;

		if (0 < side)
			this.pan((event.clientX - this.grip.x) / side, (event.clientY - this.grip.y) / side);

		this.grip = { ...this.grip, x: event.clientX, y: event.clientY };
	}

	/**
	 * Stops dragging the picture.
	 */
	protected release (event: PointerEvent): void {
		if (event.pointerId === this.grip?.pointer)
			this.grip = null;
	}

	/**
	 * Zooms with the mouse wheel or the touchpad.
	 */
	protected wheel (event: WheelEvent): void {
		event.preventDefault();
		this.change({ zoom: this.view().zoom * Math.exp(-event.deltaY * WHEEL_SPEED) });
	}

	/**
	 * Moves the picture with the arrow keys and zooms with + and −.
	 */
	protected key (event: KeyboardEvent): void {
		const moves: Record<string, [number, number]> = {
			ArrowLeft: [ KEY_STEP, 0 ],
			ArrowRight: [ -KEY_STEP, 0 ],
			ArrowUp: [ 0, KEY_STEP ],
			ArrowDown: [ 0, -KEY_STEP ],
		};
		const move = moves[event.key];

		if (move)
			this.pan(...move);

		else if ('+' === event.key || '=' === event.key)
			this.zoomIn();

		else if ('-' === event.key)
			this.zoomOut();

		else
			return;

		event.preventDefault();
	}

	/**
	 * Zooms in one step.
	 */
	protected zoomIn (): void {
		this.change({ zoom: this.view().zoom * KEY_ZOOM });
	}

	/**
	 * Zooms out one step.
	 */
	protected zoomOut (): void {
		this.change({ zoom: this.view().zoom / KEY_ZOOM });
	}

	/**
	 * Hands out the square the user framed.
	 */
	protected save (): void {
		this.cropped.emit(cropOf(this.picture(), this.view()));
	}

	/**
	 * Moves the picture, by parts of the visible square: 1 moves it by the whole square.
	 */
	private pan (right: number, down: number): void {
		const { width, height } = this.picture();
		const { zoom, centerX, centerY } = this.view();
		const side = Math.min(width, height) / zoom;

		/**
		 * The picture moves one way, so the point in the middle of the circle moves the other.
		 */
		this.change({ centerX: centerX - right * side, centerY: centerY - down * side });
	}

	/**
	 * Changes the view, keeping it inside the picture.
	 */
	private change (changes: Partial<CropView>): void {
		this.view.update((view) => clampView(this.picture(), { ...view, ...changes }));
	}
}
