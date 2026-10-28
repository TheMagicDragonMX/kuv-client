/**
 * LAYER: 3D view (the cube itself).
 *
 * Builds the three.js model of the cube: five faces, each made of a frame, a dark panel and a
 * 64x64 grid of LEDs, and keeps the LED colors in sync with a CubeState.
 *
 *   CubeState --copied by--> CubeModel --is part of--> the scene
 *
 * Each face's 4096 LEDs are one *instanced mesh*: the GPU draws them all in a single call,
 * and the only per-LED data is a color. The model only reads the state and never changes it.
 * The order of the faces here is the order of the `Face` enum, so a face is also an index.
 *
 * Copying the colors is the hottest loop of the view (20480 LEDs, on every frame the state
 * changed), so it is kept cheap on purpose:
 *
 *   - it reads each face in bulk (`CubeState.facePixels`) instead of pixel by pixel
 *   - it converts colors with a lookup table instead of `THREE.Color`, which would compute
 *     the sRGB to linear curve (a `Math.pow`) for every channel of every LED
 *   - it remembers what it copied last time and only touches the LEDs that changed, so a
 *     face where nothing changed is not even sent to the GPU again
 */

import * as THREE from 'three';
import { CubeState, FACE_RESOLUTION, Face } from '../state/cube-state';
import { EDGE_PADDING, FACE_OFFSET, FACE_SIZE, FRAME_DEPTH, LED_DEPTH, PANEL_DEPTH } from './view-settings';

/**
 * One side of a cell on a face, part of the outline of a rectangle.
 */
export interface SelectionEdge {
	face: Face;
	x: number;
	y: number;
	side: 'left' | 'right' | 'top' | 'bottom';
}

/**
 * A rectangle over the cube: the part of it on each face, and the sides of cells that draw
 * its outline.
 */
export interface SelectionFrame {
	boxes: readonly { face: Face; x0: number; y0: number; x1: number; y1: number }[];
	edges: readonly SelectionEdge[];
}

/**
 * Where each face sits and how it is turned, in `Face` order.
 */
const FACE_PLACEMENTS = [
	{ position: new THREE.Vector3(0, 0, FACE_OFFSET), rotation: new THREE.Euler(0, 0, 0) },
	{ position: new THREE.Vector3(FACE_OFFSET, 0, 0), rotation: new THREE.Euler(0, Math.PI / 2, 0) },
	{ position: new THREE.Vector3(-FACE_OFFSET, 0, 0), rotation: new THREE.Euler(0, -Math.PI / 2, 0) },
	{ position: new THREE.Vector3(0, 0, -FACE_OFFSET), rotation: new THREE.Euler(0, Math.PI, 0) },
	{ position: new THREE.Vector3(0, FACE_OFFSET, 0), rotation: new THREE.Euler(-Math.PI / 2, 0, 0) },
];

/**
 * Linear value of each 0..255 sRGB channel, which is what three.js wants in the LED color
 * buffer. It is computed with `THREE.Color` itself, so the LEDs get exactly the colors
 * `setHex` would give them.
 */
const SRGB_TO_LINEAR = (() => {
	const color = new THREE.Color();
	const table = new Float32Array(256);

	for (let value = 0; 256 > value; value += 1)
		table[value] = color.setHex(value << 16).r;

	return table;
})();

export class CubeModel {
	/**
	 * Parent of the five faces, so the cube can be positioned as one unit.
	 */
	readonly group = new THREE.Group();

	/**
	 * Color buffer of each face's LEDs (r, g, b per LED, linear), indexed by `Face`.
	 */
	private readonly ledColors: THREE.InstancedBufferAttribute[] = [];

	/**
	 * Colors each face's LEDs show right now, in state order (0xRRGGBB), indexed by `Face`.
	 * Comparing against it is how `syncLeds` finds the LEDs that changed.
	 */
	private readonly shownPixels: Uint32Array[] = [];

	/**
	 * `CubeState.version` last copied to the LEDs, so unchanged frames skip the copy.
	 */
	private renderedVersion = -1;

	/**
	 * The dark panel of each face, indexed by `Face`. It is what pointer picking hits.
	 */
	private readonly panels: THREE.Mesh[] = [];

	/**
	 * Where the selection rectangles of each face go, indexed by `Face`.
	 */
	private readonly outlines: THREE.Group[] = [];

	constructor (private readonly state: CubeState) {
		this.group.position.y = 0.4;
		this.addFaces();
	}

	/**
	 * Copies the state to the LEDs if it changed since the last call.
	 * @returns Whether any LED changed color, so the view knows the frame must be drawn.
	 */
	syncIfChanged (): boolean {
		return this.renderedVersion !== this.state.version && this.syncLeds();
	}

