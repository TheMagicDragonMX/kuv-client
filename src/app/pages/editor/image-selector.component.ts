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
import { Corner, Point, Rect, grabOf, moveRect, rectBetween, resizeRect, wholeImage } from './selection';

/**
 * Longest side, in pixels, the picture is drawn at on screen. The element scales to the width
 * it is given.
 */
const VIEW = 480;

/**
 * Longest side, in pixels, of the part handed back. A bigger part is shrunk to this, only to
 * keep the work small; a smaller one is handed back as it is, never stretched.
 */
const MAX_OUTPUT = 1024;

/**
 * How near, on screen, a press has to be to a corner to grab it.
 */
const REACH_ON_SCREEN = 14;

/**
 * Lets the user choose the part of a picture to keep: drag on the picture to draw a rectangle,
 * drag inside it to move it and drag its corners to resize it. It knows nothing about objects;
 * it hands back the pixels of the part that was chosen, cut from the original picture so no
 * detail is lost before the picture is made smaller.
 */
@Component({
	selector: 'app-image-selector',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './image-selector.component.html',
})
export class ImageSelectorComponent {
	/**
	 * The picture to choose a part of.
	 */
	readonly image = input.required<ImageBitmap>();

	/**
	 * The user is happy with the rectangle: here are its pixels.
	 */
	readonly selected = output<RawImage>();

	/**
	 * The user does not want to use this picture.
	 */
	readonly cancelled = output<void>();

	/**
	 * The part of the picture that is kept, in pixels of the picture. A new picture starts with
	 * all of it.
	 */
	protected readonly rect = linkedSignal<ImageBitmap, Rect>({
		source: this.image,
		computation: (image) => wholeImage(image),
	});

	/**
	 * Size the picture is drawn at on screen.
	 */
	protected readonly view = computed(() => {
		const { width, height } = this.image();
		const scale = VIEW / Math.max(width, height);

		return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
	});

	/**
	 * The rectangle as shares of the picture, to place it over the canvas whatever its size.
	 */
	protected readonly frame = computed(() => {
		const { width, height } = this.image();
		const { x, y, width: across, height: down } = this.rect();

		return {
			left: `${x / width * 100}%`,
			top: `${y / height * 100}%`,
			width: `${across / width * 100}%`,
			height: `${down / height * 100}%`,
		};
	});

	/**
	 * The size of the part that is kept, as shown to the user.
	 */
	protected readonly size = computed(() => `${Math.round(this.rect().width)} × ${Math.round(this.rect().height)} px`);

	/**
	 * True while the rectangle is all of the picture.
	 */
	protected readonly whole = computed(() => {
		const { x, y, width, height } = this.rect();

		return 0 === x && 0 === y && width === this.image().width && height === this.image().height;
	});

	/**
	 * The canvas that shows the picture.
	 */
	private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

	/**
	 * What the pointer is doing while it is pressed: what it grabbed, and the rectangle and the
	 * point at the moment it was pressed.
	 */
	private drag: { grab: Corner | 'move' | 'new'; start: Point; rect: Rect } | null = null;

	/**
	 * Draws the picture whenever it changes.
	 */
	constructor () {
		afterRenderEffect(() => {
			const canvas = this.canvas().nativeElement;
			const context = canvas.getContext('2d');

			if (!context)
				return;

			context.imageSmoothingQuality = 'high';
			context.drawImage(this.image(), 0, 0, canvas.width, canvas.height);
		});
	}

	/**
	 * Starts moving, resizing or drawing the rectangle, depending on where the press is.
	 */
	protected pointerDown (event: PointerEvent): void {
		const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const point = this.pointOf(event, box);
		const reach = REACH_ON_SCREEN * this.image().width / box.width;

		this.drag = { grab: grabOf(this.rect(), point, reach), start: point, rect: this.rect() };
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	/**
	 * Follows the pointer while it is pressed.
	 */
	protected pointerMove (event: PointerEvent): void {
		const drag = this.drag;

		if (!drag)
			return;

		const bounds = this.image();
		const point = this.pointOf(event, (event.currentTarget as HTMLElement).getBoundingClientRect());

		if ('move' === drag.grab)
			this.rect.set(moveRect(drag.rect, point.x - drag.start.x, point.y - drag.start.y, bounds));

		else if ('new' === drag.grab)
			this.rect.set(rectBetween(drag.start, point, bounds));

		else
			this.rect.set(resizeRect(drag.rect, drag.grab, point, bounds));
	}

	/**
	 * Stops following the pointer.
	 */
	protected pointerUp (): void {
		this.drag = null;
	}

	/**
	 * Moves the rectangle with the arrow keys, or resizes it with Shift.
	 */
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

		const bounds = this.image();
		const rect = this.rect();
		const dx = direction[0] * bounds.width / 50;
		const dy = direction[1] * bounds.height / 50;

		this.rect.set(event.shiftKey
			? resizeRect(rect, 'se', { x: rect.x + rect.width + dx, y: rect.y + rect.height + dy }, bounds)
			: moveRect(rect, dx, dy, bounds));
	}

	/**
	 * Goes back to the whole picture.
	 */
	protected selectAll (): void {
		this.rect.set(wholeImage(this.image()));
	}

	/**
	 * Hands back the pixels of the chosen part, cut from the original picture.
	 */
	protected confirm (): void {
		const { x, y, width, height } = this.rect();
		const sourceX = Math.round(x);
		const sourceY = Math.round(y);
		const sourceWidth = Math.max(1, Math.round(width));
		const sourceHeight = Math.max(1, Math.round(height));
		const scale = Math.min(1, MAX_OUTPUT / Math.max(sourceWidth, sourceHeight));
		const canvas = document.createElement('canvas');

		canvas.width = Math.max(1, Math.round(sourceWidth * scale));
		canvas.height = Math.max(1, Math.round(sourceHeight * scale));

		const context = canvas.getContext('2d', { willReadFrequently: true });

		if (!context)
			return;

		context.imageSmoothingQuality = 'high';
		context.drawImage(this.image(), sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

		const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

		this.selected.emit({ width: canvas.width, height: canvas.height, data });
	}

	/**
	 * Where a pointer event is on the picture, in pixels of the picture.
	 */
	private pointOf (event: PointerEvent, box: DOMRect): Point {
		return {
			x: (event.clientX - box.left) / box.width * this.image().width,
			y: (event.clientY - box.top) / box.height * this.image().height,
		};
	}
}
