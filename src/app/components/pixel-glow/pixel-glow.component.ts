import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, effect, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { ThemeService } from '../../services/theme.service';
import { CELL, glowCells } from './pixel-glow';

/**
 * How fast the glow fades in and out: the part of the way to its target brightness each frame.
 */
const FADE = 0.08;

/**
 * Gap, in CSS pixels, left between the squares, so they read as separate pixels.
 */
const GAP = 2;

/**
 * Colors and brightness of the glow in each theme. It is meant to be barely there: a touch of
 * light, never something that competes with the page.
 */
const LOOKS = {
	dark: { inner: '91, 227, 245', outer: '255, 122, 198', most: 0.16, blend: 'screen' },
	light: { inner: '77, 141, 255', outer: '255, 122, 198', most: 0.14, blend: 'multiply' },
} as const;

/**
 * Data a route sets to say its page shows the virtual cube, where the glow would get in the way.
 */
export const VIRTUAL_CUBE = 'virtualCube';

/**
 * True when the page open, or any page around it, shows the virtual cube.
 */
function showsCube (route: ActivatedRouteSnapshot): boolean {
	return true === route.data[VIRTUAL_CUBE] || route.children.some(showsCube);
}

/**
 * A faint pixelated glow that follows the mouse over the page, a decoration in the colors of the
 * LEDs. It lies behind all the content, as part of the background, without catching the mouse, and stays out of pages that show the
 * virtual cube, of touch screens and of people who ask for less motion. It goes once in the root
 * component.
 */
@Component({
	selector: 'app-pixel-glow',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'pointer-events-none fixed inset-0 -z-10', 'aria-hidden': 'true' },
	templateUrl: './pixel-glow.component.html',
})
export class PixelGlowComponent {
	/**
	 * The canvas the glow is drawn on.
	 */
	private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

	/**
	 * Tells which theme is on, for the colors.
	 */
	private readonly theme = inject(ThemeService);

	/**
	 * Lets the router say which page is open.
	 */
	private readonly router = inject(Router);

	/**
	 * True while the page open allows the glow.
	 */
	private readonly allowed = toSignal(this.router.events.pipe(
		filter((event) => event instanceof NavigationEnd),
		map(() => !showsCube(this.router.routerState.snapshot.root)),
	), { initialValue: false });

	/**
	 * Where the glow is, in CSS pixels, or null before the mouse has moved. It is always the
	 * mouse position, except after the mouse leaves, when it stays where it was while it fades.
	 */
	private position: { x: number; y: number } | null = null;

	/**
	 * Where the mouse is.
	 */
	private target = { x: 0, y: 0 };

	/**
	 * How bright the glow is now, from 0 to 1.
	 */
	private brightness = 0;

	/**
	 * How bright the glow is going: 1 while the mouse is over the page, 0 once it leaves.
	 */
	private wanted = 0;

	/**
	 * The frame asked for, or null while nothing moves.
	 */
	private frame: number | null = null;

	constructor () {
		const destroyRef = inject(DestroyRef);

		afterNextRender(() => {
			const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
			const mouse = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

			if (calm || !mouse)
				return;

			const move = (event: PointerEvent): void => {
				if ('mouse' !== event.pointerType)
					return;

				this.target = { x: event.clientX, y: event.clientY };
				this.position ??= { ...this.target };
				this.wanted = 1;
				this.wake();
			};
			const leave = (event: MouseEvent): void => {
				if (null !== event.relatedTarget)
					return;

				this.wanted = 0;
				this.wake();
			};
			const resize = (): void => this.fit();

			this.fit();
			window.addEventListener('pointermove', move, { passive: true });
			document.addEventListener('mouseout', leave);
			window.addEventListener('resize', resize);
			destroyRef.onDestroy(() => {
				window.removeEventListener('pointermove', move);
				document.removeEventListener('mouseout', leave);
				window.removeEventListener('resize', resize);

				if (null !== this.frame)
					cancelAnimationFrame(this.frame);
			});
		});

		/**
		 * Redraws when the page or the theme changes: it clears the glow on pages with the cube,
		 * and takes the colors of the new theme.
		 */
		effect(() => {
			this.allowed();
			this.theme.theme();
			this.wake();
		});
	}

	/**
	 * Makes the canvas as big as the window, in device pixels so the squares stay sharp.
	 */
	private fit (): void {
		const canvas = this.canvas().nativeElement;
		const scale = window.devicePixelRatio || 1;

		canvas.width = Math.round(window.innerWidth * scale);
		canvas.height = Math.round(window.innerHeight * scale);
		this.wake();
	}

	/**
	 * Asks for a frame, if none is pending.
	 */
	private wake (): void {
		if (null === this.frame && 'undefined' !== typeof requestAnimationFrame)
			this.frame = requestAnimationFrame(() => this.step());
	}

	/**
	 * Moves the glow toward the mouse, fades it toward its brightness and draws it. It keeps
	 * asking for frames only while something still changes.
	 */
	private step (): void {
		this.frame = null;

		// The glow sits exactly on the mouse, without lagging behind it.
		this.position = this.wanted ? { ...this.target } : this.position;

		this.brightness += (this.wanted - this.brightness) * FADE;
		this.draw();

		if (0.01 < Math.abs(this.wanted - this.brightness))
			this.wake();

		else
			this.brightness = this.wanted;
	}

	/**
	 * Draws the glow where it is now, or nothing.
	 */
	private draw (): void {
		const canvas = this.canvas().nativeElement;
		const context = canvas.getContext('2d');

		if (!context)
			return;

		const scale = canvas.width / Math.max(window.innerWidth, 1);
		const look = LOOKS[this.theme.theme()];

		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, canvas.width, canvas.height);
		canvas.style.mixBlendMode = look.blend;

		if (!this.position || !this.allowed() || 0.01 > this.brightness)
			return;

		context.setTransform(scale, 0, 0, scale, 0, 0);

		for (const cell of glowCells(this.position.x, this.position.y)) {
			context.fillStyle = `rgba(${cell.inner ? look.inner : look.outer}, ${look.most * cell.strength * cell.strength * this.brightness})`;
			context.fillRect(cell.x + GAP / 2, cell.y + GAP / 2, CELL - GAP, CELL - GAP);
		}
	}
}
