/**
 * LAYER: 3D view (entry point).
 *
 * Shows a CubeState as a 3D LED cube inside an HTML element. It puts together the parts of
 * this folder and owns the WebGL renderer and the render loop:
 *
 *   Stage (lights, pedestal) + CubeModel (the cube) --seen through--> CameraRig --> canvas
 *
 * It only *reads* the state. Whoever owns the state decides what is on it; to show something
 * else, change the state and the view redraws by itself on the next frame.
 *
 * A frame is only drawn when something on screen changed: the LEDs, the camera or the size.
 * A cube that shows a still picture from a still camera costs the GPU nothing.
 *
 *   const view = new CubeView(element, state);
 *   view.lookAtFace(Face.TOP);
 *   view.dispose();     // when the element goes away
 */

import * as THREE from 'three';
import { CubeState, Face } from '../state/cube-state';
import { CameraRig } from './camera-rig';
import { CubeModel, SelectionFrame } from './cube-model';
import { Stage } from './stage';
import { BACKGROUND } from './view-settings';

/**
 * Milliseconds between two frames while the camera only turns by itself.
 */
const SPIN_FRAME_MS = 1000 / 30;

/**
 * Draws the cube in a host element with three.js and lets the user orbit around it.
 */
export class CubeView {
	/**
	 * The three.js renderer that draws into the host element.
	 */
	private readonly renderer: THREE.WebGLRenderer;

	/**
	 * The scene around the cube.
	 */
	private readonly stage = new Stage();

	/**
	 * The cube itself, kept in sync with the cube state.
	 */
	private readonly model: CubeModel;

	/**
	 * The camera and its controls.
	 */
	private readonly rig: CameraRig;

	/**
	 * Reports when the host element changes size, so the canvas can follow.
	 */
	private readonly resizeObserver: ResizeObserver;

	/**
	 * Id of the pending requestAnimationFrame, kept so the render loop can be cancelled.
	 */
	private animationFrameId?: number;

	/**
	 * Whether the next frame must be drawn even if the LEDs and the camera did not change
	 * (the first frame, and after a resize, which clears the canvas).
	 */
	private needsDraw = true;

	/**
	 * @param host Element the canvas is appended to; its size determines the render size.
	 * @param state Pixel buffer to display; the cube redraws whenever it changes.
	 */
	constructor (
		private readonly host: HTMLElement,
		state: CubeState,
	) {
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		/**
		 * Transparent canvas so the cube blends with whatever is behind it.
		 */
		this.renderer.setClearColor(BACKGROUND, 0);
		host.appendChild(this.renderer.domElement);

		this.model = new CubeModel(state);
		this.stage.add(this.model.group);
		this.rig = new CameraRig(this.renderer.domElement);

		this.resize();
		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(host);
		this.startRenderLoop();
	}

	/**
	 * The pixel of the cube under a point of the screen, or null if the point is not on the cube.
	 * @param clientX Horizontal position in the page, as in a pointer event.
	 * @param clientY Vertical position in the page.
	 */
	pixelAt (clientX: number, clientY: number): { face: Face; x: number; y: number } | null {
		const box = this.renderer.domElement.getBoundingClientRect();

		if (!box.width || !box.height)
			return null;

		const point = new THREE.Vector2(
			(clientX - box.left) / box.width * 2 - 1,
			-((clientY - box.top) / box.height * 2 - 1),
		);
		const origin = this.rig.camera.position.clone();
		const direction = new THREE.Vector3(point.x, point.y, 0.5).unproject(this.rig.camera).sub(origin).normalize();

		return this.model.pick(origin, direction);
	}

	/**
	 * Shows a rectangle over the cube, replacing the one shown before, in a color (0xRRGGBB).
	 * Where it goes over an edge it is still one rectangle. An empty frame removes it.
	 */
	setOutlines (frame: SelectionFrame, color: number): void {
		this.model.setOutlines(frame, color);
		this.needsDraw = true;
	}

	/**
	 * Smoothly orbits the camera	/**
	 * Smoothly orbits the camera until the given face is shown head-on, and stops the auto-rotation.
	 * @param duration Milliseconds the turn takes; a longer one is gentler.
	 */
	lookAtFace (face: Face, duration?: number): void {
		this.rig.lookAtFace(face, duration);
	}

	/**
	 * How far the camera has to turn to look at a face head-on, in radians.
	 */
	angleTo (face: Face): number {
		return this.rig.angleTo(face);
	}

	/**
	 * Keeps the camera where it is: stops the automatic rotation and any turn in progress.
	 */
	hold (): void {
		this.rig.hold();
	}

	/**
	 * How much a face looks at the camera: 1 head-on, 0 edge-on, negative when turned away.
	 */
	facing (face: Face): number {
		return this.rig.facing(face);
	}

	/**
	 * Goes back to the slow continuous rotation around the cube.
	 */
	spin (): void {
		this.rig.spin();
	}

	/**
	 * Sets the fog color, so the far end of the scene fades into the page background.
	 */
	setFogColor (color: string): void {
		this.stage.setFogColor(color);
	}

	/**
	 * Stops rendering, removes listeners and the canvas, and frees the GPU resources.
	 * Call when done with the view.
	 */
	dispose (): void {
		this.resizeObserver.disconnect();
		if (this.animationFrameId !== undefined) 
			cancelAnimationFrame(this.animationFrameId);
		
		this.rig.dispose();
		this.model.dispose();
		this.stage.dispose();
		this.renderer.dispose();

		/**
		 * `dispose` frees the buffers but leaves the WebGL context alive until the garbage collector
		 * takes it, and browsers only keep about 16: opening the editor again and again would make
		 * the browser drop the oldest one, maybe one still on screen. This frees it now.
		 */
		this.renderer.forceContextLoss();
		this.renderer.domElement.remove();
	}

	/**
	 * Fits the renderer and the camera to the current size of the host.
	 */
	private resize (): void {
		const width = this.host.clientWidth;
		const height = this.host.clientHeight;
		if (!width || !height) 
			return;
		

		this.rig.resize(width, height);
		this.renderer.setSize(width, height);
		this.needsDraw = true;
	}

	/**
	 * Starts the per-frame loop: copy the state to the LEDs if it changed, move the camera, and
	 * draw if either of them (or the size) changed.
	 */
	private startRenderLoop (): void {
		let lastDraw = 0;

		const render = (now: number) => {
			/**
			 * Both run every frame, so neither is skipped by the other short-circuiting.
			 */
			const ledsChanged = this.model.syncIfChanged();
			const cameraMoved = this.rig.update();

			/**
			 * While the camera only turns by itself it moves so little per frame that 30 frames a
			 * second look the same as the 60 to 144 of the screen. A frame skipped here is not lost:
			 * the camera keeps its place and the next frame drawn shows it.
			 */
			const cameraDue = cameraMoved && (!this.rig.spinningAlone() || now - lastDraw >= SPIN_FRAME_MS - 1);

			if (ledsChanged || cameraDue || this.needsDraw) {
				this.model.hideFacesAway(this.rig.camera);
				this.renderer.render(this.stage.scene, this.rig.camera);
				this.needsDraw = false;
				lastDraw = now;
			}

			this.animationFrameId = requestAnimationFrame(render);
		};
		this.animationFrameId = requestAnimationFrame(render);
	}
}