	/**
	 * The LED under a ray, as a face and a pixel of the state (x to the right, y down from the
	 * top-left, as seen from outside), or null if the ray misses the cube. The ray is cut with
	 * the plane of each face in the frame of that face, and the nearest cut inside a face wins.
	 */
	pick (origin: THREE.Vector3, direction: THREE.Vector3): { face: Face; x: number; y: number } | null {
		this.group.updateMatrixWorld(true);

		let best: { face: Face; x: number; y: number } | null = null;
		let bestDistance = Infinity;
		const inverse = new THREE.Matrix4();
		const start = new THREE.Vector3();
		const way = new THREE.Vector3();
		const half = FACE_SIZE / 2;
		const clamp = (value: number) => Math.min(FACE_RESOLUTION - 1, Math.max(0, Math.floor(value)));

		this.panels.forEach((panel, face: Face) => {
			inverse.copy(panel.matrixWorld).invert();
			start.copy(origin).applyMatrix4(inverse);
			way.copy(direction).transformDirection(inverse);

			// Only from outside (in front of the face, going toward it).
			if (0 >= start.z || 0 <= way.z)
				return;

			const distance = -start.z / way.z;
			const x = start.x + way.x * distance;
			const y = start.y + way.y * distance;

			if (distance < bestDistance && Math.abs(x) <= half && Math.abs(y) <= half) {
				bestDistance = distance;
				best = { face, x: clamp((x + half) / FACE_SIZE * FACE_RESOLUTION), y: clamp((half - y) / FACE_SIZE * FACE_RESOLUTION) };
			}
		});

		return best;
	}

