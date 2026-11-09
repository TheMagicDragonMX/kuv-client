import * as THREE from 'three';
import { CubeState, FACE_COUNT, FACE_RESOLUTION } from '../state/cube-state';
import { CubeModel, createLedGeometry } from './cube-model';
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

	it('gives each LED a body that is cheaper than a box: 8 shared corners and 10 triangles, positions only', () => {
		for (const leds of matrices) {
			expect(leds.geometry.attributes['position'].count).toBe(8);
			expect(leds.geometry.index?.count).toBe(30);
			expect(Object.keys(leds.geometry.attributes)).toEqual([ 'position' ]);
		}
	});

	it('stands the body on the panel with its front where the front of the old box was', () => {
		const position = new THREE.Vector3();
		const matrix = new THREE.Matrix4();

		matrices[0].getMatrixAt(0, matrix);
		position.setFromMatrixPosition(matrix);
		matrices[0].geometry.computeBoundingBox();

		const box = matrices[0].geometry.boundingBox as THREE.Box3;

		expect(position.z + box.min.z).toBeCloseTo(0.002, 6);
		expect(position.z + box.max.z).toBeCloseTo(LED_DEPTH + 0.002, 6);
	});

	it('draws every triangle counter-clockwise seen from outside, so none of the visible ones is culled', () => {
		const geometry = createLedGeometry(0.03, 0.02);
		const points = geometry.attributes['position'];
		const index = geometry.index as THREE.BufferAttribute;
		const center = new THREE.Vector3(0, 0, 0.01);
		const corner = (at: number) => new THREE.Vector3().fromBufferAttribute(points, index.getX(at));

		for (let triangle = 0; triangle < index.count; triangle += 3) {
			const [ a, b, c ] = [ corner(triangle), corner(triangle + 1), corner(triangle + 2) ];
			const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
			const outward = new THREE.Vector3().addVectors(a, b).add(c).divideScalar(3).sub(center);

			expect(normal.dot(outward), `triangle ${triangle / 3}`).toBeGreaterThan(0);
		}
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
