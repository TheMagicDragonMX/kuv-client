import {
	AfterViewInit,
	Component,
	ElementRef,
	OnDestroy,
	ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
	selector: 'app-test-cube',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './test-cube.html',
	styleUrl: './test-cube.css',
})
export class TestCubePage implements AfterViewInit, OnDestroy {
	@ViewChild('cubeHost', { static: true }) cubeHost!: ElementRef<HTMLDivElement>;

	private renderer?: THREE.WebGLRenderer;
	private scene?: THREE.Scene;
	private camera?: THREE.PerspectiveCamera;
	private controls?: OrbitControls;
	private cubeGroup?: THREE.Group;
	private animationFrameId?: number;
	private panelMeshes: THREE.Mesh[] = [];
	private panelColors: number[] = [];
	private ledMatrices: THREE.InstancedMesh[] = [];
	private ledMaterials: THREE.MeshStandardMaterial[] = [];
	panelsEnabled = false;
	private resizeListener = () => this.handleResize();

	ngAfterViewInit(): void {
		this.initScene();
		this.handleResize();
		window.addEventListener('resize', this.resizeListener);
	}

	ngOnDestroy(): void {
		window.removeEventListener('resize', this.resizeListener);
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
		}
		this.controls?.dispose();
		this.renderer?.dispose();
	}

	private initScene(): void {
		const host = this.cubeHost.nativeElement;

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color('#090d12');
		this.scene.fog = new THREE.Fog('#090d12', 8, 18);

		this.camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.1, 100);
		this.camera.position.set(0, 2.2, 7.5);

		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setClearColor('#090d12');
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

		const ambient = new THREE.AmbientLight(0xffffff, 0.95);
		this.scene.add(ambient);

		const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
		keyLight.position.set(4, 6, 5);
		this.scene.add(keyLight);

		const rimLight = new THREE.DirectionalLight(0x7fb3ff, 0.8);
		rimLight.position.set(-5, 2, -4);
		this.scene.add(rimLight);

		this.cubeGroup = new THREE.Group();
		this.cubeGroup.position.y = 0.4;
		this.scene.add(this.cubeGroup);

		this.addBase();
		this.addFiveFaces();
		this.animate();
	}

	private addBase(): void {
		if (!this.scene) {
			return;
		}

		const baseMaterial = new THREE.MeshStandardMaterial({
			color: 0x2b2f35,
			metalness: 0.36,
			roughness: 0.7,
		});

		const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 3.4), baseMaterial);
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

	private addFiveFaces(): void {
		if (!this.cubeGroup) {
			return;
		}

		const frameMaterial = new THREE.MeshStandardMaterial({
			color: 0x4c4f56,
			metalness: 0.22,
			roughness: 0.72,
		});

		// Layout along each face's local Z (outward normal), relative to the face plane:
		//   frame:  [-frameDepth, 0]  -> outer surface flush with the cube shell
		//   panel:  [0, panelDepth]
		//   LEDs:   just above the panel surface
		const faceOffset = 1.45;
		const faceSize = 2.85;
		const frameDepth = 0.2;
		const panelDepth = 0.04;
		const gridSize = 64;
		const edgePadding = 0.05;
		const ledSpan = faceSize - edgePadding * 2;
		const ledPitch = ledSpan / gridSize;
		const ledSize = ledPitch * 0.7;
		const ledDepth = 0.02;
		const ledGeometry = new THREE.BoxGeometry(ledSize, ledSize, ledDepth);

		const panelConfigs = [
			{ position: new THREE.Vector3(0, 0, faceOffset), rotation: new THREE.Euler(0, 0, 0) },
			{ position: new THREE.Vector3(faceOffset, 0, 0), rotation: new THREE.Euler(0, Math.PI / 2, 0) },
			{ position: new THREE.Vector3(-faceOffset, 0, 0), rotation: new THREE.Euler(0, -Math.PI / 2, 0) },
			{ position: new THREE.Vector3(0, 0, -faceOffset), rotation: new THREE.Euler(0, Math.PI, 0) },
			{ position: new THREE.Vector3(0, faceOffset, 0), rotation: new THREE.Euler(-Math.PI / 2, 0, 0) },
		];

		for (const config of panelConfigs) {
			const faceGroup = new THREE.Group();
			faceGroup.position.copy(config.position);
			faceGroup.rotation.copy(config.rotation);

			const frame = new THREE.Mesh(
				new THREE.BoxGeometry(faceOffset * 2, faceOffset * 2, frameDepth),
				frameMaterial,
			);
			frame.position.z = -frameDepth / 2;
			frame.castShadow = true;
			frame.receiveShadow = true;
			faceGroup.add(frame);

			const panel = new THREE.Mesh(
				new THREE.BoxGeometry(faceSize, faceSize, panelDepth),
				new THREE.MeshStandardMaterial({
					color: 0x2c323b,
					emissive: 0x1f2937,
					emissiveIntensity: 0.4,
					roughness: 0.55,
					metalness: 0.15,
				}),
			);
			panel.position.z = panelDepth / 2 + 0.001;
			panel.castShadow = true;
			panel.receiveShadow = true;
			faceGroup.add(panel);
			this.panelMeshes.push(panel);
			this.panelColors.push(this.randomPastelColor());

			const ledColor = this.randomPastelColor();
			const ledMaterial = new THREE.MeshStandardMaterial({
				color: ledColor,
				emissive: ledColor,
				emissiveIntensity: 1.4,
				roughness: 0.08,
				metalness: 0.02,
			});
			const ledMatrix = new THREE.InstancedMesh(ledGeometry, ledMaterial, gridSize * gridSize);
			const dummy = new THREE.Object3D();
			const ledZ = panelDepth + ledDepth / 2 + 0.002;
			let ledIndex = 0;

			for (let row = 0; row < gridSize; row += 1) {
				for (let col = 0; col < gridSize; col += 1) {
					const x = -ledSpan / 2 + (col + 0.5) * ledPitch;
					const y = -ledSpan / 2 + (row + 0.5) * ledPitch;
					dummy.position.set(x, y, ledZ);
					dummy.rotation.set(0, 0, 0);
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

		this.applyPanelState();
	}

	private randomPastelColor(): number {
		const color = new THREE.Color();
		const hue = 150 + Math.random() * 160;
		color.setHSL(hue / 360, 0.55 + Math.random() * 0.2, 0.72 + Math.random() * 0.08);
		return color.getHex();
	}

	private applyPanelState(): void {
		this.panelMeshes.forEach((panel, index) => {
			const material = panel.material as THREE.MeshStandardMaterial;
			if (this.panelsEnabled) {
				// Dark backing so the lit LEDs read as individual pixels.
				material.color.setHex(0x0b0d10);
				material.emissive.setHex(0x000000);
				material.emissiveIntensity = 0;
				material.opacity = 1;
				material.transparent = false;
			} else {
				material.color.setHex(0x2c323b);
				material.emissive.setHex(0x1f2937);
				material.emissiveIntensity = 0.25;
				material.opacity = 1;
				material.transparent = false;
			}
		});

		this.ledMatrices.forEach((ledMatrix, index) => {
			const material = this.ledMaterials[index];
			ledMatrix.visible = this.panelsEnabled;
			material.color.setHex(this.panelColors[index] ?? 0xf8fafc);
			material.emissive.setHex(this.panelColors[index] ?? 0xf8fafc);
			material.emissiveIntensity = this.panelsEnabled ? 1.4 : 0;
		});
	}

	togglePanels(): void {
		this.panelsEnabled = !this.panelsEnabled;
		this.applyPanelState();
	}

	private animate(): void {
		if (!this.renderer || !this.scene || !this.camera || !this.controls) {
			return;
		}

		const render = () => {
			this.controls!.update();
			this.renderer!.render(this.scene!, this.camera!);
			this.animationFrameId = requestAnimationFrame(render);
		};

		this.animationFrameId = requestAnimationFrame(render);
	}

	private handleResize(): void {
		if (!this.renderer || !this.camera || !this.cubeHost) {
			return;
		}

		const host = this.cubeHost.nativeElement;
		const width = host.clientWidth;
		const height = host.clientHeight;

		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
	}
}
