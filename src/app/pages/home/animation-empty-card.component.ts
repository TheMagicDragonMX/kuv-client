import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ART_SIDE } from './home-data';

/**
 * Number of LEDs in the picture of the empty card.
 */
const LED_COUNT = ART_SIDE * ART_SIDE;

/**
 * The card a row shows in place of its animations when it has none: the same size and look as an
 * animation card, with every LED of its picture off, and a few words saying why there is nothing.
 * While the animations are still being fetched it says so instead.
 */
@Component({
	selector: 'app-animation-empty-card',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'block w-52 sm:w-54' },
	template: `
		<article class="flex h-full flex-col gap-3 rounded-2xl border border-dashed border-slate-400/25 bg-slate-900/50 p-3">
			<div class="rounded-xl border border-slate-400/15 bg-led-panel p-4" aria-hidden="true">
				<div class="grid grid-cols-8 gap-1.25">
					@for (led of leds; track $index) {
						<div class="aspect-square rounded-full bg-led-off"></div>
					}
				</div>
			</div>
			<div class="flex flex-col gap-1 px-1 pb-1">
				<h3 class="text-base font-extrabold">{{ loading() ? 'Cargando…' : 'Aún no hay animaciones' }}</h3>
				<p class="text-sm text-slate-400">{{ loading() ? 'Buscando animaciones.' : 'Cuando haya, aparecerán aquí.' }}</p>
			</div>
		</article>
	`,
})
export class AnimationEmptyCardComponent {
	/**
	 * True while the animations of the row are still being fetched.
	 */
	readonly loading = input(false);

	/**
	 * One entry for each LED of the picture, to draw them with a loop.
	 */
	protected readonly leds = Array.from({ length: LED_COUNT });
}
