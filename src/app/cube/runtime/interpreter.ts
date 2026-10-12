/**
 * LAYER: runtime (interpreter).
 *
 * Runs the blocks of one script, in order. It is a *generator*: a function that can pause in
 * the middle and be resumed later from exactly the same place. That is how many scripts can
 * share one thread and still look like they run at the same time.
 *
 *   const run = runBlocks(blocks, world);
 *   run.next();   // runs blocks until the first pause, then stops there
 *   run.next();   // continues from that pause
 *
 * A script pauses (yields) in two situations:
 *
 *   wait   the script asked to sleep for some time
 *   tick   a loop finished an iteration; it gives the others a turn before the next one
 *
 * The second one is the important safety rule: **a loop pauses at least once per iteration**.
 * Without it `forever { move }` would never give control back and would freeze the cube. If the
 * iteration already paused by itself (it contained a `wait`) no extra pause is added, so
 * `forever { move; wait 0.1 }` runs every 0.1 seconds and not a tick later.
 *
 * The interpreter only handles control flow. What a command *does* lives in the commands layer,
 * and *when* a paused script continues is decided by the scheduler.
 */

import { applyCommand, isCommand } from '../commands/apply-command';
import { Block } from '../program/program';
import { World } from '../world/world';

/**
 * Why a script paused.
 *
 *   tick  resume on the next tick
 *   wait  resume after this many milliseconds
 */
export type Pause =
	| { kind: 'tick' }
	| { kind: 'wait'; milliseconds: number };

/**
 * A script being run. Each `next()` runs until the next pause. The generator finishes when
 * the script has no blocks left.
 */
export type Run = Generator<Pause, boolean, undefined>;

/**
 * The pause a loop uses when its iteration did not pause by itself.
 */
const NEXT_TICK: Pause = { kind: 'tick' };

/**
 * Runs a list of blocks. Returns whether it paused at least once, which loops use to decide
 * if they still have to pause at the end of an iteration.
 */
export function* runBlocks (blocks: Block[], world: World): Run {
	let paused = false;

	for (const block of blocks) {
		if (isCommand(block)) {
			applyCommand(world, block);
			continue;
		}

		switch (block.op) {
			case 'wait':
				yield { kind: 'wait', milliseconds: block.seconds * 1000 };
				paused = true;
				break;

			case 'repeat':
				for (let i = 0; i < block.times; i += 1) {
					if (!(yield* runBlocks(block.body, world))) {
						yield NEXT_TICK;
					}
					paused = true;
				}
				break;

			case 'forever':
				for (;;) {
					if (!(yield* runBlocks(block.body, world))) {
						yield NEXT_TICK;
					}
				}
		}
	}

	return paused;
}
