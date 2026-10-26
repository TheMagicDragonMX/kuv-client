/**
 * LAYER: Angular component.
 *
 * The only Angular code of the cube, and the way screens use it. It wraps the engine
 * (CubePlayer) and the 3D view (CubeView) so a screen needs nothing else:
 *
 *   <app-cube #cube class="block h-96 w-96" [program]="program" [autoplay]="true" />
 *   <button (click)="cube.run()">Run</button>
 *
 * The component fills the box it is given (give it a size with CSS, like any block element)
 * and shows the 3D cube inside. Everything else is on the object you get from the template reference:
 *
 *   run(program?)       run a program (the `program` input when none is given)
 *   stop()              stop the scripts, keep what the cube shows
 *   reset()             stop and blank the cube
 *   showFace(face)      turn the camera to a face
 *   spin()              go back to the slow rotation
 *   running()           signal: is a program running?
 *   problem()           signal: message about why the last run failed, or null
 *   camera()            signal: the face being shown, or 'spin'
 *
 * Inputs: `program` (what to run), `autoplay` (run it whenever it changes) and `config`
 * (engine settings for programs that do not set their own, like `topAnchor` and `floor`).
 */

import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	OnDestroy,
	AfterViewInit,
	effect,
	inject,
	input,
	signal,
	untracked,
	viewChild,
} from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { ProgramError } from '../errors';
import { CubePlayer } from '../engine/cube-player';
import { ProgramConfig } from '../program/program';
import { Face } from '../state/cube-state';
import { CubeView } from '../view/cube-view';

@Component({
	selector: 'app-cube',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'block' },
	template: '<div #host class="h-full w-full overflow-hidden [&>canvas]:block"></div>',
})
export class CubeComponent implements AfterViewInit, OnDestroy {
	/**
	 * The program to run. Anything is accepted; it is checked when it runs.
	 */
	readonly program = input<unknown>(null);

	/**
	 * Run the program automatically whenever it changes.
	 */
	readonly autoplay = input(false);

	/**
	 * Engine settings used when the program does not set its own.
	 */
	readonly config = input<ProgramConfig>();

	private readonly runningState = signal(false);

	private readonly problemState = signal<string | null>(null);

	private readonly cameraState = signal<Face | 'spin'>('spin');

	/**
	 * Whether a program is running.
	 */
	readonly running = this.runningState.asReadonly();

	/**
	 * Why the last run failed (invalid program, or a script that had to stop), or null.
	 */
	readonly problem = this.problemState.asReadonly();

	/**
	 * Face the camera is turned to, or 'spin' for the continuous rotation.
	 */
	readonly camera = this.cameraState.asReadonly();

	private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

	private view?: CubeView;

	private readonly theme = inject(ThemeService);

	private readonly player = new CubePlayer({
		onRunningChange: (running) => this.runningState.set(running),
		onError: (error) => this.problemState.set(`Script ${error.script + 1} stopped: ${error.message}`),
	});

	constructor () {
		effect(() => this.player.setDefaults(this.config()));

		effect(() => {
			this.theme.theme();
			this.applyFog();
		});

		effect(() => {
			const program = this.program();
			const autoplay = this.autoplay();

			if (autoplay && program)
				untracked(() => this.run(program));

		});
	}

	ngAfterViewInit (): void {
		this.view = new CubeView(this.host().nativeElement, this.player.state);
		this.applyFog();
	}

	/**
	 * Matches the fog to the page background of the current theme.
	 */
	private applyFog (): void {
		const fog = getComputedStyle(document.documentElement).getPropertyValue('--fog').trim();

		if (fog)
			this.view?.setFogColor(fog);
	}

	ngOnDestroy (): void {
		this.view?.dispose();
		this.player.dispose();
	}

	/**
	 * Runs a program from a clean cube. Without an argument it runs the `program` input.
	 * @returns Whether the program was valid and started. If not, `problem()` says why.
	 */
	run (program: unknown = this.program()): boolean {
		this.problemState.set(null);

		try {
			this.player.play(program);
			return true;
		}

		catch (error) {
			if (!(error instanceof ProgramError))
				throw error;

			this.problemState.set(error.message);
			return false;
		}
	}

	/**
	 * Stops the scripts. The cube keeps what it shows.
	 */
	stop (): void {
		this.player.stop();
	}

	/**
	 * Stops the scripts and blanks the cube.
	 */
	reset (): void {
		this.problemState.set(null);
		this.player.reset();
	}

	/**
	 * Smoothly turns the camera to look at a face head-on.
	 */
	showFace (face: Face): void {
		this.view?.lookAtFace(face);
		this.cameraState.set(face);
	}

	/**
	 * Goes back to the slow rotation around the cube.
	 */
	spin (): void {
		this.view?.spin();
		this.cameraState.set('spin');
	}
}
