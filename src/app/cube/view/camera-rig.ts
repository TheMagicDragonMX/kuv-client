/**
 * LAYER: 3D view (camera).
 *
 * The camera and everything that moves it: mouse/touch orbit and zoom, slow automatic
 * rotation, and the animated turn to look at one face head-on.
 *
 * It knows nothing about the cube's contents; it only orbits around a point.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Face } from '../state/cube-state';
import { FACE_AZIMUTH, SIDE_VIEW_POLAR, TOP_VIEW_POLAR, VIEW_TRANSITION_MS } from './view-settings';

/**
 * An in-progress camera move, interpolated from the starting angles to the target ones.
 */
interface ViewTransition {
	startTime: number;
	fromTheta: number;
	fromPhi: number;
	toTheta: number;
	toPhi: number;
}

export class CameraRig {
	readonly camera: THREE.PerspectiveCamera;

	/**
	 * Mouse/touch orbit and zoom around the cube, with slow auto-rotation.
	 */
	private readonly controls: OrbitControls;

	/**
	 * Camera move currently playing, or undefined when the camera is free.
	 */
	private transition?: ViewTransition;

	/**
	 * @param domElement Element that receives the mouse and touch input (the canvas).
	 */
	constructor (domElement: HTMLElement) {
		this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
		this.camera.position.set(0, 2.2, 7.5);

		this.controls = new OrbitControls(this.camera, domElement);
		this.controls.enableDamping = true;
		this.controls.enablePan = false;
		this.controls.enableZoom = true;
		this.controls.minDistance = 5.4;
		this.controls.maxDistance = 12;
		this.controls.minPolarAngle = Math.PI * 0.05;
		this.controls.maxPolarAngle = Math.PI * 0.75;
		this.controls.autoRotate = true;
		this.controls.autoRotateSpeed = 1.1;
		this.controls.target.set(0, 0.6, 0);

		// Grabbing the cube cancels any camera animation that is still playing.
		this.controls.addEventListener('start', () => {
			this.transition = undefined;
		});
	}

	/**
	 * Smoothly orbits the camera until the given face is shown head-on, and stops the auto-rotation.
	 */
	lookAtFace (face: Face): void {
		const offset = this.camera.position.clone().sub(this.controls.target);
		const spherical = new THREE.Spherical().setFromVector3(offset);
		const toTheta = FACE_AZIMUTH[face];

		// Top view keeps the current azimuth so the camera does not swing around for nothing.
		const targetTheta = face === Face.TOP ? spherical.theta : toTheta;
		// Take the shortest way around instead of unwinding a full turn.
		const delta = Math.atan2(Math.sin(targetTheta - spherical.theta), Math.cos(targetTheta - spherical.theta));

		this.controls.autoRotate = false;
		this.transition = {
			startTime: performance.now(),
			fromTheta: spherical.theta,
			fromPhi: spherical.phi,
			toTheta: spherical.theta + delta,
			toPhi: face === Face.TOP ? TOP_VIEW_POLAR : SIDE_VIEW_POLAR,
		};
	}

	/**
	 * Goes back to the slow continuous rotation around the cube.
	 */
	spin (): void {
		this.transition = undefined;
		this.controls.autoRotate = true;
	}

	/**
	 * Fits the camera to a new size of the viewport.
	 */
	resize (width: number, height: number): void {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	}

	/**
	 * Advances the camera by one frame: the current transition (if any) and the controls.
	 */
	update (): void {
		this.advanceTransition();
		this.controls.update();
	}

	/**
	 * Removes the input listeners.
	 */
	dispose (): void {
		this.controls.dispose();
	}

	/**
	 * Moves the camera one step along the current transition, if any.
	 */
	private advanceTransition (): void {
		if (!this.transition) 
			return;
		

		const { startTime, fromTheta, fromPhi, toTheta, toPhi } = this.transition;
		const progress = Math.min((performance.now() - startTime) / VIEW_TRANSITION_MS, 1);
		// Ease in and out so the motion starts and ends gently.
		const eased = 0.5 > progress ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;

		const offset = this.camera.position.clone().sub(this.controls.target);
		const radius = offset.length();
		offset.setFromSphericalCoords(
			radius,
			fromPhi + (toPhi - fromPhi) * eased,
			fromTheta + (toTheta - fromTheta) * eased,
		);
		this.camera.position.copy(this.controls.target).add(offset);

		if (1 === progress) 
			this.transition = undefined;
		
	}
}
