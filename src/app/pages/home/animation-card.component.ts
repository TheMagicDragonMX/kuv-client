import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { ART_SIDE, CommunityAnimation, Dot, LedColor, artOf, formatDate, formatLikes } from './home-data';

/**
 * The classes of an LED of each color: the color, and a glow of the same color. They are written
 * in full so Tailwind finds them.
 */
const LED_CLASS: Record<LedColor, string> = {
	red: 'bg-led-red shadow-[0_0_6px_color-mix(in_srgb,var(--color-led-red)_60%,transparent)]',
	orange: 'bg-led-orange shadow-[0_0_6px_color-mix(in_srgb,var(--color-led-orange)_60%,transparent)]',
	yellow: 'bg-led-yellow shadow-[0_0_6px_color-mix(in_srgb,var(--color-led-yellow)_60%,transparent)]',
	green: 'bg-led-green shadow-[0_0_6px_color-mix(in_srgb,var(--color-led-green)_60%,transparent)]',
	cyan: 'bg-led-cyan shadow-[0_0_6px_color-mix(in_srgb,var(--color-led-cyan)_60%,transparent)]',
	blue: 'bg-led-blue shadow-[0_0_6px_color-mix(in_srgb,var(--color-led-blue)_60%,transparent)]',
	violet: 'bg-led-violet shadow-[0_0_6px_color-mix(in_srgb,var(--color-led-violet)_60%,transparent)]',
	pink: 'bg-led-pink shadow-[0_0_6px_color-mix(in_srgb,var(--color-led-pink)_60%,transparent)]',
};

/**
 * The class of an LED that is off.
 */
const LED_OFF = 'bg-led-off';

/**
 * The heart of the like button, drawn in pixels on a grid of 7 by 6 squares. It is always full:
 * gray when the animation is not liked and the color of the likes when it is.
 */
const HEART = 'M1 0h2v1H1z M4 0h2v1H4z M0 1h7v1H0z M0 2h7v1H0z M1 3h5v1H1z M2 4h3v1H2z M3 5h1v1H3z';

/**
 * The icons of the save and favorite buttons, drawn in pixels like the heart: the grid each is
 * drawn on (its view box) and the squares that are on.
 */
const ICONS = {
	save: {
		box: '0 0 5 7',
		path: 'M0 0h5v5H0z M0 5h2v1H0z M3 5h2v1H3z M0 6h1v1H0z M4 6h1v1H4z',
	},
	favorite: {
		box: '0 0 7 7',
		path: 'M3 0h1v2H3z M0 2h7v1H0z M1 3h5v1H1z M2 4h3v1H2z M1 5h2v1H1z M4 5h2v1H4z M0 6h2v1H0z M5 6h2v1H5z',
	},
};

/**
 * The look of an action button that is off, over the video: dark and see-through, so the
 * animation shows around it.
 */
const ACTION_OFF = 'border-white/20 bg-black/45 text-white/85 hover:bg-black/65 hover:text-white';

/**
 * Milliseconds between the LEDs of two neighbouring diagonals in the wave that plays when there is
 * no video, so the light runs across the picture.
 */
const WAVE_STEP_MS = 90;

/**
 * Width of the expanded card, in rem. The same as its `w-[30rem]` class.
 */
const PANEL_REM = 30;

/**
 * Room, in pixels, left free at the side of the row for its arrow, so the expanded card does not
 * go under it.
 */
const ARROW_ROOM = 48;

/**
 * A card of the home page: the picture of an animation made of LEDs, its name, its author (with
 * their small picture) and a button to like it. The picture of the LEDs and the one of the author
 * are decoration; the card is described by its text.
 *
 * With the pointer over it for a moment, it expands into a wider rectangle over the cards next to
 * it, as tall as the card. Its background then turns, little by little, into the animation playing:
 * its video, or (for the animations that have none yet) its LEDs, large, with a wave of light
 * running over them. Over it a black gradient on the left keeps the name, the author, the day it
 * was shared and its category easy to read, and the buttons (like, save, favorite) sit in the
 * bottom right corner. Pressing the background opens the animation.
 *
 * It grows to the right; only when the row has no room on that side does it grow to the left. It
 * also opens when one of its buttons gets the keyboard focus, so they can be reached without a
 * mouse. On a touch screen it does not open: there is no pointer to hover. The video only plays
 * while the card is open.
 */
