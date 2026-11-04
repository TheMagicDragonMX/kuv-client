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
 * with the scroll wheel or the keyboard, or with the arrow buttons (only on devices with a mouse).
 * Nothing moves by itself, and every card is in the row once, so a screen reader or the Tab key
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
				<div class="flex items-center gap-1">
					<button
						type="button"
						class="hidden size-11 cursor-pointer place-items-center rounded-full border border-slate-400/20 text-slate-100 transition duration-150 hover:bg-slate-400/15 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent pointer-fine:grid"
						[attr.aria-label]="'Anteriores: ' + title()"
						[disabled]="atStart()"
						(click)="scroll(-1)"
					>
						<svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
					</button>
					<button
						type="button"
						class="hidden size-11 cursor-pointer place-items-center rounded-full border border-slate-400/20 text-slate-100 transition duration-150 hover:bg-slate-400/15 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent pointer-fine:grid"
						[attr.aria-label]="'Siguientes: ' + title()"
						[disabled]="atEnd()"
						(click)="scroll(1)"
					>
						<svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
					</button>
					<a routerLink="/gallery" class="ml-1 inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-accent hover:bg-slate-400/15 focus-visible:outline-2 focus-visible:outline-accent">
						Ver todo<span class="sr-only">: {{ title() }}</span>
					</a>
				</div>
			</div>

			<!-- The padding leaves room for the lift and shadow of a card, which the scrolling would cut. -->
			<ul
				#scroller
				role="list"
				class="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 py-6 [scrollbar-width:thin] sm:-mx-10 sm:scroll-px-10 sm:px-10"
				(scroll)="update()"
			>
				@for (animation of animations(); track animation.id) {
					<li class="w-52 flex-none snap-start sm:w-54">
						<app-animation-card class="h-full" [animation]="animation" [liked]="liked().has(animation.id)" (toggled)="toggled.emit(animation.id)" />
					</li>
				}
			</ul>
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
