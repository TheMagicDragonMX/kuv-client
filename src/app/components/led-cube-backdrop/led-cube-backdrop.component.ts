import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, afterRenderEffect, inject, input, viewChild } from '@angular/core';
import * as THREE from 'three';
import { Theme, ThemeService } from '../../services/theme.service';
import { LedScene, SCENE_SIZE, dinoScene, levelScene, meadowScene, nightScene, pizzeriaScene, seeded } from './led-scenes';

/**
 * How the cube moves: turning slowly, faster while something loads, or flying the camera into it.
 */
export type CubePace = 'idle' | 'loading' | 'dive';

/**
 * Turns per second, in radians, of each pace.
 */
const SPEED: Record<CubePace, number> = { idle: 0.12, loading: 0.55, dive: 0.9 };

/**
 * How fast the camera reaches the distance it is asked for, in each pace.
 */
const RATE: Record<CubePace, number> = { idle: 2.2, loading: 1.5, dive: 3.2 };

/**
 * Side, in pixels, of the texture of the gaps between LEDs: 8 pixels per LED, so the lines are
 * thin. The scenes themselves are uploaded at one pixel per LED.
 */
const TEXTURE = 512;

/**
 * Pixels of the texture of the gaps per LED.
 */
const LED = TEXTURE / SCENE_SIZE;

/**
 * Milliseconds between two drawings of the faces; the scenes move like pixel art, not smoothly.
 */
const FACE_STEP = 80;

/**
 * Milliseconds between two frames while the cube turns slowly at rest. It turns so little from one
 * frame to the next that 30 frames a second look the same as the 60 to 144 of the screen, for a
 * fraction of the work. While it hurries or glitches it draws every frame.
 */
const IDLE_FRAME = 1000 / 30;

/**
 * Milliseconds the faces stay corrupted after a glitch.
 */
const GLITCH_TIME = 420;

/**
 * Field of view of the camera, in degrees.
 */
const FIELD = 35;

/**
 * Side, in CSS pixels, of the squares the clouds of the sky are made of.
 */
const CLOUD_PIXEL = 8;

/**
 * The colors of the sky in each theme: a navy night in dark, a pale blue in light, with the
 * colors of the back and front clouds.
 */
const SKY: Record<Theme, { top: string; bottom: string; clouds: [ string, string ] }> = {
	dark: { top: '#070b22', bottom: '#0d1840', clouds: [ '#0f2257', '#15306f' ] },
	light: { top: '#e6eff8', bottom: '#d2e3f6', clouds: [ '#c3d9f2', '#afcbec' ] },
};

/**
 * The layers of clouds, from back to front: how high their lowest part reaches (as a part of the
 * window), the seed of their shape, how many bumps they have and how wide those are.
 */
const CLOUDS = [
	{ base: 0.2, seed: 4, hills: 7, size: 0.16 },
	{ base: 0.08, seed: 9, hills: 6, size: 0.12 },
];

/**
 * A face of the cube: its scene, the canvases it is drawn on and the texture that shows them.
 * The bottom face has no scene; it sits on the base.
 */
type Face = {
	/**
	 * The scene, or null on the bottom face.
	 */
	scene: LedScene | null;

	/**
	 * The still layer, drawn once.
	 */
	still: HTMLCanvasElement | null;

	/**
	 * Where each frame is drawn, one pixel per LED, which the texture shows.
	 */
	small: HTMLCanvasElement | null;

	/**
	 * The texture of the face, or null on the bottom face.
	 */
	texture: THREE.CanvasTexture | null;

	/**
	 * The material of the face.
	 */
	material: THREE.MeshBasicMaterial;
};

/**
 * The big LED cube that turns behind the login page, on its rotating base, with a scene on each of
 * its five active faces, over a night sky with pixel clouds. It fills the screen and catches no
 * clicks. The page can make it hurry
 * (`pace`), bring the camera closer (`zoom`, 1 being the resting distance) or make its faces glitch.
 * It stays still for people who ask for less motion.
 */
@Component({
	selector: 'app-led-cube-backdrop',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'pointer-events-none fixed inset-0 block', 'aria-hidden': 'true' },
	template: `
		<canvas #sky class="absolute inset-0 block size-full"></canvas>
		<canvas #canvas class="absolute inset-0 block size-full"></canvas>
	`,
})
export class LedCubeBackdropComponent {
	/**
	 * How the cube moves.
	 */
	readonly pace = input<CubePace>('idle');

	/**
	 * The distance of the camera, as a part of the resting one.
	 */
	readonly zoom = input(1);

	/**
	 * The canvas the cube is drawn on.
	 */
	private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

	/**
	 * The canvas behind the cube, with the sky and its clouds.
	 */
	private readonly sky = viewChild.required<ElementRef<HTMLCanvasElement>>('sky');

	/**
	 * Tells which theme is on, for the colors of the sky.
	 */
	private readonly theme = inject(ThemeService);

	/**
	 * The moment, from `performance.now()`, until which the faces look corrupted.
	 */
	private glitchUntil = 0;

