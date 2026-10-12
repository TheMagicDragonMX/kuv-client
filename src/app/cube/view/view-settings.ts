/**
 * LAYER: 3D view (settings).
 *
 * Every measure and color of the 3D cube in one place. Units are three.js scene units
 * unless the name says otherwise.
 */

import { Face } from '../state/cube-state';

/**
 * Fog color; matches the page background so the far end of the scene fades into it.
 */
export const BACKGROUND = '#090d12';

/**
 * Distance from the cube center to each face plane (half the cube edge length).
 */
export const FACE_OFFSET = 1.45;

/**
 * Edge length of one face.
 */
export const FACE_SIZE = FACE_OFFSET * 2;

/**
 * Thickness of the gray frame block behind each panel; it extends inward from the face plane.
 */
export const FRAME_DEPTH = 0.2;

/**
 * Thickness of the dark panel slab that backs the LEDs.
 */
export const PANEL_DEPTH = 0.04;

/**
 * Margin between the panel edge and the outermost LEDs.
 */
export const EDGE_PADDING = 0.015;

/**
 * Thickness of each LED box, which sits on top of the panel surface.
 */
export const LED_DEPTH = 0.02;

/**
 * Duration of the camera animation when switching to a face, in milliseconds.
 */
export const VIEW_TRANSITION_MS = 900;

/**
 * Camera angle from the vertical axis when looking at a side face (slightly above the horizon).
 */
export const SIDE_VIEW_POLAR = Math.PI * 0.43;

/**
 * Camera angle from the vertical axis when looking down at the top face.
 */
export const TOP_VIEW_POLAR = Math.PI * 0.08;

/**
 * Camera angle around the vertical axis (0 = looking from +Z) that frames each face head-on.
 */
export const FACE_AZIMUTH: Record<Face, number> = {
	[Face.FRONT]: 0,
	[Face.RIGHT]: Math.PI / 2,
	[Face.BACK]: Math.PI,
	[Face.LEFT]: -Math.PI / 2,
	[Face.TOP]: 0,
};
