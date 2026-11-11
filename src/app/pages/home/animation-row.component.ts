import { ChangeDetectionStrategy, Component, ElementRef, HostListener, afterNextRender, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnimationCardComponent } from './animation-card.component';
import { CommunityAnimation } from './home-data';

/**
 * Share of the visible width that the arrow buttons scroll by, so the last card seen stays in view.
 */
const PAGE_SHARE = 0.8;

/**
 * A titled row of animation cards that the user moves through by hand: swiping on a touch screen,
 * with the scroll wheel or the keyboard, or with the arrow buttons at the sides of the row (only on
 * devices with a mouse, and only drawn while the pointer is over the row). The row has no scroll
 * bar. Nothing moves by itself, and every card is in the row once, so a screen reader or the Tab key
 * meets each of them once.
 */
@Component({
	selector: 'app-animation-row',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ RouterLink, AnimationCardComponent ],
	host: { class: 'block' },
	template: `
		<section class="flex flex-col gap-2" [attr.aria-labelledby]="'row-' + id()">
			<div class="flex items-center justify-between gap-4">
				<h2 class="font-display text-2xl font-semibold sm:text-[1.75rem]" [id]="'row-' + id()">{{ title() }}</h2>
				<a routerLink="/gallery" class="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-accent hover:bg-slate-400/15 focus-visible:outline-2 focus-visible:outline-accent">
					Ver todo<span class="sr-only">: {{ title() }}</span>
				</a>
			</div>

			<!-- The arrows are tall rounded buttons at the sides of the row, in the middle of its height, with a pixel-art chevron (drawn on a 6 by 9 grid, 3 pixels a square, strokes 2 squares thick), and fade in when the pointer is over the row (or one has the keyboard focus), and fade out when it leaves or when there is nothing more in that direction. They are not drawn on touch screens, where the row is swiped. -->
			<div class="group/row relative -mx-4 sm:-mx-10">
				<button
					type="button"
					class="absolute top-1/2 left-0.5 z-10 hidden h-16 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-slate-400/30 bg-slate-900/60 text-slate-100 opacity-0 transition-[opacity,background-color] duration-300 ease-in-out group-focus-within/row:enabled:opacity-100 group-hover/row:enabled:opacity-100 hover:bg-slate-900/80 focus-visible:outline-2 focus-visible:outline-accent disabled:pointer-events-none motion-reduce:transition-none pointer-fine:grid"
					[attr.aria-label]="'Anteriores: ' + title()"
					[disabled]="atStart()"
					(click)="scroll(-1)"
				>
					<svg viewBox="0 0 6 9" class="h-[27px] w-[18px]" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true"><path d="M4 0h2v1H4z M3 1h2v1H3z M2 2h2v1H2z M1 3h2v1H1z M0 4h2v1H0z M1 5h2v1H1z M2 6h2v1H2z M3 7h2v1H3z M4 8h2v1H4z" /></svg>
				</button>
				<button
					type="button"
					class="absolute top-1/2 right-0.5 z-10 hidden h-16 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-slate-400/30 bg-slate-900/60 text-slate-100 opacity-0 transition-[opacity,background-color] duration-300 ease-in-out group-focus-within/row:enabled:opacity-100 group-hover/row:enabled:opacity-100 hover:bg-slate-900/80 focus-visible:outline-2 focus-visible:outline-accent disabled:pointer-events-none motion-reduce:transition-none pointer-fine:grid"
					[attr.aria-label]="'Siguientes: ' + title()"
					[disabled]="atEnd()"
					(click)="scroll(1)"
				>
					<svg viewBox="0 0 6 9" class="h-[27px] w-[18px]" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true"><path d="M0 0h2v1H0z M1 1h2v1H1z M2 2h2v1H2z M3 3h2v1H3z M4 4h2v1H4z M3 5h2v1H3z M2 6h2v1H2z M1 7h2v1H1z M0 8h2v1H0z" /></svg>
				</button>

				<!-- The padding leaves room for the lift and shadow of a card, which the scrolling would cut. The scroll bar is hidden: the row moves by swiping, the wheel, the keyboard or the arrows. -->
				<ul
					#scroller
					role="list"
					class="flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 py-6 [scrollbar-width:none] sm:scroll-px-10 sm:px-10 [&::-webkit-scrollbar]:hidden"
					(scroll)="update()"
				>
					@for (animation of animations(); track animation.id) {
						<li class="w-52 flex-none snap-start sm:w-54">
							<app-animation-card class="h-full" [animation]="animation" [liked]="liked().has(animation.id)"
								[saved]="saved().has(animation.id)"
								[favorite]="favorites().has(animation.id)"
								(toggled)="toggled.emit(animation.id)"
								(viewed)="viewed.emit(animation.id)"
								(saveToggled)="saveToggled.emit(animation.id)"
								(favoriteToggled)="favoriteToggled.emit(animation.id)"
							/>
						</li>
					}
				</ul>
			</div>
		</section>
	`,
})
export class AnimationRowComponent {
	/**
	 * Identifies the row; the title of the section is labelled with it.
	 */
	readonly id = input.required<string>();

	/**
	 * What the row is called.
	 */
	readonly title = input.required<string>();

	/**
	 * The animations of the row, in order.
	 */
	readonly animations = input.required<readonly CommunityAnimation[]>();

	/**
	 * The ids of the animations the user liked.
	 */
	readonly liked = input<ReadonlySet<string>>(new Set());

	/**
	 * The user pressed the like button of an animation: its id.
	 */
	readonly toggled = output<string>();

	/**
	 * The ids of the animations the user saved.
	 */
	readonly saved = input<ReadonlySet<string>>(new Set());

	/**
	 * The ids of the user's favorite animations.
	 */
	readonly favorites = input<ReadonlySet<string>>(new Set());

	/**
	 * The user asked to see an animation: its id.
	 */
	readonly viewed = output<string>();

	/**
	 * The user saved an animation or took it out of what they saved: its id.
	 */
	readonly saveToggled = output<string>();

	/**
	 * The user added an animation to their favorites or took it out: its id.
	 */
	readonly favoriteToggled = output<string>();

	/**
	 * True while the row is scrolled all the way to the start.
	 */
	protected readonly atStart = signal(true);

	/**
	 * True while the row is scrolled all the way to the end.
	 */
	protected readonly atEnd = signal(false);

	/**
	 * The list that scrolls.
	 */
	private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');

	/**
	 * Works out which arrow buttons can be used once the row is on screen.
	 */
	constructor () {
		afterNextRender(() => this.update());
	}

	/**
	 * Works out again which arrow buttons can be used, when the window changes size.
	 */
	@HostListener('window:resize')
	protected onResize (): void {
		this.update();
	}

	/**
	 * Notes how far the row is scrolled, to disable the arrow that has nowhere to go.
	 */
	protected update (): void {
		const list = this.scroller().nativeElement;

		this.atStart.set(1 > list.scrollLeft);
		this.atEnd.set(list.scrollLeft + list.clientWidth >= list.scrollWidth - 1);
	}

	/**
	 * Scrolls the row by most of its visible width, to the right (1) or to the left (-1). It does
	 * not animate for users who asked for less motion.
	 */
	protected scroll (direction: 1 | -1): void {
		const list = this.scroller().nativeElement;
		const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

		list.scrollBy({ left: direction * list.clientWidth * PAGE_SHARE, behavior: calm ? 'auto' : 'smooth' });
	}
}