@Component({
	selector: 'app-animation-card',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ NgTemplateOutlet, AvatarComponent ],
	host: {
		class: 'group/card relative block',
		'(pointerenter)': 'open()',
		'(pointerleave)': 'close()',
		'(focusin)': 'open()',
		'(focusout)': 'leave($event)',
	},
	template: `
		<article class="flex h-full flex-col gap-3 rounded-2xl border border-slate-400/20 bg-slate-900/80 p-3 transition duration-200 motion-reduce:transition-none hover:-translate-y-1 hover:border-accent hover:shadow-[0_8px_16px_var(--shadow)] focus-within:border-accent">
			<div class="rounded-xl border border-slate-400/15 bg-led-panel p-4" aria-hidden="true">
				<div class="grid grid-cols-8 gap-1.25">
					@for (dot of dots(); track $index) {
						<div class="aspect-square rounded-full" [class]="classOf(dot)"></div>
					}
				</div>
			</div>
			<div class="flex flex-col gap-1 px-1 pb-1">
				<h3 class="truncate text-base font-extrabold" [title]="animation().title">{{ animation().title }}</h3>
				<div class="flex items-center justify-between gap-2 text-sm text-slate-400">
					<span class="flex min-w-0 items-center gap-1.5">
						<app-avatar class="size-5 text-[0.7rem]" [name]="animation().author" [photo]="animation().authorPhoto ?? null" />
						<span class="truncate">{{ animation().author }}</span>
					</span>
					<button
						type="button"
						class="-my-2 -mr-2 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 font-bold transition duration-150 hover:bg-slate-400/15 focus-visible:outline-2 focus-visible:outline-accent"
						[class]="liked() ? 'text-like' : 'text-slate-400'"
						[attr.aria-pressed]="liked()"
						[attr.aria-label]="'Me gusta: ' + animation().title"
						(click)="toggled.emit()"
					>
						<ng-container *ngTemplateOutlet="likeContent" />
					</button>
				</div>
			</div>
		</article>

		<!-- The expanded card. It is hidden until the pointer rests on the card (or a button of it has the keyboard focus), and grows from the width of the card, as tall as it. It is dark in both themes: it is a screen showing the animation. -->
		<div
			class="invisible absolute top-0 z-20 h-full w-full overflow-hidden rounded-2xl border border-accent bg-[#05070a] opacity-0 shadow-[0_8px_16px_var(--shadow)] transition-[width,opacity,visibility,translate] duration-200 ease-out motion-reduce:transition-none group-hover/card:visible group-hover/card:w-[30rem] group-hover/card:-translate-y-1 group-hover/card:opacity-100 group-hover/card:delay-300 group-has-[:focus-visible]/card:visible group-has-[:focus-visible]/card:w-[30rem] group-has-[:focus-visible]/card:-translate-y-1 group-has-[:focus-visible]/card:opacity-100"
			[class]="toLeft() ? 'right-0' : 'left-0'"
			role="group"
			[attr.aria-label]="animation().title"
		>
			<!-- The background: the animation playing. It fades in once the card has opened. Pressing it opens the animation. -->
			<button
				type="button"
				class="absolute inset-0 block size-full cursor-pointer overflow-hidden bg-led-panel opacity-0 transition-opacity duration-700 ease-out group-hover/card:opacity-100 group-hover/card:delay-500 group-has-[:focus-visible]/card:opacity-100 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent motion-reduce:transition-none"
				[attr.aria-label]="'Visualizar: ' + animation().title"
				title="Visualizar"
				(click)="viewed.emit()"
			>
				@if (animation().video; as source) {
					<!-- Muted as a property, not only as an attribute: browsers only let a video play by itself when it is muted. -->
					<video #video class="size-full object-cover" [src]="source" [muted]="true" loop playsinline preload="none" aria-hidden="true"></video>
				} @else {
					<!-- No video yet: the LEDs of the picture, large, with a wave of light running over them. The wave only exists while the card is open, and not for users who asked for less motion. -->
					<div class="grid size-full place-items-center" aria-hidden="true">
						<div class="grid w-full grid-cols-8 gap-2 p-2">
							@for (dot of dots(); track $index) {
								<div
									class="aspect-square rounded-full motion-safe:group-hover/card:animate-led-wave motion-safe:group-has-[:focus-visible]/card:animate-led-wave"
									[class]="classOf(dot)"
									[style.animation-delay.ms]="waveDelay($index)"
								></div>
							}
						</div>
					</div>
				}
			</button>

			<!-- A black gradient from the left, so the text over the animation can be read. -->
			<div class="pointer-events-none absolute inset-0 bg-linear-to-r from-black/90 via-black/55 via-50% to-transparent" aria-hidden="true"></div>

			<!-- The details, on the left. They let the pointer through, so pressing them opens the animation too. -->
			<div class="pointer-events-none absolute inset-y-0 left-0 flex w-3/5 flex-col justify-center gap-2 p-5 text-white">
				<h3 class="line-clamp-3 text-xl leading-tight font-extrabold [text-shadow:0_1px_3px_rgb(0_0_0/0.6)]">{{ animation().title }}</h3>
				<span class="flex min-w-0 items-center gap-2 text-sm text-white/85">
					<app-avatar class="size-6 text-xs" [name]="animation().author" [photo]="animation().authorPhoto ?? null" />
					<span class="truncate">{{ animation().author }}</span>
				</span>
				<dl class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/70">
					<dt class="sr-only">Creado</dt>
					<dd><time class="font-semibold text-white/85" [attr.datetime]="animation().createdAt">{{ createdAt() }}</time></dd>
					<dt class="sr-only">Categoría</dt>
					<dd class="rounded-full bg-white/15 px-2 py-0.5 font-bold text-white">{{ animation().category }}</dd>
				</dl>
			</div>

			<!-- The actions, in the bottom right corner, as large pixel icons. The ones that are on light up in the color of their LED. -->
			<div class="absolute right-3 bottom-3 flex items-center gap-1.5" role="group" aria-label="Acciones">
				<button
					type="button"
					tabindex="-1"
					class="inline-flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-bold transition duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
					[class]="liked() ? 'border-led-pink/50 bg-led-pink/25 text-led-pink' : actionOff"
					[attr.aria-pressed]="liked()"
					[attr.aria-label]="'Me gusta: ' + animation().title"
					[title]="liked() ? 'Te gusta' : 'Me gusta'"
					(click)="toggled.emit()"
				>
					<svg viewBox="0 0 7 6" class="h-[18px] w-[21px]" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true"><path [attr.d]="heart" /></svg>
					{{ likes() }}
				</button>
				<button
					type="button"
					class="grid h-11 min-w-11 cursor-pointer place-items-center rounded-xl border transition duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
					[class]="saved() ? 'border-led-cyan/50 bg-led-cyan/25 text-led-cyan' : actionOff"
					[attr.aria-label]="'Guardar: ' + animation().title"
					[attr.aria-pressed]="saved()"
					[title]="saved() ? 'Guardado' : 'Guardar'"
					(click)="saveToggled.emit()"
				>
					<svg [attr.viewBox]="icons.save.box" class="h-[21px] w-[15px]" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true"><path [attr.d]="icons.save.path" /></svg>
				</button>
				<button
					type="button"
					class="grid h-11 min-w-11 cursor-pointer place-items-center rounded-xl border transition duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
					[class]="favorite() ? 'border-led-yellow/50 bg-led-yellow/25 text-led-yellow' : actionOff"
					[attr.aria-label]="'Favorito: ' + animation().title"
					[attr.aria-pressed]="favorite()"
					[title]="favorite() ? 'En favoritos' : 'Agregar a favoritos'"
					(click)="favoriteToggled.emit()"
				>
					<svg [attr.viewBox]="icons.favorite.box" class="h-[21px] w-[21px]" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true"><path [attr.d]="icons.favorite.path" /></svg>
				</button>
			</div>
		</div>

		<ng-template #likeContent>
			<svg viewBox="0 0 7 6" class="h-[12px] w-[14px]" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">
				<path [attr.d]="heart" />
			</svg>
			{{ likes() }}
		</ng-template>
	`,
})
export class AnimationCardComponent {
	/**
	 * The animation the card shows.
	 */
	readonly animation = input.required<CommunityAnimation>();

