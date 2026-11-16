import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The logo of Kü-V: a cube with a face in each of three LED colors. It fills its host, so the
 * size is set where it is used (`<app-cube-logo class="size-8" />`). It is only decoration; the
 * text next to it says what it is.
 */
@Component({
	selector: 'app-cube-logo',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'block shrink-0', 'aria-hidden': 'true' },
	template: `
		<svg viewBox="0 0 32 32" class="size-full">
			<polygon points="16,3 29,10 16,17 3,10" class="fill-led-cyan" />
			<polygon points="3,10 16,17 16,30 3,23" class="fill-led-pink" />
			<polygon points="29,10 16,17 16,30 29,23" class="fill-led-yellow" />
		</svg>
	`,
})
export class CubeLogoComponent {
}
