/**
 * LAYER: 3D view (stage).
 *
 * Everything in the 3D scene that is not the cube: fog, lights and the pedestal the cube
 * stands on. Pure decoration; it holds no state and reacts to nothing.
 */

import * as THREE from 'three';
import { BACKGROUND } from './view-settings';

export class Stage {
	readonly scene = new THREE.Scene();

	constructor () {
		this.scene.fog = new THREE.Fog(BACKGROUND, 8, 18);
		this.addLights();
		this.addBase();
	}

	/**
	 * Sets the fog color, so the far end of the scene fades into the page background.
	 */
	setFogColor (color: string): void {
		this.scene.fog?.color.set(color);
	}

	/**
	 * Adds an object (the cube) to the scene.
	 */
	add (object: THREE.Object3D): void {
		this.scene.add(object);
	}

	/**
	 * Frees the geometries and materials of the stage.
	 */
	dispose (): void {
		this.scene.traverse((node) => {
			if (node instanceof THREE.Mesh) {
				node.geometry.dispose();
				node.material.dispose();
			}
		});
	}

	/**
	 * Adds ambient fill plus a key light and a bluish rim light for depth.
	 */
	private addLights (): void {
		this.scene.add(new THREE.AmbientLight(0xffffff, 0.95));

		const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
		keyLight.position.set(4, 6, 5);
		this.scene.add(keyLight);

		const rimLight = new THREE.DirectionalLight(0x7fb3ff, 0.8);
		rimLight.position.set(-5, 2, -4);
		this.scene.add(rimLight);
	}

	/**
	 * Adds the pedestal (wide plate plus narrower stem) the cube stands on.
	 */
	private addBase (): void {
		const base = new THREE.Mesh(
			new THREE.BoxGeometry(3.4, 0.7, 3.4),
			new THREE.MeshStandardMaterial({ color: 0x2b2f35, metalness: 0.36, roughness: 0.7 }),
		);
		base.position.y = -1.38;
		base.castShadow = true;
		base.receiveShadow = true;
		this.scene.add(base);

		const centerStem = new THREE.Mesh(
			new THREE.BoxGeometry(2.2, 0.72, 2.2),
			new THREE.MeshStandardMaterial({ color: 0x3d4249, metalness: 0.45, roughness: 0.55 }),
		);
		centerStem.position.y = -0.82;
		centerStem.castShadow = true;
		centerStem.receiveShadow = true;
		this.scene.add(centerStem);
	}
}
