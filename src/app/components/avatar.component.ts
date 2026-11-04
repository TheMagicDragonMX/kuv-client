import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Background and text classes of the initial, one per LED color. They are written in full so
 * Tailwind finds them.
 */
const COLORS = [
	'bg-led-pink text-[#2a0f1f]',
	'bg-led-cyan text-[#10161e]',
	'bg-led-yellow text-[#10161e]',
	'bg-led-green text-[#10161e]',
	'bg-led-violet text-[#10161e]',
	'bg-led-orange text-[#10161e]',
	'bg-led-blue text-[#10161e]',
];

/**
 * The color of a user's initial. It comes from the name, so a user always has the same one.
 */
export function avatarColor (name: string): string {
	let hash = 0;

	for (const character of name)
		hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 1_000_003;

	return COLORS[hash % COLORS.length];
}

/**
 * A user's picture in a circle, or the first letter of their name on a color when they have no
 * picture. It is decoration: whatever shows it also shows the name.
 */
@Component({
	selector: 'app-avatar',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'block shrink-0 overflow-hidden rounded-full', 'aria-hidden': 'true' },
	template: `
		@if (photo(); as source) {
			<img class="size-full object-cover" [src]="source" alt="" />
		} @else {
			<span class="grid size-full place-items-center font-display font-bold" [class]="color()">{{ initial() }}</span>
		}
	`,
})
export class AvatarComponent {
	/**
	 * The user's name.
	 */
	readonly name = input.required<string>();

	/**
	 * Their picture as a data URL, or null.
	 */
	readonly photo = input<string | null>(null);

	/**
	 * The first letter of the name, in capitals.
	 */
	protected readonly initial = computed(() => (this.name().trim()[0] ?? '?').toUpperCase());

	/**
	 * The color of the initial.
	 */
	protected readonly color = computed(() => avatarColor(this.name()));
}
