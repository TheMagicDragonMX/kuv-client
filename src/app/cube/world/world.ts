/**
 * LAYER: world.
 *
 * The source of truth for *what exists* on the cube: the objects, and the background layer
 * that holds the pictures and colors behind the objects.
 *
 *   commands --change--> World <--read by-- renderer
 *
 * The world never draws anything and never decides when things happen; it only stores things
 * and keeps a `version` that goes up on every change, so the renderer can skip frames where
 * nothing changed.
 */

import { CubeGeometry, GeometryConfig } from '../geometry/geometry';
import { CubeState } from '../state/cube-state';
import { EngineError } from '../errors';
import { CubeObject } from './cube-object';

/**
 * The parts of an object a command can change.
 */
export type ObjectChanges = Partial<Pick<CubeObject, 'pose' | 'color' | 'visible'>>;

export class World {

	/**
	 * How the surfaces of this world connect. Fixed for the life of the world, because the
	 * poses of the objects only make sense with the settings they were created with.
	 */
	readonly geometry: CubeGeometry;

	/**
	 * Persistent layer under the objects. It is written by the environment (the pictures the
	 * user puts on the faces before running) and by the background blocks (a program changing
	 * what is behind the objects). The renderer copies it first on every frame, so what is
	 * painted here stays on the cube.
	 */
	readonly background = new CubeState();

	/**
	 * Objects by name. A Map remembers insertion order, so objects are drawn in the order
	 * they were created (later ones on top).
	 */
	private readonly objects = new Map<string, CubeObject>();

	/**
	 * Number of changes made to the objects.
	 */
	private objectChanges = 0;

	constructor (config: GeometryConfig = {}) {
		this.geometry = new CubeGeometry(config);
	}

	/**
	 * Goes up whenever the objects or the background change.
	 */
	get version (): number {
		return this.objectChanges + this.background.version;
	}

	/**
	 * Adds an object. Its name must not be taken.
	 */
	add (object: CubeObject): void {
		if (this.objects.has(object.name))
			throw new EngineError(`There is already an object called "${object.name}"`);

		this.objects.set(object.name, object);
		this.objectChanges += 1;
	}

	/**
	 * Returns the object with a name, or throws if there is none.
	 */
	get (name: string): CubeObject {
		const object = this.objects.get(name);
		if (!object)
			throw new EngineError(`There is no object called "${name}"`);

		return object;
	}

	/**
	 * Replaces some properties of an object, keeping its place in the drawing order.
	 */
	update (name: string, changes: ObjectChanges): void {
		this.objects.set(name, { ...this.get(name), ...changes });
		this.objectChanges += 1;
	}

	/**
	 * Removes an object.
	 */
	remove (name: string): void {
		this.get(name);
		this.objects.delete(name);
		this.objectChanges += 1;
	}

	/**
	 * Every object, in drawing order.
	 */
	all (): IterableIterator<CubeObject> {
		return this.objects.values();
	}

	/**
	 * Removes every object and blanks the background.
	 */
	clear (): void {
		this.objects.clear();
		this.objectChanges += 1;
		this.background.fill(0);
	}
}