	/**
	 * Builds the scene once the canvas is on the page, frees it when the page goes away, and paints
	 * the sky again when the theme changes or the window is resized.
	 */
	constructor () {
		const destroyRef = inject(DestroyRef);
		const resize = (): void => this.paintSky(this.theme.theme());

		afterRenderEffect(() => this.paintSky(this.theme.theme()));

		afterNextRender(() => {
			const stop = this.start();
			window.addEventListener('resize', resize);
			destroyRef.onDestroy(() => {
				stop();
				window.removeEventListener('resize', resize);
			});
		});
	}

	/**
	 * Corrupts the faces for a moment and shakes the cube, as when a cartridge fails.
	 */
	glitch (): void {
		this.glitchUntil = performance.now() + GLITCH_TIME;
	}

	/**
	 * Builds the renderer, the cube and its base, and starts drawing. Returns what stops it all.
	 */
	private start (): () => void {
		const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
		let renderer: THREE.WebGLRenderer;

		try {
			renderer = new THREE.WebGLRenderer({ canvas: this.canvas().nativeElement, antialias: true, alpha: true });
		}

		catch {
			/**
			 * Without WebGL the page keeps its plain background.
			 */
			return () => undefined;
		}

		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
		renderer.setClearColor(0x000000, 0);

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(FIELD, 1, 0.1, 100);
		const group = new THREE.Group();
		scene.add(group);

		const faces = [ dinoScene(), pizzeriaScene(), levelScene(), null, nightScene(), meadowScene() ].map((art) => this.face(art, renderer));
		const box = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), faces.map((face) => face.material));
		group.add(box);

		/**
		 * The gaps between LEDs never change, so they are not drawn into each frame of the faces:
		 * they are a see-through layer over the box, uploaded once, and the faces only upload their
		 * 64 × 64 LEDs (64 times less than a big texture with the gaps on every update). The layer
		 * is pulled toward the camera so it always wins over the face under it.
		 */
		const gridTexture = this.texture(this.grid(), renderer);
		const gridMaterial = new THREE.MeshBasicMaterial({ map: gridTexture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
		const bareMaterial = new THREE.MeshBasicMaterial({ visible: false });
		const gaps = new THREE.Mesh(box.geometry, faces.map((face) => (face.scene ? gridMaterial : bareMaterial)));
		group.add(gaps);

		const base = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.95, 0.3, 48), new THREE.MeshStandardMaterial({ color: 0x1a2230, metalness: 0.35, roughness: 0.55 }));
		base.position.y = -1.16;
		group.add(base);

		const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x5be3f5 });
		const ring = new THREE.Mesh(new THREE.TorusGeometry(1.79, 0.025, 8, 96), ringMaterial);
		ring.rotation.x = Math.PI / 2;
		ring.position.y = -1.02;
		group.add(ring);

		scene.add(new THREE.AmbientLight(0xffffff, 0.55));
		const sun = new THREE.DirectionalLight(0xffffff, 0.9);
		sun.position.set(3, 5, 4);
		scene.add(sun);

		let distance = 3;
		let zoom = this.zoom();
		let spin = -0.65;
		let time = 2.6;
		let lastFaces = 0;
		let last = performance.now();
		let frame = 0;

		/**
		 * The cube fills the screen: as tall as the window on wide screens, wider than it on
		 * phones, so the form always sits on top of it.
		 */
		const fit = (): void => {
			const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
			const tan = Math.tan((FIELD / 2) * Math.PI / 180);
			renderer.setSize(window.innerWidth, window.innerHeight, false);
			camera.aspect = aspect;
			distance = 1 <= aspect ? 3.05 : Math.max(3.05, 1.8 / (2 * tan * aspect));
			camera.updateProjectionMatrix();
		};

		const step = (now: number): void => {
			const pace = this.pace();
			const glitching = now < this.glitchUntil;
			frame = requestAnimationFrame(step);

			if ('idle' === pace && !glitching && 0 !== lastFaces && now - last < IDLE_FRAME - 1)
				return;

			const passed = Math.min(0.05, (now - last) / 1000);
			last = now;

			if (!calm) {
				time += passed;
				spin += SPEED[pace] * passed;
			}

			const goal = calm ? 1 : this.zoom();
			zoom += (goal - zoom) * Math.min(1, passed * RATE[pace]);

			const away = Math.max(1.55, distance * zoom);
			group.rotation.y = spin;
			group.position.x = glitching ? (Math.random() - 0.5) * 0.12 : 0;
			camera.position.set(0, away * 0.36, away);
			camera.lookAt(0, -0.12, 0);
			ringMaterial.color.setHSL((0.52 + Math.sin(time * 0.4) * 0.08 + 1) % 1, 0.85, 0.66);

			if ((!calm && now - lastFaces > FACE_STEP) || glitching || 0 === lastFaces) {
				lastFaces = now;
				faces.forEach((face) => this.paint(face, time, glitching));
			}

			renderer.render(scene, camera);
		};

		fit();
		window.addEventListener('resize', fit);
		frame = requestAnimationFrame(step);

		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('resize', fit);
			faces.forEach((face) => {
				face.texture?.dispose();
				face.material.dispose();
			});
			box.geometry.dispose();
			gridTexture.dispose();
			gridMaterial.dispose();
			bareMaterial.dispose();
			base.geometry.dispose();
			base.material.dispose();
			ring.geometry.dispose();
			ringMaterial.dispose();
			renderer.dispose();
		};
	}

	/**
	 * Paints the sky behind the cube: a gradient from top to bottom and two layers of pixel clouds
	 * rising from the bottom, in the colors of the theme.
	 */
	private paintSky (theme: Theme): void {
		const canvas = this.sky().nativeElement;
		const context = canvas.getContext('2d');

		if (!context)
			return;

		const look = SKY[theme];
		const width = canvas.width = window.innerWidth;
		const height = canvas.height = window.innerHeight;
		const gradient = context.createLinearGradient(0, 0, 0, height);
		gradient.addColorStop(0, look.top);
		gradient.addColorStop(1, look.bottom);
		context.fillStyle = gradient;
		context.fillRect(0, 0, width, height);

		CLOUDS.forEach((layer, index) => {
			const random = seeded(layer.seed);
			const reach = layer.size * Math.max(width, 600);
			const hills = [ ...Array(layer.hills) ].map(() => ({ x: random() * width, radius: (0.5 + random()) * reach, lift: 0.4 + random() * 0.6 }));
			context.fillStyle = look.clouds[index];

			for (let x = 0; x < width; x += CLOUD_PIXEL) {
				let top = layer.base * height;

				hills.forEach((hill) => {
					const along = (x + CLOUD_PIXEL / 2 - hill.x) / hill.radius;

					if (1 > Math.abs(along))
						top = Math.max(top, layer.base * height + Math.sqrt(1 - along * along) * hill.radius * hill.lift * 0.45);
				});

				const y = height - Math.round(top / CLOUD_PIXEL) * CLOUD_PIXEL;
				context.fillRect(x, y, CLOUD_PIXEL, height - y);
			}
		});
	}

	/**
	 * The dark lines between the LEDs, on a see-through canvas, drawn once and laid over every face. The gap between LEDs
	 * is 2 pixels, split in half on each side of a line; the lines on the edges only show their
	 * inner half, so where two faces meet the halves add up to the same gap and the LEDs next to
	 * the edges keep their full size.
	 */
	private grid (): HTMLCanvasElement {
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = TEXTURE;
		const context = canvas.getContext('2d');

		if (!context)
			return canvas;

		context.fillStyle = 'rgba(6, 8, 12, 0.5)';

		for (let line = 0; SCENE_SIZE >= line; line++) {
			context.fillRect(line * LED - 1, 0, 2, TEXTURE);
			context.fillRect(0, line * LED - 1, TEXTURE, 2);
		}

		return canvas;
	}

	/**
	 * Makes a face for a scene, or the plain bottom face for none.
	 */
	private face (scene: LedScene | null, renderer: THREE.WebGLRenderer): Face {
		if (!scene)
			return { scene, still: null, small: null, texture: null, material: new THREE.MeshBasicMaterial({ color: 0x0a0e13 }) };

		const canvas = (side: number): HTMLCanvasElement => {
			const made = document.createElement('canvas');
			made.width = made.height = side;
			return made;
		};
		const still = canvas(SCENE_SIZE);
		const small = canvas(SCENE_SIZE);
		const context = still.getContext('2d');

		if (context)
			scene.back(context);

		const texture = this.texture(small, renderer);
		return { scene, still, small, texture, material: new THREE.MeshBasicMaterial({ map: texture }) };
	}

	/**
	 * A texture that shows a canvas with sharp pixels, as a screen of LEDs.
	 */
	private texture (canvas: HTMLCanvasElement, renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
		const texture = new THREE.CanvasTexture(canvas);
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.magFilter = THREE.NearestFilter;
		texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
		return texture;
	}

	/**
	 * Draws a face at a moment, one pixel per LED: the still layer, the moving one and the glitch
	 * if any. The gaps between LEDs are the layer over the box.
	 */
	private paint (face: Face, time: number, glitching: boolean): void {
		const small = face.small?.getContext('2d');

		if (!face.scene || !face.still || !face.texture || !small)
			return;

		small.drawImage(face.still, 0, 0);
		face.scene.front(small, time);

		if (glitching)
			this.corrupt(small);

		face.texture.needsUpdate = true;
	}

	/**
	 * Shifts a few rows of LEDs sideways and lights a stray line, like a broken signal.
	 */
	private corrupt (context: CanvasRenderingContext2D): void {
		for (let strip = 0; 7 > strip; strip++) {
			const y = Math.floor(Math.random() * 60);
			const rows = context.getImageData(0, y, SCENE_SIZE, 1 + Math.floor(Math.random() * 4));
			context.putImageData(rows, Math.floor(Math.random() * 14) - 7, y);
		}

		if (0.5 < Math.random()) {
			context.fillStyle = 0.5 < Math.random() ? 'rgba(255, 92, 108, 0.5)' : 'rgba(91, 227, 245, 0.5)';
			context.fillRect(0, Math.floor(Math.random() * SCENE_SIZE), SCENE_SIZE, 1 + Math.floor(Math.random() * 3));
		}
	}
}
