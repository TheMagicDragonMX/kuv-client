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
import { GeometryConfig } from '../geometry/geometry';
import { Program, ProgramConfig } from '../program/program';
import { FACE_BY_NAME } from '../program/names';
import { validateProgram } from '../program/validate-program';
import { Renderer } from '../renderer/renderer';
import { Scheduler, ScriptError } from '../runtime/scheduler';
import { CubeState } from '../state/cube-state';
import { World } from '../world/world';

/**
 * Settings of the engine.
 */
export interface CubeEngineOptions {
	/**
	 * Engine settings to use when a program does not set its own (top anchor, floor).
	 */
	defaults?: ProgramConfig;

	/**
	 * Called when a script has to stop because of a problem while running.
	 */
	onError?: (error: ScriptError) => void;
}

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

	private world!: World;

	private renderer!: Renderer;

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

	constructor (private readonly options: CubeEngineOptions = {}) {
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
	 * result, which is the environment alone because no script has run yet. Everything that changes while a program runs lives in those three, so
	 * replacing them is what gives every run a clean start.
	 */
	private build (): void {
		this.world = new World(this.geometryConfig());
		this.renderer = new Renderer(this.world, this.state);
		this.scheduler = new Scheduler(this.world, this.program.scripts, (error) => this.options.onError?.(error));

		paintEnvironment(this.world, this.environment);

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
