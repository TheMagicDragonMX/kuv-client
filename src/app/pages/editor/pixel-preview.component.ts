import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, input, viewChild } from '@angular/core';
import { FACE_RESOLUTION } from '../../cube';

/**
 * Shows the pixels of one face the way the LEDs will: 64 by 64, each pixel a visible square.
 * Give it the size you want with CSS (it is a square canvas that scales without smoothing).
 */
@Component({
	selector: 'app-pixel-preview',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'inline-block' },
	template: `
		<canvas
			#canvas
			class="block h-full w-full rounded-[inherit] [image-rendering:pixelated]"
			[width]="resolution"
			[height]="resolution"
			role="img"
			[attr.aria-label]="label()"
		></canvas>
	`,
})
export class PixelPreviewComponent {
	/**
	 * `FACE_RESOLUTION * FACE_RESOLUTION` colors packed as 0xRRGGBB, row after row.
	 */
	readonly pixels = input.required<ArrayLike<number>>();

	readonly label = input('The picture as the cube will show it, 64 by 64 pixels');

	protected readonly resolution = FACE_RESOLUTION;

	private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

	constructor () {
		afterRenderEffect(() => {
			const pixels = this.pixels();
			const context = this.canvas().nativeElement.getContext('2d');

			if (context)
				context.putImageData(toImageData(pixels), 0, 0);
		});
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
