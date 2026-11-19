import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { KuvMascotComponent, MascotMood } from '../kuv-mascot/kuv-mascot.component';

/**
 * How big the mascot and its bubble are: `normal` for a screen where it leads (the login), `small`
 * (a little smaller) for a page where it sits next to other things.
 */
export type MascotSize = 'normal' | 'small';

/**
 * The mascot of Kü-V saying something: the little cube on the left and a speech bubble with a
 * stepped pixel tail on its right. What it says goes inside the element, so each page decides
 * whether it is a title or a plain paragraph.
 */
@Component({
	selector: 'app-mascot-says',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ KuvMascotComponent ],
	host: { class: 'flex items-center', '[class]': '"small" === size() ? "gap-5 max-[420px]:gap-4" : "gap-6 max-[420px]:gap-4.5"' },
	template: `
		<app-kuv-mascot [class]="'small' === size() ? 'w-15 max-[420px]:w-12' : 'w-19 max-[420px]:w-15'" [mood]="mood()" />
		<div class="bubble pixel-frame relative min-w-0 flex-1" [class]="'small' === size() ? 'px-4 py-3' : 'px-4.5 py-3.5'">
			<ng-content />
		</div>
	`,
	styles: `
		/**
		 * The bubble, with its tail drawn in two layers: the outline, then the fill over it.
		 */
		.bubble {
			--frame-size: 3px;
			--frame-color: var(--login-bubble-line);
			--frame-extra: 0 16px 32px -14px var(--login-drop);

			background: var(--login-bubble);
			color: var(--login-bubble-ink);
		}

		.bubble::before,
		.bubble::after {
			content: "";
			position: absolute;
			top: 50%;
			clip-path: polygon(100% 0, 100% 100%, 66% 100%, 66% 75%, 33% 75%, 33% 62.5%, 0 62.5%, 0 37.5%, 33% 37.5%, 33% 25%, 66% 25%, 66% 0);
		}

		.bubble::before {
			left: -15px;
			width: 15px;
			height: 16px;
			margin-top: -8px;
			background: var(--login-bubble-line);
		}

		.bubble::after {
			left: -9px;
			width: 12px;
			height: 10px;
			margin-top: -5px;
			background: var(--login-bubble);
		}
	`,
})
export class MascotSaysComponent {
	/**
	 * How the mascot feels while it talks.
	 */
	readonly mood = input<MascotMood>('calm');

	/**
	 * How big the mascot and its bubble are.
	 */
	readonly size = input<MascotSize>('normal');
}
