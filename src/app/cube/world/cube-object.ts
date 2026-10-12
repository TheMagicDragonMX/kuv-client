/**
 * LAYER: world (object definition).
 *
 * What an object is. An object is a small piece of data, not a class with behavior: the
 * commands change it, the renderer reads it.
 */

import { Color } from '../state/cube-state';
import { Pose } from '../geometry/geometry';

/**
 * One pixel of an object's shape.
 *
 * `dx` and `dy` are cells from the center of the object, in the object's own frame: `dx`
 * grows to its right and `dy` grows downward, as seen when it faces north. When the object
 * turns (crossing the top face, or created with another heading) the shape turns with it.
 * A pixel without a color is drawn with the color of the object.
 */
export interface ShapePixel {
	readonly dx: number;
	readonly dy: number;
	readonly color?: Color;
}

/**
 * The shape of a plain pixel: just the center.
 */
export const SINGLE_PIXEL: readonly ShapePixel[] = [ { dx: 0, dy: 0 } ];

/**
 * Something that lives on the cube and can be moved around by a program.
 *
 * An object is a set of pixels around a center. The pose is the pose of the center; the
 * geometry finds where every other pixel lands, so a shape that reaches over an edge is
 * drawn on the other side of it.
 */
export interface CubeObject {
	/**
	 * Unique name; commands use it to say which object they act on.
	 */
	readonly name: string;

	/**
	 * Pixels the object is made of, around its center. Later pixels are drawn over earlier
	 * ones.
	 */
	readonly shape: readonly ShapePixel[];

	/**
	 * Where the object is and which way it faces. See `Pose`.
	 */
	readonly pose: Pose;

	/**
	 * Color of the pixels that do not have their own (0xRRGGBB).
	 */
	readonly color: Color;

	/**
	 * Hidden objects still exist and keep moving, but are not drawn.
	 */
	readonly visible: boolean;
}
