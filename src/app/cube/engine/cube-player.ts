/**
 * LAYER: engine (player).
 *
 * The engine plus a real clock: "give it a program and it runs". This is what a screen uses.
 *
 *   const player = new CubePlayer();
 *   player.play(program);        // runs on its own, ticking in the background
 *   player.state                 // what the cube shows (give it to a 3D view)
 *   player.stop();               // stop the scripts, keep the picture
 *   player.reset();              // stop and clear the cube (only the environment stays)
 *   player.dispose();            // when finished with it
 *
 * It starts its timer on `play` and stops it by itself when the program is over (no script is
 * left running), so a finished program costs nothing.
 */

import { Environment } from '../environment/environment';
import { CreateCommand } from '../blocks';
import { ProgramConfig } from '../program/program';
import { CubeState } from '../state/cube-state';
import { CubeEngine, CubeEngineOptions } from './cube-engine';
import { DEFAULT_TICK_RATE, RunLoop } from './run-loop';

/**
 * Settings of the player: those of the engine, plus timing and a status callback.
 */
export interface CubePlayerOptions extends CubeEngineOptions {
	/**
	 * Ticks per second.
	 */
	tickRate?: number;

	/**
	 * Source of the current time in milliseconds. Defaults to `performance.now()`.
	 */
	clock?: () => number;

	/**
	 * Called whenever the program starts or stops running.
	 */
	onRunningChange?: (running: boolean) => void;
}

export class CubePlayer {
	private readonly engine: CubeEngine;

	private readonly loop: RunLoop;

	/**
	 * Last value sent to `onRunningChange`.
	 */
	private reportedRunning = false;

	constructor (private readonly options: CubePlayerOptions = {}) {
		this.engine = new CubeEngine(options);
		this.loop = new RunLoop(options.tickRate ?? DEFAULT_TICK_RATE, options.clock);
	}

	/**
	 * What the cube shows.
	 */
	get state (): CubeState {
		return this.engine.state;
	}

	/**
	 * True while the program is running.
	 */
	get running (): boolean {
		return this.engine.running;
	}

	/**
	 * Changes the engine settings used by programs that do not set their own. They apply from
	 * the next `play` or `reset`.
	 */
	setDefaults (defaults: ProgramConfig | undefined): void {
		this.engine.setDefaults(defaults);
	}

	/**
	 * Changes the images on the faces and shows them at once, without disturbing what runs.
	 * They stay through every run and reset. Throws an EngineError if a picture is invalid.
	 */
	setEnvironment (environment: Environment | undefined): void {
		this.engine.setEnvironment(environment);
	}

	/**
	 * Checks the program and runs it from a clean cube. Throws a ProgramError, leaving
	 * everything as it was, if the program is invalid.
	 */
	play (program: unknown): void {
		this.engine.load(program);
		this.engine.start(this.loop.now());
		this.loop.start((now) => {
			this.engine.tick(now);
			this.sync();
		});
		this.sync();
	}

	/**
	 * Keeps some objects out of sight (a hidden layer). See `CubeEngine.setHidden`.
	 */
	setHidden (names: readonly string[]): void {
		this.engine.setHidden(names);
	}

	/**
	 * Shows objects on the cube without running anything: a program with no scripts, so the
	 * objects sit where they start. Does nothing while a program is running. Throws a
	 * ProgramError if the objects are invalid.
	 */
	preview (objects: CreateCommand[]): void {
		if (this.engine.running)
			return;

		this.engine.load({ version: 1, objects, scripts: [] });
	}

	/**
	 * Stops the scripts. The cube keeps what it shows.
	 */
	stop (): void {
		this.engine.stop();
		this.sync();
	}

	/**
	 * Stops the scripts and clears the cube back to the environment.
	 */
	reset (): void {
		this.engine.reset();
		this.sync();
	}

	/**
	 * Stops everything for good. The player cannot be used afterwards.
	 */
	dispose (): void {
		this.loop.stop();
	}

	/**
	 * Stops the timer when nothing is running any more, and reports changes of status.
	 */
	private sync (): void {
		const running = this.engine.running;

		if (!running) 
			this.loop.stop();
		
		if (running !== this.reportedRunning) {
			this.reportedRunning = running;
			this.options.onRunningChange?.(running);
		}
	}
}
