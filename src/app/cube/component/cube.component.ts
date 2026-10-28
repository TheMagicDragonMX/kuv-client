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
 *   reset()             stop and clear the cube (the environment stays)
 *   showFace(face)      turn the camera to a face
 *   spin()              go back to the slow rotation
 *   running()           signal: is a program running?
 *   problem()           signal: message about why the last run failed, or null
 *   camera()            signal: the face being shown, or 'spin'
 *
 * Inputs: `program` (what to run), `autoplay` (run it whenever it changes), `config`
 * (engine settings for programs that do not set their own, like `topAnchor` and `floor`) and
 * `environment` (the stage: pictures on the faces. It shows at once and stays through runs).
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
	model,
	output,
	signal,
	untracked,
	viewChild,
} from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { EngineError, ProgramError } from '../errors';
import { CreateCommand } from '../blocks';
import { CubePlayer } from '../engine/cube-player';
import { Environment } from '../environment/environment';
import { parseColor } from '../program/names';
import { FaceName, ProgramConfig } from '../program/program';
import { FACE_RESOLUTION, Face } from '../state/cube-state';
import { CubeView } from '../view/cube-view';

/**
 * Color of the rectangle when an object has no lit pixel to take it from.
 */
const OUTLINE_COLOR = 0xf9a8d4;

/**
 * The color most of the pixels of an object have, which is what its rectangle is painted with.
 * Black is an LED that is off, so it does not count. On a tie the first color found wins.
 */
function dominantColor (object: CreateCommand): number {
	const counts = new Map<number, number>();
	const base = parseColor(object.color);

	const colors = object.pixels
		? object.pixels.map((pixel) => pixel.color === undefined ? base : parseColor(pixel.color))
		: [ base ];

	for (const color of colors)
		if (0 !== color)
			counts.set(color, (counts.get(color) ?? 0) + 1);

	let best = OUTLINE_COLOR;
	let most = 0;

	for (const [ color, count ] of counts)
		if (count > most) {
			best = color;
			most = count;
		}

	return best;
}

/**
 * A new starting place for an object, as the user dragged it: the same face, x and y a
 * `create` block has.
 */
