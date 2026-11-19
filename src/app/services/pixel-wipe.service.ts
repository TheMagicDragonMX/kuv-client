import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/**
 * Side, in CSS pixels, of the squares of the wipe.
 */
const CELL = 26;

/**
 * Milliseconds the screen takes to fill with squares.
 */
const COVER_TIME = 460;

/**
 * Milliseconds the squares take to go away.
 */
const UNCOVER_TIME = 620;

/**
 * Part of the squares lit in an LED color instead of the color of the page.
 */
const SPARKLE = 0.1;

/**
 * The LED colors of the lit squares.
 */
const LEDS = [ '#5BE3F5', '#FF7AC6', '#FFD84D', '#6EF29A', '#A98BFF' ];

/**
 * A transition between pages in pixels: the screen fills with squares in random order, the page
 * changes behind them, and they go away in another order, so the new page fades in pixelated. It
 * draws on a canvas it puts over everything for the time it lasts. For people who ask for less
 * motion it only changes the page.
 */
@Injectable({ providedIn: 'root' })
export class PixelWipeService {
	/**
	 * The document the canvas goes in.
	 */
	private readonly document = inject(DOCUMENT);

	/**
	 * Covers the screen, runs `change` (and waits for it, when it gives a promise, like a
	 * navigation), then uncovers the new page. Resolves when the screen is clear.
	 */
	async run (change: () => unknown): Promise<void> {
		const view = this.document.defaultView;

		if (!view || view.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
			await change();
			return;
		}

		const canvas = this.document.createElement('canvas');
		const context = canvas.getContext('2d');

		if (!context) {
			await change();
			return;
		}

		canvas.width = view.innerWidth;
		canvas.height = view.innerHeight;
		canvas.setAttribute('aria-hidden', 'true');
		canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:60;pointer-events:none';
		this.document.body.appendChild(canvas);

		const columns = Math.ceil(canvas.width / CELL);
		const count = columns * Math.ceil(canvas.height / CELL);
		const ground = getComputedStyle(this.document.documentElement).getPropertyValue('--page').trim() || '#0b0f14';
		const square = (cell: number): [ number, number, number, number ] => [ (cell % columns) * CELL, Math.floor(cell / columns) * CELL, CELL, CELL ];

		const cover = this.shuffled(count);
		await this.animate(COVER_TIME, (done, goal) => {
			for (let cell = done; cell < goal; cell++) {
				context.fillStyle = SPARKLE > Math.random() ? LEDS[Math.floor(Math.random() * LEDS.length)] : ground;
				context.fillRect(...square(cover[cell]));
			}
		}, count, (part) => part * part);

		context.fillStyle = ground;
		context.fillRect(0, 0, canvas.width, canvas.height);

		try {
			await change();
		}

		finally {
			const uncover = this.shuffled(count);
			await this.animate(UNCOVER_TIME, (done, goal) => {
				for (let cell = done; cell < goal; cell++)
					context.clearRect(...square(uncover[cell]));
			}, count, (part) => 1 - (1 - part) * (1 - part));
			canvas.remove();
		}
	}

	/**
	 * Calls `draw` on every frame for `duration` milliseconds with the squares done so far and the
	 * ones that should be done by now, out of `count`, following `ease`.
	 */
	private animate (duration: number, draw: (done: number, goal: number) => void, count: number, ease: (part: number) => number): Promise<void> {
		return new Promise((resolve) => {
			const began = performance.now();
			let done = 0;

			const step = (now: number): void => {
				const part = Math.min(1, (now - began) / duration);
				const goal = Math.floor(ease(part) * count);
				draw(done, goal);
				done = goal;

				if (1 > part)
					requestAnimationFrame(step);

				else
					resolve();
			};

			requestAnimationFrame(step);
		});
	}

	/**
	 * The numbers from 0 to `count - 1` in random order.
	 */
	private shuffled (count: number): number[] {
		const list = [ ...Array(count).keys() ];

		for (let index = count - 1; 0 < index; index--) {
			const other = Math.floor(Math.random() * (index + 1));
			[ list[index], list[other] ] = [ list[other], list[index] ];
		}

		return list;
	}
}
