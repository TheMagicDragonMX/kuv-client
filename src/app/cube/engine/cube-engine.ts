/**
 * LAYER: engine (facade).
 *
 * Puts the layers together behind a small interface, so nothing outside needs to know how
 * they fit:
 *
 *   program ──validate──▶ World ◀──commands── Scheduler ──runs──▶ Interpreter
 *   environment ──paints background of──▶ │
 *                           │
 *                           └──read by──▶ Renderer ──writes──▶ state (CubeState)
 *
 * The engine is **pure and clock-free**: it never reads the time and never sets timers. The
 * caller says what time it is (`start(now)`, `tick(now)`, in milliseconds). That makes it
 * trivial to test, and it is the same shape the Python engine on the Raspberry Pi will have.
 * `CubePlayer` is the one that adds a real clock.
 *
 * Typical use:
 *
 *   const engine = new CubeEngine();
 *   engine.load(program);          // checks the program; throws ProgramError if it is invalid
 *   engine.start(0);               // begins from a clean cube
 *   engine.tick(33);               // let time pass: scripts run, `engine.state` is updated
 *   engine.tick(66);
 */

import { Environment, paintEnvironment } from '../environment/environment';
import { applyCommand } from '../commands/apply-command';
import { GeometryConfig } from '../geometry/geometry';
import { FaceName, Program, ProgramConfig } from '../program/program';
import { FACE_BY_NAME, FACE_NAME } from '../program/names';
import { validateProgram } from '../program/validate-program';
import { Renderer } from '../renderer/renderer';
import { Scheduler, ScriptError } from '../runtime/scheduler';
import { CubeState, FACE_RESOLUTION, Face } from '../state/cube-state';
import { CubeObject } from '../world/cube-object';
import { World } from '../world/world';

/**
 * A rectangle of cells on one face, corners included.
 */
export interface Outline {
	face: Face;
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

/**
 * One side of a cell on a face.
 */
export interface Edge {
	face: Face;
	x: number;
	y: number;
	side: 'left' | 'right' | 'top' | 'bottom';
}

/**
 * The rectangle of an object on the cube: its part on each face, and the sides of cells that
 * draw its outline.
 */
export interface Frame {
	boxes: Outline[];
	edges: Edge[];
}

/**
 * What a press on the cube grabs: an object, and the pixel of its center.
 */
export interface Grab {
	name: string;
	center: { face: Face; x: number; y: number } | null;
}

/**
 * Settings of the engine.
 */
export type CubeEngineOptions = {
	/**
	 * Engine settings to use when a program does not set its own (top anchor, floor).
	 */
	defaults?: ProgramConfig;

	/**
	 * Called when a script has to stop because of a problem while running.
	 */
	onError?: (error: ScriptError) => void;
};

/**
 * Loads a program, runs it on a world and keeps `state` up to date with what the cube shows.
 */
export class CubeEngine {
	/**
	 * What the cube shows. The same object for the whole life of the engine, so a view can
	 * hold on to it. Updated by `tick`.
	 */
	readonly state = new CubeState();

	/**
	 * The loaded program. Empty until `load` is called.
	 */
	private program: Program = { version: 1, scripts: [] };

	/**
	 * The objects and background the program acts on.
	 */
	private world!: World;

	/**
	 * Paints the world onto `state`.
	 */
	private renderer!: Renderer;

	/**
	 * Runs the program's scripts over time.
	 */
	private scheduler!: Scheduler;

	/**
	 * Engine settings used when the program does not set its own.
	 */
	private defaults?: ProgramConfig;

	/**
	 * The stage the program runs on (images on the faces). It outlives programs: every start
	 * and reset paints it again.
	 */
	private environment?: Environment;

	/**
	 * Objects kept out of sight by the user (see `setHidden`).
	 */
	private hidden = new Set<string>();

	/**
	 * Builds the engine with the given options.
	 */
	constructor (
		/**
		 * Settings, callbacks and the clock the engine runs with.
		 */
		private readonly options: CubeEngineOptions = {},
	) {
		this.defaults = options.defaults;
		this.build();
	}