export interface ObjectMove {
	name: string;
	face: FaceName;
	x: number;
	y: number;
}

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

	/**
	 * The stage the programs run on: pictures on the faces. Shown at once, and kept when the
	 * program stops, resets or runs again.
	 */
	readonly environment = input<Environment>();

	/**
	 * Objects to show on the cube while nothing runs, where they start, so they can be seen
	 * before any block exists.
	 */
	readonly objects = input<CreateCommand[]>();

	/**
	 * Names of the objects to keep out of sight, like a hidden layer. They are not drawn but
	 * still exist and move.
	 */
	readonly hiddenObjects = input<readonly string[]>([]);

	/**
	 * The user dragged an object (one of the `objects` input) to another cell, on the same face
	 * or another. Objects can only be dropped on cells of the cube, so they never leave it.
	 * Dragging is off while a program runs.
	 */
	readonly objectMoved = output<ObjectMove>();

	/**
	 * The object being handled, by name: the one dragging moves, shown inside a rectangle. When
	 * it is set, pressing inside its rectangle grabs it even if other objects cover it. Grabbing
	 * an object on the cube selects it.
	 */
	readonly selected = model<string | null>(null);

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
		onRunningChange: (running) => {
			this.runningState.set(running);
			this.refreshOutline();
		},
		onError: (error) => this.problemState.set(`Script ${error.script + 1} stopped: ${error.message}`),
	});

	constructor () {
		effect(() => this.player.setDefaults(this.config()));

		effect(() => {
			const environment = this.environment();

			untracked(() => this.applyEnvironment(environment));
		});

		effect(() => {
			const objects = this.objects();

			if (objects)
				untracked(() => {
					this.previewObjects(objects);
					this.refreshOutline();
				});
		});

		effect(() => {
			this.selected();

			untracked(() => this.refreshOutline());
		});

		effect(() => {
			const hidden = this.hiddenObjects();

			untracked(() => {
				this.player.setHidden(hidden);
				this.refreshOutline();
			});
		});

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
		const element = this.host().nativeElement;

		this.view = new CubeView(element, this.player.state);
		this.applyFog();
		this.refreshOutline();

		// In the capture phase, so grabbing an object is seen before the camera controls on the canvas.
		element.addEventListener('pointerdown', this.onPointerDown, true);
		element.addEventListener('pointermove', this.onHover);
	}

	/**
	 * The object being dragged: where it started and how far from its center it was grabbed.
	 */
	private drag?: { name: string; face: Face; offsetX: number; offsetY: number; last: string };

	/**
	 * Cells around an object that also grab it, so small objects are easy to hit.
	 */
	private static readonly GRAB_PADDING = 3;

	/**
	 * Draws the rectangle of the selected object (the area that grabs it), or none when nothing
	 * is selected, the object is hidden or a program is running.
	 */
	private refreshOutline (): void {
		const name = this.selected();

		const object = this.objects()?.find((candidate) => candidate.name === name);

		this.view?.setOutlines(
			object && !this.player.running ? this.player.frameOf(object.name, CubeComponent.GRAB_PADDING) : { boxes: [], edges: [] },
			object ? dominantColor(object) : OUTLINE_COLOR,
		);
	}

	/**
	 * The object a press grabs, with the pixel under the pointer, or null.
	 */
	private grabAt (event: PointerEvent) {
		if (this.player.running || !this.view)
			return null;

		const pixel = this.view.pixelAt(event.clientX, event.clientY);
		const object = pixel && this.player.grabAt(pixel.face, pixel.x, pixel.y, CubeComponent.GRAB_PADDING, this.selected());

		return pixel && object ? { pixel, object } : null;
	}

	private readonly onHover = (event: PointerEvent): void => {
		if (!this.drag)
			this.host().nativeElement.style.cursor = this.grabAt(event) ? 'grab' : '';
	};

	private readonly onPointerDown = (event: PointerEvent): void => {
		if (0 !== event.button)
			return;

		const grab = this.grabAt(event);

		if (!grab)
			return;

		event.stopPropagation();
		event.preventDefault();

		const { pixel, object } = grab;

		this.selected.set(object.name);

		const sameFace = object.center?.face === pixel.face;

		this.drag = {
			name: object.name,
			face: pixel.face,
			offsetX: sameFace ? pixel.x - object.center!.x : 0,
			offsetY: sameFace ? pixel.y - object.center!.y : 0,
			last: '',
		};
		this.host().nativeElement.style.cursor = 'grabbing';

		window.addEventListener('pointermove', this.onDrag);
		window.addEventListener('pointerup', this.onDrop);
		window.addEventListener('pointercancel', this.onDrop);
	};

	/**
	 * Moves the dragged object to the cell under the pointer. A pointer that is not over the
	 * cube, or over a cell where objects cannot be, leaves the object where it was.
	 */
	private readonly onDrag = (event: PointerEvent): void => {
		const drag = this.drag;
		const pixel = drag && this.view?.pixelAt(event.clientX, event.clientY);

		if (!drag || !pixel)
			return;

		// The grab offset only makes sense on the face where the object was grabbed.
		const kept = pixel.face === drag.face;
		const x = pixel.x - (kept ? drag.offsetX : 0);
		const y = pixel.y - (kept ? drag.offsetY : 0);
		const inFace = 0 <= x && x < FACE_RESOLUTION && 0 <= y && y < FACE_RESOLUTION;
		const placement = this.player.placementAt(pixel.face, inFace ? x : pixel.x, inFace ? y : pixel.y);

		if (!placement)
			return;

		const key = `${placement.face}/${placement.x}/${placement.y}`;

		if (key === drag.last)
			return;

		drag.last = key;
		this.objectMoved.emit({ name: drag.name, ...placement });
	};

	private readonly onDrop = (): void => {
		this.drag = undefined;
		this.host().nativeElement.style.cursor = '';

		window.removeEventListener('pointermove', this.onDrag);
		window.removeEventListener('pointerup', this.onDrop);
		window.removeEventListener('pointercancel', this.onDrop);
	};

	/**
	 * Shows the environment, reporting a picture of the wrong size as a problem.
	 */
	private applyEnvironment (environment: Environment | undefined): void {
		try {
			this.player.setEnvironment(environment);
		}

		catch (error) {
			if (!(error instanceof EngineError))
				throw error;

			this.problemState.set(error.message);
		}
	}

	/**
	 * Shows the objects at their starting place, reporting invalid ones as a problem.
	 */
	private previewObjects (objects: CreateCommand[]): void {
		try {
			this.player.preview(objects);
		}

		catch (error) {
			if (!(error instanceof ProgramError))
				throw error;

			this.problemState.set(error.message);
		}
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
		this.onDrop();
		this.host().nativeElement.removeEventListener('pointerdown', this.onPointerDown, true);
		this.host().nativeElement.removeEventListener('pointermove', this.onHover);
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
