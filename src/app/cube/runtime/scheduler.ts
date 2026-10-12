/**
 * LAYER: runtime (scheduler).
 *
 * Decides *when* each script gets to run. The interpreter knows how to run a script until it
 * pauses; the scheduler keeps every script of the program, remembers when each one wants to
 * continue, and gives each a turn on every tick.
 *
 *   tick(now):
 *     1. for every "every N seconds" script that is due, start a new run (unless the
 *        previous run is still going)
 *     2. for every running script whose wake-up time has come, resume it once; it runs until
 *        its next pause
 *
 * Properties worth knowing:
 *
 *   - Time is real time in milliseconds, passed in by the caller (`now`). The scheduler never
 *     reads a clock itself, so tests can drive it with made-up times.
 *   - A script is resumed **at most once per tick**, so a script can never run away inside one
 *     tick, however many loops it has.
 *   - `wait` counts from the moment the script was *supposed* to wake up, not from the tick
 *     that happened to run it. Otherwise every wait would last up to one tick too long, and a
 *     loop with `wait 0.1` would drift. The correction is capped (MAX_CATCH_UP) so that after
 *     a long freeze (a hidden browser tab) scripts do not rush to catch up.
 *   - A script that fails (for example it moves an object that does not exist) is stopped and
 *     reported. The other scripts keep running.
 */

import { Script } from '../program/program';
import { World } from '../world/world';
import { Pause, Run, runBlocks } from './interpreter';

/**
 * Most a script is allowed to run "in the past" to make up for a late tick, in milliseconds.
 */
const MAX_CATCH_UP = 100;

/**
 * A problem that stopped one script.
 */
export interface ScriptError {
	/**
	 * Index of the script in the program.
	 */
	script: number;

	/**
	 * What went wrong, in words a user can read.
	 */
	message: string;
}

/**
 * One running script.
 */
interface Task {
	script: number;
	run: Run;

	/**
	 * Time from which the task can be resumed.
	 */
	wakeAt: number;

	/**
	 * Moment the task was meant to continue, when it paused with a `wait`. Undefined when it
	 * paused with a tick: then it continues "from now".
	 */
	scheduledAt?: number;
}

/**
 * Starts a script again every so often.
 */
interface IntervalTimer {
	script: number;
	milliseconds: number;
	nextAt: number;
}

export class Scheduler {
	private tasks: Task[] = [];

	private timers: IntervalTimer[] = [];

	constructor (
		private readonly world: World,
		private readonly scripts: Script[],
		private readonly onError: (error: ScriptError) => void,
	) {}

	/**
	 * True while there is anything left to run: a script mid-way, or a timer that will start one.
	 */
	get active (): boolean {
		return 0 < this.tasks.length || 0 < this.timers.length;
	}

	/**
	 * Starts the program: scripts triggered by `start` begin, and interval timers are set.
	 * Nothing runs until the next `tick`.
	 */
	start (now: number): void {
		this.stop();

		this.scripts.forEach((script, index) => {
			if ('start' === script.trigger.type)
				this.spawn(index, now);

			else {
				const milliseconds = script.trigger.seconds * 1000;
				this.timers.push({ script: index, milliseconds, nextAt: now + milliseconds });
			}
		});
	}

	/**
	 * Gives every script that is ready one turn.
	 */
	tick (now: number): void {
		this.fireTimers(now);

		for (const task of [ ...this.tasks ])
			if (now >= task.wakeAt)
				this.resume(task, now);


	}

	/**
	 * Forgets every script and timer. What they already did to the world stays.
	 */
	stop (): void {
		this.tasks = [];
		this.timers = [];
	}

	/**
	 * Starts a run of a script, to be resumed on the next tick.
	 */
	private spawn (script: number, now: number): void {
		this.tasks.push({ script, run: runBlocks(this.scripts[script].blocks, this.world), wakeAt: now });
	}

	/**
	 * Starts the runs of the interval scripts that are due.
	 */
	private fireTimers (now: number): void {
		for (const timer of this.timers) {
			if (now < timer.nextAt)
				continue;

			if (!this.tasks.some((task) => task.script === timer.script))
				this.spawn(timer.script, now);

			// Skip any whole intervals that were missed instead of firing them all at once.
			while (timer.nextAt <= now)
				timer.nextAt += timer.milliseconds;

		}
	}

	/**
	 * Runs a task until its next pause, and files it until it is due again.
	 */
	private resume (task: Task, now: number): void {
		const resumedAt = task.scheduledAt === undefined
			? now
			: Math.min(now, Math.max(task.scheduledAt, now - MAX_CATCH_UP));

		let result: IteratorResult<Pause, boolean>;
		try {
			result = task.run.next();
		}

		catch (error) {
			this.tasks = this.tasks.filter((other) => other !== task);
			this.onError({
				script: task.script,
				message: error instanceof Error ? error.message : String(error),
			});
			return;
		}

		if (result.done)
			this.tasks = this.tasks.filter((other) => other !== task);

		else if ('wait' === result.value.kind) {
			task.scheduledAt = resumedAt + result.value.milliseconds;
			task.wakeAt = task.scheduledAt;
		}

		else {
			task.scheduledAt = undefined;
			task.wakeAt = now;
		}
	}
}
