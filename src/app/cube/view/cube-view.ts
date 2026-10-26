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
import { CubeModel } from './cube-model';
import { Stage } from './stage';
import { BACKGROUND } from './view-settings';

export class CubeView {
	private readonly renderer: THREE.WebGLRenderer;

	private readonly stage = new Stage();

	private readonly model: CubeModel;

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
		// Transparent canvas so the cube blends with whatever is behind it.
		this.renderer.setClearColor(BACKGROUND, 0);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
	 * Smoothly orbits the camera until the given face is shown head-on, and stops the auto-rotation.
	 */
	lookAtFace (face: Face): void {
		this.rig.lookAtFace(face);
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
		const render = () => {
			// Both run every frame, so neither is skipped by the other short-circuiting.
			const ledsChanged = this.model.syncIfChanged();
			const cameraMoved = this.rig.update();

			if (ledsChanged || cameraMoved || this.needsDraw) {
				this.renderer.render(this.stage.scene, this.rig.camera);
				this.needsDraw = false;
			}

			this.animationFrameId = requestAnimationFrame(render);
		};
		this.animationFrameId = requestAnimationFrame(render);
	}
}
