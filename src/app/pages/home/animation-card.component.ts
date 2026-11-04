import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommunityAnimation, Dot, LedColor, artOf, formatLikes } from './home-data';

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
 * A card of the home page: the picture of an animation made of LEDs, its name and author, and a
 * button to like it. The picture is decoration; the card is described by its text.
 */
@Component({
	selector: 'app-animation-card',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'block' },
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
					<span class="truncate">{{ animation().author }}</span>
					<button
						type="button"
						class="-my-2 -mr-2 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 font-bold text-like transition duration-150 hover:bg-slate-400/15 focus-visible:outline-2 focus-visible:outline-accent"
						[attr.aria-pressed]="liked()"
						[attr.aria-label]="'Me gusta: ' + animation().title"
						(click)="toggled.emit()"
					>
						<svg viewBox="0 0 24 24" class="size-4" stroke="currentColor" stroke-width="2" stroke-linejoin="round" [attr.fill]="liked() ? 'currentColor' : 'none'" aria-hidden="true">
							<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.7 1.2 5.2 3 1.5-1.8 3-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" />
						</svg>
						{{ likes() }}
					</button>
				</div>
			</div>
		</article>
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
	 * The LEDs of the picture, row after row.
	 */
	protected readonly dots = computed(() => artOf(this.animation().art));

	/**
	 * The likes as written on the card, counting the user's own.
	 */
	protected readonly likes = computed(() => formatLikes(this.animation().likes + (this.liked() ? 1 : 0)));

	/**
	 * The classes of one LED.
	 */
	protected classOf (dot: Dot): string {
		return dot ? LED_CLASS[dot] : LED_OFF;
	}
}
