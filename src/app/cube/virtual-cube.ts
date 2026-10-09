import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Color shared by the scene background, fog and renderer clear color so they blend seamlessly.
 */
const BACKGROUND = '#090d12';

/**
 * Distance from the cube center to each face plane (half the cube edge length), in scene units.
 */
const FACE_OFFSET = 1.45;

/**
 * Edge length of one face, in scene units.
 */
const FACE_SIZE = FACE_OFFSET * 2;

/**
 * Thickness of the gray frame block behind each panel; it extends inward from the face plane.
 */
const FRAME_DEPTH = 0.2;

/**
 * Thickness of the dark panel slab that backs the LEDs.
 */
const PANEL_DEPTH = 0.04;

/**
 * Number of LEDs per side on each face (the physical panels are 64x64).
 */
const GRID_SIZE = 64;

/**
 * Margin between the panel edge and the outermost LEDs, in scene units.
 */
const EDGE_PADDING = 0.015;

/**
 * Thickness of each LED box, which sits on top of the panel surface.
 */
const LED_DEPTH = 0.02;

/**
 * 3D representation of the LED cube (five lit faces on a base).
 * Owns the three.js scene and render loop; a component only needs to
 * provide a host element and call dispose() when it goes away.
 */
export class VirtualCube {
	/**
	 * WebGL renderer; draws the scene into a canvas appended to the host element.
	 */
	private renderer: THREE.WebGLRenderer;

	/**
	 * Root of everything drawn: lights, base and cube.
	 */
	private scene = new THREE.Scene();

	/**
	 * Viewpoint the scene is rendered from; orbited by the user via `controls`.
	 */
	private camera: THREE.PerspectiveCamera;

	/**
	 * Mouse/touch orbit and zoom around the cube, with slow auto-rotation.
	 */
	private controls: OrbitControls;

	/**
	 * Parent of the five faces, so the cube can be positioned or transformed as one unit.
	 */
	private cubeGroup = new THREE.Group();

	/**
	 * Dark backing slab of each face, indexed like `ledMatrices`; restyled when panels toggle.
	 */
	private panelMeshes: THREE.Mesh[] = [];

	/**
	 * Current LED color (hex) of each face, indexed like `ledMatrices`.
	 */
	private panelColors: number[] = [];

	/**
	 * One instanced mesh per face holding its 64x64 LEDs in a single draw call.
	 */
	private ledMatrices: THREE.InstancedMesh[] = [];

	/**
	 * Material of each face's LEDs, indexed like `ledMatrices`; controls color and glow.
	 */
	private ledMaterials: THREE.MeshStandardMaterial[] = [];

	/**
	 * Id of the pending requestAnimationFrame, kept so the render loop can be cancelled.
	 */
	private animationFrameId?: number;

	/**
	 * Whether the LEDs are lit (true) or the cube shows its inert, unpowered look (false).
	 */
	private panelsEnabled = false;

	/**
	 * Bound window resize handler, stored so the same reference can be removed on dispose.
	 */
	private resizeListener = () => this.resize();

	/**
	 * Builds the scene inside `host` and starts rendering.
	 * @param host Element the canvas is appended to; its size determines the render size.
	 */
	constructor (private readonly host: HTMLElement) {
		this.scene.background = new THREE.Color(BACKGROUND);
		this.scene.fog = new THREE.Fog(BACKGROUND, 8, 18);

		this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
		this.camera.position.set(0, 2.2, 7.5);

		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setClearColor(BACKGROUND);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		host.appendChild(this.renderer.domElement);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.enablePan = false;
		this.controls.enableZoom = true;
		this.controls.minDistance = 5.4;
		this.controls.maxDistance = 12;
		this.controls.minPolarAngle = Math.PI * 0.28;
		this.controls.maxPolarAngle = Math.PI * 0.75;
		this.controls.autoRotate = true;
		this.controls.autoRotateSpeed = 1.1;
		this.controls.target.set(0, 0.6, 0);

		this.addLights();
		this.cubeGroup.position.y = 0.4;
		this.scene.add(this.cubeGroup);
		this.addBase();
		this.addFaces();
		this.applyPanelState();

		this.resize();
		window.addEventListener('resize', this.resizeListener);
		this.startRenderLoop();
	}

	/**
	 * True when the LED panels are currently lit.
	 */
	get isPanelsEnabled (): boolean {
		return this.panelsEnabled;
	}

	/**
	 * Turns the LED panels on or off.
	 */
	setPanelsEnabled (enabled: boolean): void {
		this.panelsEnabled = enabled;
		this.applyPanelState();
	}

	/**
	 * Fits the renderer and camera aspect to the host's current size. Also runs on window resize.
	 */
	resize (): void {
		const width = this.host.clientWidth;
		const height = this.host.clientHeight;
		if (!width || !height) {
			return;
		}

		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
	}

	/**
	 * Stops rendering, removes listeners and the canvas, and frees the renderer. Call when done with the cube.
	 */
	dispose (): void {
		window.removeEventListener('resize', this.resizeListener);
		if (this.animationFrameId !== undefined) {
			cancelAnimationFrame(this.animationFrameId);
		}
		this.controls.dispose();
		this.renderer.dispose();
		this.renderer.domElement.remove();
	}

