import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CubeLogoComponent } from '../cube-logo/cube-logo.component';

/**
 * The colors of the LEDs of the strip on top of the card, in order. The classes are written in
 * full so Tailwind finds them.
 */
const LEDS = [
	'bg-led-red',
	'bg-led-orange',
	'bg-led-yellow',
	'bg-led-green',
	'bg-led-cyan',
	'bg-led-blue',
	'bg-led-violet',
	'bg-led-pink',
	'bg-led-red',
	'bg-led-orange',
	'bg-led-yellow',
	'bg-led-green',
];

/**
 * Milliseconds between the moment one LED of the strip starts its wave and the next one does.
 */
const LED_STEP = 120;

/**
 * The frame of the pages for signing in or creating an account, in the design of the home page:
 * the logo, a card with a strip of LEDs that light up one after another, the title of the page and
 * whatever the page puts inside (its form).
 */
@Component({
	selector: 'app-auth-shell',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ CubeLogoComponent ],
	host: { class: 'block' },
	templateUrl: './auth-shell.component.html',
})
export class AuthShellComponent {
	/**
	 * The title of the page.
	 */
	readonly heading = input.required<string>();

	/**
	 * The sentence under the title that says what the page is for.
	 */
	readonly lead = input.required<string>();

	/**
	 * The colors of the LEDs of the strip.
	 */
	protected readonly leds = LEDS;

	/**
	 * Milliseconds between the waves of two LEDs next to each other.
	 */
	protected readonly ledStep = LED_STEP;
}