	/**
	 * True when the user already liked it.
	 */
	readonly liked = input(false);

	/**
	 * The user pressed the like button.
	 */
	readonly toggled = output<void>();

	/**
	 * True when the user saved it.
	 */
	readonly saved = input(false);

	/**
	 * True when it is one of the user's favorites.
	 */
	readonly favorite = input(false);

	/**
	 * The user pressed the animation in the expanded card, to see it.
	 */
	readonly viewed = output<void>();

	/**
	 * The user pressed the button to save it, or to take it out of what they saved.
	 */
	readonly saveToggled = output<void>();

	/**
	 * The user pressed the button to add it to their favorites, or to take it out.
	 */
	readonly favoriteToggled = output<void>();

	/**
	 * The pixel icons of the actions.
	 */
	protected readonly icons = ICONS;

	/**
	 * The look of an action button that is off.
	 */
	protected readonly actionOff = ACTION_OFF;

	/**
	 * True when the expanded card grows to the left, because there is no room on the right.
	 */
	protected readonly toLeft = signal(false);

	/**
	 * The day it was shared, as it is shown.
	 */
	protected readonly createdAt = computed(() => formatDate(this.animation().createdAt));

	/**
	 * The pixel heart of the like button.
	 */
	protected readonly heart = HEART;

	/**
	 * The LEDs of the picture, row after row.
	 */
	protected readonly dots = computed(() => artOf(this.animation().art));

