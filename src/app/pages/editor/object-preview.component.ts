import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, input, viewChild } from '@angular/core';
import { CreateCommand } from '../../cube';
import { pictureOfObject } from './stage-object';

/**
 * Shows an object as the LEDs will: its pixels, cropped to the cells it uses, each a visible
 * square. Give it the size you want with CSS; the picture scales without smoothing and keeps its
 * proportions.
 */
@Component({
	selector: 'app-object-preview',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'inline-flex items-center justify-center' },
	template: `
		<canvas
			#canvas
			class="max-h-full max-w-full [image-rendering:pixelated]"
			[style.aspect-ratio]="picture().width + ' / ' + picture().height"
			[width]="picture().width"
			[height]="picture().height"
			role="img"
			[attr.aria-label]="'The object ' + object().name"
		></canvas>
	`,
})
export class ObjectPreviewComponent {
	readonly object = input.required<CreateCommand>();

	protected readonly picture = computed(() => pictureOfObject(this.object()));

	private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

	constructor () {
		afterRenderEffect(() => {
			const { width, height, colors } = this.picture();
			const context = this.canvas().nativeElement.getContext('2d');

			if (!context)
				return;

			const image = new ImageData(width, height);

			colors.forEach((color, index) => {
				if (null === color)
					return;

				image.data[index * 4] = color >> 16 & 0xff;
				image.data[index * 4 + 1] = color >> 8 & 0xff;
				image.data[index * 4 + 2] = color & 0xff;
				image.data[index * 4 + 3] = 255;
			});

			context.putImageData(image, 0, 0);
		});
	}
}
