import {
	AfterViewInit,
	Component,
	ElementRef,
	OnDestroy,
	ViewChild,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
	selector: 'app-test-cube',
	standalone: true,
	template: `
		<main class="cube-demo-page">
			<div #cubeHost class="cube-host" aria-label="Virtual LED cube preview"></div>
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

		const base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.35, 0.55, 48), baseMaterial);
		base.position.y = -1.28;
		base.castShadow = true;
		base.receiveShadow = true;
		this.scene.add(base);

		const centerStem = new THREE.Mesh(
			new THREE.CylinderGeometry(0.36, 0.42, 0.75, 32),
			new THREE.MeshStandardMaterial({ color: 0x3d4249, metalness: 0.45, roughness: 0.55 }),
		);
		centerStem.position.y = -0.72;
		centerStem.castShadow = true;
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

		const faceSize = 2.85;
		const faceThickness = 0.13;
		const ledTexture = this.createLedTexture();

		const panelConfigs = [
			{ position: [0, 0, 1.45], rotation: [0, 0, 0] },
			{ position: [1.45, 0, 0], rotation: [0, Math.PI / 2, 0] },
			{ position: [-1.45, 0, 0], rotation: [0, -Math.PI / 2, 0] },
			{ position: [0, 1.45, 0], rotation: [-Math.PI / 2, 0, 0] },
			{ position: [0, -1.45, 0], rotation: [Math.PI / 2, 0, 0] },
		];

		for (const config of panelConfigs) {
			const frame = new THREE.Mesh(
				new THREE.BoxGeometry(faceSize + 0.16, faceSize + 0.16, faceThickness + 0.08),
				frameMaterial,
			);
			frame.position.set(config.position[0], config.position[1], config.position[2]);
			frame.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);
			frame.castShadow = true;
			frame.receiveShadow = true;
			this.cubeGroup.add(frame);

			const face = new THREE.Mesh(
				new THREE.PlaneGeometry(faceSize * 0.9, faceSize * 0.9),
				new THREE.MeshStandardMaterial({
					map: ledTexture,
					roughness: 0.45,
					metalness: 0.15,
					emissive: 0x9ca3af,
					emissiveIntensity: 0.18,
				}),
			);
			face.position.set(config.position[0], config.position[1], config.position[2] + 0.02);
			face.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);
			this.cubeGroup.add(face);
		}
	}

	private createLedTexture(): THREE.CanvasTexture {
		const canvas = document.createElement('canvas');
		canvas.width = 64;
		canvas.height = 64;
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			return new THREE.CanvasTexture(canvas);
		}

		ctx.fillStyle = '#1b1f27';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		const cellSize = 5;
		const gap = 1;
		const offsetX = 4;
		const offsetY = 4;

		for (let y = 0; y < 64; y += 1) {
			for (let x = 0; x < 64; x += 1) {
				const px = x * (cellSize + gap) + offsetX;
				const py = y * (cellSize + gap) + offsetY;
				const shouldGlow = ((x + y) % 9 === 0) || ((x * 3 + y) % 13 === 0) || ((x % 9 === 0) && (y % 7 === 0));
				if (!shouldGlow) {
					ctx.fillStyle = '#11161d';
					ctx.fillRect(px, py, cellSize, cellSize);
					continue;
				}

				const glow = 180 + ((x + y) % 7) * 12;
				ctx.fillStyle = `rgb(${glow}, ${glow}, ${glow})`;
				ctx.fillRect(px, py, cellSize, cellSize);
			}
		}

		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		return texture;
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