	/**
	 * The likes as written on the card, counting the user's own.
	 */
	protected readonly likes = computed(() => formatLikes(this.animation().likes + (this.liked() ? 1 : 0)));

	/**
	 * The video of the expanded card, when the animation has one.
	 */
	private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

	/**
	 * The element of the card, to measure where it is.
	 */
	private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

	/**
	 * The card is about to open (the pointer came in, or a button of it got the focus): decides
	 * which way it grows and starts the video.
	 */
	protected open (): void {
		this.placePanel();

		const video = this.video()?.nativeElement;

		if (video?.paused)
			video.play()?.catch(() => undefined);
	}

	/**
	 * The card closed: stops the video and goes back to its start, so it plays from the beginning
	 * next time.
	 */
	protected close (): void {
		const video = this.video()?.nativeElement;

		if (!video)
			return;

		video.pause();
		video.currentTime = 0;
	}

	/**
	 * The keyboard focus moved: closes the card when it went somewhere outside it.
	 */
	protected leave (event: FocusEvent): void {
		if (!this.element.nativeElement.contains(event.relatedTarget as Node | null))
			this.close();
	}

	/**
	 * Decides which way the expanded card grows: to the right, unless the row it is in (the list
	 * that scrolls) has no room for it on that side, leaving space for the arrow of the row.
	 */
	protected placePanel (): void {
		const card = this.element.nativeElement;
		const row = card.closest('[role="list"]') ?? card.parentElement;

		if (!row)
			return;

		const width = PANEL_REM * parseFloat(getComputedStyle(document.documentElement).fontSize || '16');
		const room = row.getBoundingClientRect().right - card.getBoundingClientRect().left;

		this.toLeft.set(room < width + ARROW_ROOM);
	}

	/**
	 * When an LED of the large picture lights up in the wave: the farther along its diagonal, the
	 * later, so the light runs from the top left corner to the bottom right.
	 */
	protected waveDelay (index: number): number {
		return (index % ART_SIDE + Math.floor(index / ART_SIDE)) * WAVE_STEP_MS;
	}

	/**
	 * The classes of one LED.
	 */
	protected classOf (dot: Dot): string {
		return dot ? LED_CLASS[dot] : LED_OFF;
	}
}
