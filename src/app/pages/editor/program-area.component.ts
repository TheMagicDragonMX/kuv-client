import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Program } from '../../cube';

/**
 * Shows the program the blocks stand for, as JSON. It is read only: the blocks are the source of
 * truth and this text is made from them, so there is nothing to run or edit here. To change the
 * program, change the blocks.
 */
@Component({
	selector: 'app-program-area',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './program-area.component.html',
})
export class ProgramAreaComponent {
	/**
	 * The program made from the blocks, or null while they are not ready.
	 */
	readonly program = input<Program | null>(null);

	/**
	 * Whether the tab is showing. The text of a big program is slow to make, so it is only made
	 * while someone looks at it.
	 */
	readonly visible = input(false);

	/**
	 * The program as formatted JSON, empty while it is not needed.
	 */
	protected readonly source = computed(() => {
		const program = this.program();

		return this.visible() && program ? JSON.stringify(program, null, 2) : '';
	});

	/**
	 * True for a moment after the text was copied, to show the confirmation.
	 */
	protected readonly copied = signal(false);

	/**
	 * Copies the JSON to the clipboard.
	 */
	protected async copy (): Promise<void> {
		await navigator.clipboard.writeText(this.source());
		this.copied.set(true);
		setTimeout(() => this.copied.set(false), 1500);
	}
}
