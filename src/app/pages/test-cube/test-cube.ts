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
	imports: [ RouterLink ],
	template: `
		<main class="cube-demo-page">
			<nav class="corner-nav" aria-label="Navegación principal">
				<a routerLink="/login" class="nav-button">Login</a>
				<a routerLink="/test-cube" class="nav-button active">Cube</a>
			</nav>
			<div class="viewer-block">
				<div #cubeHost class="cube-host" aria-label="Virtual LED cube preview"></div>
				<div class="panel-toggle-wrap">
					<label class="panel-toggle" for="panel-toggle">
						<span class="toggle-label">Panels</span>
						<input id="panel-toggle" type="checkbox" [checked]="panelsEnabled" (change)="togglePanels()" />
						<span class="toggle-slider"></span>
					</label>
				</div>
			</div>
		</main>
	`,
	styles: [
		`
			:host {
				display: block;
				height: 100vh;
				width: 100vw;
				background: radial-gradient(circle at center, #171b22 0%, #0d1016 42%, #07090d 100%);
				color: #f1f5f9;
				font-family: Inter, 'Segoe UI', sans-serif;
			}

			.cube-demo-page {
				display: grid;
				place-items: center;
				height: 100%;
				width: 100%;
				padding: 2rem;
				box-sizing: border-box;
			}

			.viewer-block {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 1rem;
			}

			.cube-host {
				position: relative;
				width: min(72vw, 820px);
				height: min(72vh, 720px);
				min-height: 420px;
				border-radius: 22px;
				background: rgba(17, 20, 27, 0.75);
				box-shadow: 0 28px 70px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(148, 163, 184, 0.14);
				overflow: hidden;
			}
			.cube-host {
				position: relative;
				width: min(72vw, 820px);
				height: min(72vh, 720px);
				min-height: 420px;
				border-radius: 22px;
				border: 2px solid rgba(148, 163, 184, 0.34);
				background: rgba(17, 20, 27, 0.75);
				box-shadow: 0 28px 70px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(148, 163, 184, 0.2), 0 0 30px rgba(96, 165, 250, 0.08);
				overflow: hidden;
			}

			.panel-toggle-wrap {
				display: flex;
				justify-content: center;
				width: 100%;
			}

			.panel-toggle {
				position: relative;
				display: inline-flex;
				align-items: center;
				gap: 0.75rem;
				padding: 0.5rem 0.9rem 0.5rem 0.8rem;
				border-radius: 999px;
				background: rgba(15, 23, 42, 0.9);
				border: 1px solid rgba(148, 163, 184, 0.22);
				box-shadow: 0 10px 25px rgba(15, 23, 42, 0.25);
				cursor: pointer;
				user-select: none;
			}

			.toggle-label {
				font-size: 0.7rem;
				font-weight: 700;
				letter-spacing: 0.08em;
				text-transform: uppercase;
				color: #e2e8f0;
			}

			.panel-toggle input {
				position: absolute;
				opacity: 0;
				pointer-events: none;
			}

			.toggle-slider {
				position: relative;
				width: 2.9rem;
				height: 1.55rem;
				border-radius: 999px;
				background: rgba(71, 85, 105, 0.8);
				transition: 180ms ease;
			}

			.toggle-slider::before {
				content: '';
				position: absolute;
				top: 0.17rem;
				left: 0.2rem;
				width: 1.1rem;
				height: 1.1rem;
				border-radius: 50%;
				background: #f8fafc;
				box-shadow: 0 2px 8px rgba(15, 23, 42, 0.35);
				transition: 180ms ease;
			}

			.panel-toggle input:checked + .toggle-slider {
				background: linear-gradient(135deg, #f9a8d4, #a5b4fc, #86efac);
			}

			.panel-toggle input:checked + .toggle-slider::before {
				transform: translateX(1.28rem);
			}

			.corner-nav {
				position: absolute;
				top: 1rem;
				left: 1rem;
				display: flex;
				gap: 0.5rem;
				padding: 0.4rem;
				border: 1px solid rgba(148, 163, 184, 0.22);
				border-radius: 999px;
				background: rgba(10, 13, 18, 0.82);
				backdrop-filter: blur(6px);
				box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
				z-index: 20;
			}

			.nav-button {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				padding: 0.5rem 0.9rem;
				border-radius: 999px;
				color: #dfeaf6;
				text-decoration: none;
				font-size: 0.76rem;
				font-weight: 600;
				letter-spacing: 0.04em;
				text-transform: uppercase;
				opacity: 0.8;
				transition: 160ms ease;
			}

			.nav-button:hover,
			.nav-button.active {
				opacity: 1;
				background: rgba(148, 163, 184, 0.14);
				box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.12);
			}
		`],
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
