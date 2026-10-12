import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { EXAMPLE_PROGRAMS } from '../../cube';

/**
 * Where the user writes the program. For now it is a text box with the program as JSON; when
 * Blockly arrives this component is replaced by the block workspace, and the page does not
 * change: all that matters is that it emits a program (any value) on `run`.
 */
@Component({
	selector: 'app-program-area',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './program-area.component.html',
})
export class ProgramAreaComponent {
	/**
	 * Whether the program is running, so the buttons can tell.
	 */
	readonly running = input(false);

	/**
	 * Why the last run failed, as reported by the cube.
	 */
	readonly problem = input<string | null>(null);

	/**
	 * The user asked to run the program.
	 */
	readonly run = output<unknown>();

	/**
	 * The user asked to stop it.
	 */
	readonly stop = output<void>();

	/**
	 * The user asked to stop it and blank the cube.
	 */
	readonly reset = output<void>();

	protected readonly examples = EXAMPLE_PROGRAMS;

	protected readonly source = signal(JSON.stringify(EXAMPLE_PROGRAMS[0].program, null, 2));

	/**
	 * Why the text is not a program at all (not valid JSON).
	 */
	protected readonly syntaxProblem = signal<string | null>(null);

	protected load (id: string): void {
		const example = this.examples.find((candidate) => candidate.id === id);
		if (example) {
			this.source.set(JSON.stringify(example.program, null, 2));
			this.syntaxProblem.set(null);
		}
	}

	protected submit (): void {
		try {
			this.syntaxProblem.set(null);
			this.run.emit(JSON.parse(this.source()));
		} catch (error) {
			this.syntaxProblem.set(error instanceof Error ? error.message : String(error));
		}
	}
}