	/**
	 * Adds ambient fill plus a warm key light and a bluish rim light for depth.
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

	/**
	 * Creates the five visible faces (front, right, left, back, top), each with frame, panel and LED grid.
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
		const ledSize = (ledSpan / GRID_SIZE) * 0.7;
		// Outer LEDs sit flush with the panel edge so neighbouring faces' LEDs end up one pitch apart.
		const ledPitch = (ledSpan - ledSize) / (GRID_SIZE - 1);
		const ledGeometry = new THREE.BoxGeometry(ledSize, ledSize, LED_DEPTH);

		const faceConfigs = [
			{ position: new THREE.Vector3(0, 0, FACE_OFFSET), rotation: new THREE.Euler(0, 0, 0) },
			{ position: new THREE.Vector3(FACE_OFFSET, 0, 0), rotation: new THREE.Euler(0, Math.PI / 2, 0) },
			{ position: new THREE.Vector3(-FACE_OFFSET, 0, 0), rotation: new THREE.Euler(0, -Math.PI / 2, 0) },
			{ position: new THREE.Vector3(0, 0, -FACE_OFFSET), rotation: new THREE.Euler(0, Math.PI, 0) },
			{ position: new THREE.Vector3(0, FACE_OFFSET, 0), rotation: new THREE.Euler(-Math.PI / 2, 0, 0) },
		];

		for (const config of faceConfigs) {
			const faceGroup = new THREE.Group();
			faceGroup.position.copy(config.position);
			faceGroup.rotation.copy(config.rotation);

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
					color: 0x2c323b,
					emissive: 0x1f2937,
					emissiveIntensity: 0.4,
					roughness: 0.55,
					metalness: 0.15,
				}),
			);
			panel.position.z = -PANEL_DEPTH / 2 + 0.001;
			panel.castShadow = true;
			panel.receiveShadow = true;
			faceGroup.add(panel);
			this.panelMeshes.push(panel);

			const ledColor = this.randomPastelColor();
			this.panelColors.push(ledColor);
			const ledMaterial = new THREE.MeshStandardMaterial({
				color: ledColor,
				emissive: ledColor,
				emissiveIntensity: 1.4,
				roughness: 0.08,
				metalness: 0.02,
			});
			const ledMatrix = new THREE.InstancedMesh(ledGeometry, ledMaterial, GRID_SIZE * GRID_SIZE);
			const dummy = new THREE.Object3D();
			const ledZ = LED_DEPTH / 2 + 0.002;
			let ledIndex = 0;

			for (let row = 0; row < GRID_SIZE; row += 1) {
				for (let col = 0; col < GRID_SIZE; col += 1) {
					dummy.position.set(
						-ledSpan / 2 + ledSize / 2 + col * ledPitch,
						-ledSpan / 2 + ledSize / 2 + row * ledPitch,
						ledZ,
					);
					dummy.updateMatrix();
					ledMatrix.setMatrixAt(ledIndex, dummy.matrix);
					ledIndex += 1;
				}
			}

			ledMatrix.instanceMatrix.needsUpdate = true;
			ledMatrix.visible = false;
			this.ledMatrices.push(ledMatrix);
			this.ledMaterials.push(ledMaterial);
			faceGroup.add(ledMatrix);

			this.cubeGroup.add(faceGroup);
		}
	}

	/**
	 * Returns a random light green-to-purple hex color, used as placeholder LED color.
	 */
	private randomPastelColor (): number {
		const color = new THREE.Color();
		const hue = 150 + Math.random() * 160;
		color.setHSL(hue / 360, 0.55 + Math.random() * 0.2, 0.72 + Math.random() * 0.08);
		return color.getHex();
	}

	/**
	 * Syncs panel backing and LED visibility, color and glow with `panelsEnabled`.
	 */
	private applyPanelState (): void {
		for (const panel of this.panelMeshes) {
			const material = panel.material as THREE.MeshStandardMaterial;
			if (this.panelsEnabled) {
				// Dark backing so the lit LEDs read as individual pixels.
				material.color.setHex(0x0b0d10);
				material.emissive.setHex(0x000000);
				material.emissiveIntensity = 0;
			} else {
				material.color.setHex(0x2c323b);
				material.emissive.setHex(0x1f2937);
				material.emissiveIntensity = 0.25;
			}
		}

		this.ledMatrices.forEach((ledMatrix, index) => {
			const material = this.ledMaterials[index];
			const color = this.panelColors[index] ?? 0xf8fafc;
			ledMatrix.visible = this.panelsEnabled;
			material.color.setHex(color);
			material.emissive.setHex(color);
			material.emissiveIntensity = this.panelsEnabled ? 1.4 : 0;
		});
	}

	/**
	 * Starts the per-frame loop that updates the controls and renders the scene.
	 */
	private startRenderLoop (): void {
		const render = () => {
			this.controls.update();
			this.renderer.render(this.scene, this.camera);
			this.animationFrameId = requestAnimationFrame(render);
		};
		this.animationFrameId = requestAnimationFrame(render);
	}
}
