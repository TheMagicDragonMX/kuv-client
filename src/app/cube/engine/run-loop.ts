/**
 * LAYER: engine (run loop).
 *
 * A timer that calls a function at a steady rate, handing it the current time in
 * milliseconds. That is all it does. It is separate from the engine so the engine never has
 * to know about clocks or timers.
 */

/**
 * Default number of ticks per second.
 */
export const DEFAULT_TICK_RATE = 30;

export class RunLoop {
	private timer?: ReturnType<typeof setInterval>;

	/**
	 * @param tickRate Ticks per second.
	 * @param clock Source of the current time in milliseconds. Replaceable for tests.
	 */
	constructor (
		private readonly tickRate = DEFAULT_TICK_RATE,
		private readonly clock: () => number = () => performance.now(),
	) {}

	/**
	 * True between `start` and `stop`.
	 */
	get running (): boolean {
		return this.timer !== undefined;
	}

	/**
	 * Current time, as this loop sees it.
	 */
	now (): number {
		return this.clock();
	}

	/**
	 * Calls `onTick` at the tick rate until stopped. Starting again replaces the callback.
	 */
	start (onTick: (now: number) => void): void {
		this.stop();
		this.timer = setInterval(() => onTick(this.clock()), 1000 / this.tickRate);
	}

	/**
	 * Stops calling.
	 */
	stop (): void {
		if (this.timer !== undefined) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}
}
