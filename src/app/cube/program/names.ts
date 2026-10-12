/**
 * LAYER: program format (names).
 *
 * Converts the readable names used in programs ('FRONT', 'NORTH', '#ff8800') into the values
 * the engine works with (Face, Heading, 0xRRGGBB), and back. It is the only place that
 * knows both vocabularies.
 */

import { Color, Face } from '../state/cube-state';
import { Heading } from '../geometry/geometry';
import { ColorValue, FaceName, HeadingName } from './program';

/**
 * Face for each face name.
 */
export const FACE_BY_NAME: Record<FaceName, Face> = {
	FRONT: Face.FRONT,
	RIGHT: Face.RIGHT,
	BACK: Face.BACK,
	LEFT: Face.LEFT,
	TOP: Face.TOP,
};

/**
 * Heading for each heading name.
 */
export const HEADING_BY_NAME: Record<HeadingName, Heading> = {
	NORTH: Heading.NORTH,
	EAST: Heading.EAST,
	SOUTH: Heading.SOUTH,
	WEST: Heading.WEST,
};

/**
 * Matches a color written as `#rrggbb`.
 */
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * Tells whether a value is a color written as `#rrggbb`.
 */
export function isColorValue (value: unknown): value is ColorValue {
	return typeof value === 'string' && COLOR_PATTERN.test(value);
}

/**
 * Converts `#rrggbb` to the packed number the pixel buffer uses.
 */
export function parseColor (value: ColorValue): Color {
	return Number.parseInt(value.slice(1), 16);
}

/**
 * Converts a packed color back to `#rrggbb`.
 */
export function formatColor (color: Color): ColorValue {
	return `#${color.toString(16).padStart(6, '0')}`;
}