	/**
	 * True while a script is still running or may run again (an "every" script).
	 */
	get running (): boolean {
		return this.scheduler.active;
	}

	/**
	 * Changes the settings used when a program does not set its own. They apply from the next
	 * `start` or `reset`; what is running is not disturbed.
	 */
	setDefaults (defaults: ProgramConfig | undefined): void {
		this.defaults = defaults;
	}

	/**
	 * Changes the environment and shows it right away, even if nothing is running. A program
	 * that is running is not restarted: the new pictures are painted on its background, and a
	 * face whose picture was removed goes black. Throws an EngineError, leaving everything as it
	 * was, if a picture is not the size of a face.
	 */
	setEnvironment (environment: Environment | undefined): void {
		paintEnvironment(this.world, environment, this.environment);
		this.environment = environment;
		this.renderer.render();
	}

	/**
	 * Chooses the objects that are kept out of sight, like a hidden layer: they still exist and
	 * move, they are just not drawn. It applies at once, and again on every start and reset.
	 * Names with no object are ignored.
	 */
	setHidden (names: readonly string[]): void {
		const previous = this.hidden;

		this.hidden = new Set(names);

		for (const name of previous)
			if (!this.hidden.has(name))
				this.setVisible(name, true);

		this.applyHidden();
		this.renderer.render();
	}

	/**
	 * Hides the objects chosen with `setHidden` that exist in the current world.
	 */
	private applyHidden (): void {
		for (const name of this.hidden)
			this.setVisible(name, false);
	}

	/**
	 * Shows or hides one object, ignoring names with no object.
	 */
	private setVisible (name: string, visible: boolean): void {
		try {
			this.world.update(name, { visible });
		}

		catch {
			/**
			 * No object with that name (yet): nothing to change.
			 */
		}
	}

	/**
	 * The frame of an object: its rectangle (the cells of its shape grown by `padding` cells on
	 * every side) as it lies on the cube. The rectangle is one thing in the frame of the object,
	 * so where it goes over an edge it continues on the next face: `boxes` are the parts on each
	 * face, and `edges` are the sides of cells that make up its outline, which does not run along
	 * the edges of the cube. Empty if the object is hidden or does not exist.
	 */
	frameOf (name: string, padding = 0): Frame {
		const frame: Frame = { boxes: [], edges: [] };
		let object: CubeObject;

		try {
			object = this.world.get(name);
		}

		catch {
			return frame;
		}

		if (!object.visible)
			return frame;

		const columns = object.shape.map((part) => part.dx);
		const rows = object.shape.map((part) => part.dy);
		const left = Math.min(...columns) - padding;
		const right = Math.max(...columns) + padding;
		const top = Math.min(...rows) - padding;
		const bottom = Math.max(...rows) + padding;
		const boxes = new Map<Face, Outline>();

		for (let dy = top; dy <= bottom; dy += 1)
			for (let dx = left; dx <= right; dx += 1) {
				const cell = this.world.geometry.cellAt(object.pose, dx, dy);

				if (!cell)
					continue;

				const { pixel } = cell;
				const box = boxes.get(pixel.face);

				if (box) {
					box.x0 = Math.min(box.x0, pixel.x);
					box.y0 = Math.min(box.y0, pixel.y);
					box.x1 = Math.max(box.x1, pixel.x);
					box.y1 = Math.max(box.y1, pixel.y);
				}

				else
					boxes.set(pixel.face, { face: pixel.face, x0: pixel.x, y0: pixel.y, x1: pixel.x, y1: pixel.y });

				// Each side of the rectangle, in the direction it points on this face.
				const sides: [ boolean, number, number ][] = [
					[ dx === left, -cell.right[0], -cell.right[1] ],
					[ dx === right, cell.right[0], cell.right[1] ],
					[ dy === top, -cell.down[0], -cell.down[1] ],
					[ dy === bottom, cell.down[0], cell.down[1] ],
				];

				for (const [ onSide, sideX, sideY ] of sides)
					if (onSide)
						frame.edges.push({ face: pixel.face, x: pixel.x, y: pixel.y, side: 0 > sideX ? 'left' : 0 < sideX ? 'right' : 0 > sideY ? 'top' : 'bottom' });
			}

		frame.boxes = [ ...boxes.values() ];

		return frame;
	}

