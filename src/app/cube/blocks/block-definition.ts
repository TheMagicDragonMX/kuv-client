/**
 * LAYER: blocks (definitions).
 *
 * What every block file in this folder has to provide. A block is described by one object:
 *
 *   schema    which fields the block has and what kind of value each takes
 *   apply     (commands only) what the block does to the world
 *
 * Control blocks (wait, repeat, forever) have no `apply`: they decide *when* other blocks run,
 * which is the interpreter's job.
 */

import { World } from '../world/world';
import { FieldSchema } from './fields';

/**
 * The fields a block must describe: exactly the ones in its interface, except `op`. The
 * compiler fails if the schema misses a field, or has one the interface does not.
 */
export type SchemaOf<B extends { op: string }> = { [K in keyof Omit<B, 'op'>]-?: FieldSchema };

/**
 * Everything the engine needs to know about a block, except what it does.
 */
export interface BlockDefinition<B extends { op: string }> {
	schema: SchemaOf<B>;
}

/**
 * A block that takes effect immediately.
 */
export interface CommandDefinition<C extends { op: string }> extends BlockDefinition<C> {
	apply(world: World, command: C): void;
}
