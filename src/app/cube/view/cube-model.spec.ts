import * as THREE from 'three';
import { CubeState, FACE_COUNT, FACE_RESOLUTION } from '../state/cube-state';
import { CubeModel } from './cube-model';
import { Stage } from './stage';
import { LED_DEPTH } from './view-settings';

/**
 * Every mesh in a group.
 */
function meshesOf (root: THREE.Object3D): THREE.Mesh[] {
	const meshes: THREE.Mesh[] = [];

	root.traverse((node) => {
		if (node instanceof THREE.Mesh)
			meshes.push(node);
	});

	return meshes;
}

describe('CubeModel', () => {
	const model = new CubeModel(new CubeState());
	const matrices = meshesOf(model.group).filter((mesh): mesh is THREE.InstancedMesh => mesh instanceof THREE.InstancedMesh);

	it('has one instanced mesh of LEDs for each face', () => {
		expect(matrices).toHaveLength(FACE_COUNT);

		for (const leds of matrices)
			expect(leds.count).toBe(FACE_RESOLUTION * FACE_RESOLUTION);
	});

	it('makes each LED a single square facing out, not a box', () => {
		for (const leds of matrices) {
			expect(leds.geometry.attributes['position'].count).toBe(4);
			expect(leds.geometry.index?.count).toBe(6);
		}
	});

	it('puts the squares where the front of the old boxes was, just above the panel', () => {
		const position = new THREE.Vector3();
		const matrix = new THREE.Matrix4();

		matrices[0].getMatrixAt(0, matrix);
		position.setFromMatrixPosition(matrix);

		expect(position.z).toBeCloseTo(LED_DEPTH + 0.002, 6);
	});

	it('does not ask for shadows that no light casts', () => {
		for (const mesh of [ ...meshesOf(model.group), ...meshesOf(new Stage().scene) ]) {
			expect(mesh.castShadow).toBe(false);
			expect(mesh.receiveShadow).toBe(false);
		}

		const lights: THREE.Light[] = [];

		new Stage().scene.traverse((node) => {
			if (node instanceof THREE.Light)
				lights.push(node);
		});

		expect(lights.length).toBeGreaterThan(0);
		expect(lights.every((light) => !light.castShadow)).toBe(true);
	});
});