	/**
	 * Shows one rectangle over the cube (and removes the one shown before): a light fill on each
	 * face it covers, and an outline made only of the sides of the rectangle, so where it goes
	 * over an edge of the cube it is not cut in two. The color is 0xRRGGBB.
	 */
	setOutlines (frame: SelectionFrame, color: number): void {
		for (const group of this.outlines)
			for (const child of [ ...group.children ]) {
				group.remove(child);

				if (child instanceof THREE.Mesh) {
					child.geometry.dispose();
					(child.material as THREE.Material).dispose();
				}
			}

		const cell = FACE_SIZE / FACE_RESOLUTION;
		const thickness = cell / 3;
		const z = LED_DEPTH + 0.01;
		const fill = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false });
		const border = new THREE.MeshBasicMaterial({ color, depthWrite: false });
		const piece = (face: Face, width: number, height: number, centerX: number, centerY: number, paint: THREE.Material) => {
			const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), paint);

			mesh.position.set(centerX, centerY, z);
			this.outlines[face].add(mesh);
		};
		// Position on a face of the left and top side of a pixel.
		const leftOf = (x: number) => -FACE_SIZE / 2 + x * cell;
		const topOf = (y: number) => FACE_SIZE / 2 - y * cell;

		for (const box of frame.boxes) {
			const width = (box.x1 + 1 - box.x0) * cell;
			const height = (box.y1 + 1 - box.y0) * cell;

			piece(box.face, width, height, leftOf(box.x0) + width / 2, topOf(box.y0) - height / 2, fill);
		}

		// Neighbouring sides on the same line are joined into one strip.
		const lines = new Map<string, { face: Face; side: SelectionEdge['side']; line: number; cells: number[] }>();

		for (const edge of frame.edges) {
			const horizontal = 'top' === edge.side || 'bottom' === edge.side;
			const line = horizontal ? edge.y : edge.x;
			const key = `${edge.face}/${edge.side}/${line}`;
			const found = lines.get(key) ?? { face: edge.face, side: edge.side, line, cells: [] };

			found.cells.push(horizontal ? edge.x : edge.y);
			lines.set(key, found);
		}

		for (const { face, side, line, cells } of lines.values()) {
			cells.sort((first, second) => first - second);

			let start = 0;

			for (let index = 1; index <= cells.length; index += 1) {
				if (index < cells.length && cells[index] === cells[index - 1] + 1)
					continue;

				const first = cells[start];
				const length = (cells[index - 1] - first + 1) * cell;

				if ('top' === side || 'bottom' === side)
					piece(face, length, thickness, leftOf(first) + length / 2, topOf('top' === side ? line : line + 1), border);

				else
					piece(face, thickness, length, leftOf('left' === side ? line : line + 1), topOf(first) - length / 2, border);

				start = index;
			}
		}
	}

	/**
	 * Frees the geometries and materials of the cube.
	 */
	dispose (): void {
		this.group.traverse((node) => {
			if (node instanceof THREE.Mesh) {
				node.geometry.dispose();
				const materials: THREE.Material[] = Array.isArray(node.material) ? node.material : [ node.material ];
				materials.forEach((material) => material.dispose());
			}
		});
	}

	/**
	 * Creates the five faces (front, right, left, back, top), each with frame, panel and LED grid.
	 */
	private addFaces (): void {
		const frameMaterial = new THREE.MeshStandardMaterial({
			color: 0x4c4f56,
			metalness: 0.22,
			roughness: 0.72,
		});

		// Layout along each face's local Z (outward normal), relative to the face plane:
		//   frame:  [-FRAME_DEPTH, 0]  -> outer surface flush with the cube shell
		//   panel:  [0, PANEL_DEPTH]
		//   LEDs:   just above the panel surface
		const ledSpan = FACE_SIZE - EDGE_PADDING * 2;
		const ledSize = (ledSpan / FACE_RESOLUTION) * 0.7;
		// Outer LEDs sit flush with the panel edge so neighbouring faces' LEDs end up one pitch apart.
		const ledPitch = (ledSpan - ledSize) / (FACE_RESOLUTION - 1);
		const ledGeometry = new THREE.BoxGeometry(ledSize, ledSize, LED_DEPTH);

		for (const placement of FACE_PLACEMENTS) {
			const faceGroup = new THREE.Group();
			faceGroup.position.copy(placement.position);
			faceGroup.rotation.copy(placement.rotation);

			const frame = new THREE.Mesh(
				new THREE.BoxGeometry(FACE_SIZE, FACE_SIZE, FRAME_DEPTH),
				frameMaterial,
			);
			frame.position.z = -FRAME_DEPTH / 2;
			frame.castShadow = true;
			frame.receiveShadow = true;
			faceGroup.add(frame);

			const panel = new THREE.Mesh(
				new THREE.BoxGeometry(FACE_SIZE, FACE_SIZE, PANEL_DEPTH),
				new THREE.MeshStandardMaterial({
					// Dark backing so the lit LEDs read as individual pixels.
					color: 0x0b0d10,
					roughness: 0.55,
					metalness: 0.15,
				}),
			);
			panel.position.z = -PANEL_DEPTH / 2 + 0.001;
			panel.castShadow = true;
			panel.receiveShadow = true;
			faceGroup.add(panel);
			this.panels.push(panel);

			// Unlit material so each LED shows exactly its own color.
			const ledMatrix = new THREE.InstancedMesh(
				ledGeometry,
				new THREE.MeshBasicMaterial({ color: 0xffffff }),
				FACE_RESOLUTION * FACE_RESOLUTION,
			);
			const dummy = new THREE.Object3D();
			const ledZ = LED_DEPTH / 2 + 0.002;
			let ledIndex = 0;

			for (let row = 0; row < FACE_RESOLUTION; row += 1)
				for (let col = 0; col < FACE_RESOLUTION; col += 1) {
					dummy.position.set(
						-ledSpan / 2 + ledSize / 2 + col * ledPitch,
						-ledSpan / 2 + ledSize / 2 + row * ledPitch,
						ledZ,
					);
					dummy.updateMatrix();
					ledMatrix.setMatrixAt(ledIndex, dummy.matrix);
					ledIndex += 1;
				}


			ledMatrix.instanceMatrix.needsUpdate = true;
			// Every LED starts black (all zeros) on both sides: the buffer and what it shows.
			const ledColors = new THREE.InstancedBufferAttribute(new Float32Array(FACE_RESOLUTION * FACE_RESOLUTION * 3), 3);
			ledMatrix.instanceColor = ledColors;
			this.ledColors.push(ledColors);
			this.shownPixels.push(new Uint32Array(FACE_RESOLUTION * FACE_RESOLUTION));
			faceGroup.add(ledMatrix);

			const outline = new THREE.Group();
			faceGroup.add(outline);
			this.outlines.push(outline);

			this.group.add(faceGroup);
		}
	}

	/**
	 * Copies the colors of the cube state to the LEDs of every face, touching only the LEDs
	 * whose color changed and uploading only the faces that have one.
	 * @returns Whether any LED changed.
	 */
	private syncLeds (): boolean {
		let anyChanged = false;

		this.ledColors.forEach((ledColors, face: Face) => {
			const pixels = this.state.facePixels(face);
			const shown = this.shownPixels[face];
			const buffer = ledColors.array;
			let faceChanged = false;

			for (let y = 0; y < FACE_RESOLUTION; y += 1) {
				const stateRow = y * FACE_RESOLUTION;
				// Instances are laid out from the bottom row up, the state from the top row down.
				const ledRow = (FACE_RESOLUTION - 1 - y) * FACE_RESOLUTION;

				for (let x = 0; x < FACE_RESOLUTION; x += 1) {
					const color = pixels[stateRow + x];
					if (color === shown[stateRow + x])
						continue;

					const offset = (ledRow + x) * 3;
					buffer[offset] = SRGB_TO_LINEAR[(color >>> 16) & 0xff];
					buffer[offset + 1] = SRGB_TO_LINEAR[(color >>> 8) & 0xff];
					buffer[offset + 2] = SRGB_TO_LINEAR[color & 0xff];
					shown[stateRow + x] = color;
					faceChanged = true;
				}
			}

			if (faceChanged) {
				ledColors.needsUpdate = true;
				anyChanged = true;
			}
		});

		this.renderedVersion = this.state.version;
		return anyChanged;
	}
}
