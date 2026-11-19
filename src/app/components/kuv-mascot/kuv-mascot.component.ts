import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, afterRenderEffect, inject, input, viewChild } from '@angular/core';
import { sprite } from '../led-cube-backdrop/led-scenes';

/**
 * How the mascot feels: calm, sad (something went wrong) or happy (something went right).
 */
export type MascotMood = 'calm' | 'sad' | 'happy';

/**
 * Side of the sprite, in pixels.
 */
const SIDE = 16;

/**
 * Milliseconds between two blinks.
 */
const BLINK_EVERY = 3400;

/**
 * Milliseconds the eyes stay closed in a blink.
 */
const BLINK_TIME = 160;

/**
 * The colors of the sprite: outline, highlight, body, shade, eyes, sparkle, blush and mouth.
 */
const PALETTE = { O: '#2a1730', H: '#c8f6fb', C: '#7de6f4', d: '#3fbfd3', E: '#2a1730', W: '#ffffff', B: '#ff9fd4', M: '#2a1730' };

/**
 * Rows 4 to 7 of the inside of the cube, the eyes and the mouth, for each mood and for the blink.
 */
const FACES: Record<MascotMood | 'blink', string[]> = {
	calm: [ 'CCCWECCCCWECCd', 'CCCEECCCCEECCd', 'CBBCCMCCMCCBBd', 'CCCCCCMMCCCCCd' ],
	blink: [ 'CCCCCCCCCCCCCd', 'CCCEECCCCEECCd', 'CBBCCMCCMCCBBd', 'CCCCCCMMCCCCCd' ],
	sad: [ 'CCCCCCCCCCCCCd', 'CCCEECCCCEECCd', 'CBBCCCMMCCCBBd', 'CCCCCMCCMCCCCd' ],
	happy: [ 'CCCEECCCCEECCd', 'CCECCECCECCECd', 'CBBCCMMMMCCBBd', 'CCCCCCMMCCCCCd' ],
};

/**
 * The rows of the whole sprite with a face.
 */
function rows (face: string[]): string[] {
	const inside = [ 'HCCCCCCCCCCCCd', 'CCCCCCCCCCCCCd', 'CCCCCCCCCCCCCd', ...face, 'CCCCCCCCCCCCCd', 'CCCCCCCCCCCCCd', 'CCCCCCCCCCCCCd', 'dddddddddddddd' ];
	return [ '..OOOOOOOOOOOO..', '.OHHHHHHHHHHHHO.', ...inside.map((row) => `O${row}O`), '.OOOOOOOOOOOOOO.' ];
}

/**
 * The mascot of Kü-V: a little kawaii cube with a pixel face that floats, blinks now and then and
 * shows a mood. It fills its host, so the size is set where it is used. It is only decoration.
 */
@Component({
	selector: 'app-kuv-mascot',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'block shrink-0', 'aria-hidden': 'true' },
	template: `<canvas #canvas width="16" height="16" class="block size-full motion-safe:animate-mascot-float [image-rendering:pixelated]"></canvas>`,
})
export class KuvMascotComponent {
	/**
	 * How the mascot feels.
	 */
	readonly mood = input<MascotMood>('calm');

	/**
	 * The canvas the sprite is drawn on.
	 */
	private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

	/**
	 * Draws the face of the mood when it changes, and blinks while calm.
	 */
	constructor () {
		const destroyRef = inject(DestroyRef);

		afterRenderEffect(() => this.draw(this.mood()));

		afterNextRender(() => {
			if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
				return;

			let opening: ReturnType<typeof setTimeout> | undefined;
			const blinking = setInterval(() => {
				if ('calm' !== this.mood())
					return;

				this.draw('blink');
				opening = setTimeout(() => this.draw(this.mood()), BLINK_TIME);
			}, BLINK_EVERY);

			destroyRef.onDestroy(() => {
				clearInterval(blinking);
				clearTimeout(opening);
			});
		});
	}

	/**
	 * Draws the cube with a face, and its shadow.
	 */
	private draw (face: MascotMood | 'blink'): void {
		const context = this.canvas().nativeElement.getContext('2d');

		if (!context)
			return;

		context.clearRect(0, 0, SIDE, SIDE);
		sprite(context, rows(FACES[face]), 0, 0, PALETTE);
		context.fillStyle = 'rgba(0, 0, 0, 0.22)';
		context.fillRect(3, 15, 10, 1);
	}
}
