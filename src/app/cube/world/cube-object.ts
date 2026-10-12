/**
 * LAYER: world (object definition).
 *
 * What an object is. An object is a small piece of data, not a class with behavior: the
 * commands change it, the renderer reads it.
 */

import { Color } from '../state/cube-state';
import { Pose } from '../geometry/geometry';

/**
 * Something that lives on the cube and can be moved around by a program.
 *
 * For now every object is a single pixel. `shape` is here so rectangles, circles and sprites
 * can be added later without changing how objects are stored.
 */
export interface CubeObject {
	/**
	 * Unique name; commands use it to say which object they act on.
	 */
	readonly name: string;

	/**
	 * What the object looks like.
	 */
	readonly shape: 'pixel';

	/**
	 * Where the object is and which way it faces. See `Pose`.
	 */
	readonly pose: Pose;

	/**
	 * Color it is drawn with (0xRRGGBB).
	 */
	readonly color: Color;

	/**
	 * Hidden objects still exist and keep moving, but are not drawn.
	 */
	readonly visible: boolean;
}