	/**
	 * The object a press on a pixel of the cube grabs. The target of an object is its rectangle
	 * grown by `padding` cells, so small objects are easy to hit. Among the objects whose target
	 * contains the pixel, the frontmost layer wins; if `preferred` is one of them it wins
	 * instead, which is how an object covered by others can still be reached. Also gives the
	 * pixel of the center of the object (null if it is not on a visible cell).
	 */
	grabAt (face: Face, x: number, y: number, padding: number, preferred?: string | null): Grab | null {
		const contains = (name: string) => this.frameOf(name, padding).boxes
			.some((box) => box.face === face && box.x0 <= x && x <= box.x1 && box.y0 <= y && y <= box.y1);
		let found: CubeObject | null = null;

		for (const object of this.world.all())
			if (!(found && found.name === preferred) && contains(object.name))
				found = object;

		return found && { name: found.name, center: this.world.geometry.toPixel(found.pose) };
	}

	/**
	 * The placement (face, x, y as in a `create` block) for a pixel of the cube, or null when
	 * objects cannot be placed there.
	 */
	placementAt (face: Face, x: number, y: number): { face: FaceName; x: number; y: number } | null {
		const placement = this.world.geometry.placementOf({ face, x, y });

		return placement && { face: FACE_NAME[placement.face], x: placement.x, y: placement.y };
	}

	/**
	 * Checks a program and keeps it, ready to start. Stops whatever was running and blanks the
	 * cube. If the program is invalid it throws a ProgramError and the engine is left as it was.
	 */
	load (program: unknown): void {
		this.program = validateProgram(program);
		this.build();
	}

	/**
	 * Starts the loaded program from a clean cube. Starting again restarts from scratch.
	 * @param now Current time in milliseconds.
	 */
	start (now: number): void {
		this.build();
		this.scheduler.start(now);
		this.tick(now);
	}

	/**
	 * Lets time pass: scripts that are ready run, then the cube is redrawn if anything changed.
	 * @param now Current time in milliseconds. Must not go backwards.
	 */
	tick (now: number): void {
		this.scheduler.tick(now);
		this.renderer.render();
	}

	/**
	 * Stops the scripts. What is on the cube stays.
	 */
	stop (): void {
		this.scheduler.stop();
	}

	/**
	 * Stops the scripts and blanks the cube.
	 */
	reset (): void {
		this.build();
	}

	/**
	 * Creates a fresh world, renderer and scheduler for the loaded program and draws the
	 * result: the environment and the objects the program starts with, because no script has run yet. Everything that changes while a program runs lives in those three, so
	 * replacing them is what gives every run a clean start.
	 */
	private build (): void {
		this.world = new World(this.geometryConfig());
		this.renderer = new Renderer(this.world, this.state);
		this.scheduler = new Scheduler(this.world, this.program.scripts, (error) => this.options.onError?.(error));

		paintEnvironment(this.world, this.environment);

		for (const object of this.program.objects ?? [])
			applyCommand(this.world, object);

		this.applyHidden();
		this.state.fill(0);
		this.renderer.render();
	}

	/**
	 * Geometry settings: what the program says, falling back to the engine defaults.
	 */
	private geometryConfig (): GeometryConfig {
		const topAnchor = this.program.config?.topAnchor ?? this.defaults?.topAnchor;
		const floor = this.program.config?.floor ?? this.defaults?.floor;

		return {
			topAnchor: topAnchor && FACE_BY_NAME[topAnchor],
			floor,
		};
	}
}
