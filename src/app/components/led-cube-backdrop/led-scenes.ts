/**
 * The pixel art shown on the faces of the decorative LED cube of the login page. Each face is a
 * matrix of 64 × 64 LEDs, like the faces of the real cube, and each scene draws on it one LED per
 * canvas pixel: a still layer drawn once, and a moving layer drawn over it on every frame.
 */

/**
 * LEDs on each side of a face.
 */
export const SCENE_SIZE = 64;

/**
 * A scene of one face of the cube.
 */
export type LedScene = {
	/**
	 * Draws what never moves (the sky, the ground, the buildings). It is drawn once.
	 */
	back: (context: CanvasRenderingContext2D) => void;

	/**
	 * Draws what moves, over a copy of the still layer, at a moment in seconds.
	 */
	front: (context: CanvasRenderingContext2D, time: number) => void;
};

/**
 * The palette of a sprite: the color of each letter used in its rows.
 */
export type SpritePalette = Record<string, string>;

/**
 * Thresholds of a 4 × 4 ordered dither, used to blend the bands of the skies without smooth
 * gradients, the way pixel art does.
 */
const BAYER = [ 0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5 ];

/**
 * A generator of numbers between 0 and 1 that always gives the same ones for the same seed, so
 * the stars and flowers land in the same place every time.
 */
export function seeded (seed: number): () => number {
	return () => {
		seed = (seed + 0x6D2B79F5) | 0;
		let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Lights a rectangle of LEDs.
 */
function rect (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string): void {
	context.fillStyle = color;
	context.fillRect(Math.round(x), Math.round(y), width, height);
}

/**
 * Lights one LED.
 */
function dot (context: CanvasRenderingContext2D, x: number, y: number, color: string): void {
	rect(context, x, y, 1, 1, color);
}

/**
 * Fills rows `top` to `bottom` with bands of colors, dithered where they meet.
 */
function sky (context: CanvasRenderingContext2D, colors: string[], top: number, bottom: number): void {
	const steps = colors.length - 1;

	for (let y = top; y < bottom; y++) {
		const place = (y - top) / Math.max(1, bottom - top - 1) * steps;
		const band = Math.min(steps - 1, Math.floor(place));
		const part = place - band;

		for (let x = 0; SCENE_SIZE > x; x++)
			dot(context, x, y, part > (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16 ? colors[band + 1] : colors[band]);
	}
}

/**
 * Lights a filled circle. With `checker`, only every other LED, for soft halos.
 */
function disc (context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, color: string, checker = false): void {
	for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y++)
		for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x++) {
			if (checker && (x + y) % 2)
				continue;

			if ((x + 0.5 - centerX) ** 2 + (y + 0.5 - centerY) ** 2 <= radius * radius)
				dot(context, x, y, color);
		}
}

/**
 * Draws a sprite written as rows of letters, one per LED; a dot leaves the LED as it is.
 */
export function sprite (context: CanvasRenderingContext2D, rows: string[], x: number, y: number, palette: SpritePalette): void {
	rows.forEach((row, line) => {
		for (let column = 0; column < row.length; column++)
			if ('.' !== row[column])
				dot(context, x + column, y + line, palette[row[column]]);
	});
}

/**
 * Draws a pine tree standing on `base`.
 */
function pine (context: CanvasRenderingContext2D, x: number, base: number, height: number, color: string): void {
	for (let row = 0; row < height; row++) {
		const half = Math.floor(row * 0.55);
		rect(context, x - half, base - height + row, half * 2 + 1, 1, color);
	}

	rect(context, x, base, 1, 2, color);
}

/**
 * A starry night with the moon, a little house, smoke and fireflies.
 */
export function nightScene (): LedScene {
	const random = seeded(7);
	const stars: { x: number; y: number; speed: number; phase: number; big: boolean }[] = [];

	while (46 > stars.length) {
		const x = Math.floor(random() * 64);
		const y = Math.floor(random() * 40);

		if (13 < Math.hypot(x - 47.5, y - 13.5))
			stars.push({ x, y, speed: 0.8 + random() * 2.2, phase: random() * 7, big: 0.12 > random() });
	}

	const flies = [ 0, 1, 2, 3, 4, 5 ].map((index) => ({ x: 6 + index * 10 + random() * 4, phase: random() * 6 }));
	const tail = [ '#ffffff', '#fff3c4', '#d9d2a8', '#9aa0c8', '#6a72a8', '#4a5288' ];

	return {
		back: (context) => {
			sky(context, [ '#151a33', '#1b2144', '#242b55', '#2f3665', '#3c4075', '#49497f' ], 0, 50);
			disc(context, 47.5, 13.5, 11, '#2b3469', true);
			disc(context, 47.5, 13.5, 7.5, '#efe6bf');
			disc(context, 45, 11, 1.6, '#d8cd9f');
			disc(context, 50, 15.5, 1.3, '#d8cd9f');
			dot(context, 45, 16, '#d8cd9f');
			dot(context, 49, 10, '#d8cd9f');

			for (let x = 0; 64 > x; x++) {
				const top = Math.round(44 + Math.sin(x * 0.15) * 3 + Math.sin(x * 0.05 + 1) * 2);
				rect(context, x, top, 1, 64 - top, '#262b4e');
			}

			pine(context, 6, 49, 11, '#161932');
			pine(context, 13, 50, 7, '#161932');
			pine(context, 57, 51, 10, '#161932');

			for (let x = 0; 64 > x; x++) {
				const top = Math.round(52 + Math.sin(x * 0.11 + 2) * 2.5);
				rect(context, x, top, 1, 64 - top, '#1a1d37');
			}

			rect(context, 33, 45, 9, 6, '#13152a');
			rect(context, 36, 41, 3, 1, '#13152a');
			rect(context, 35, 42, 5, 1, '#13152a');
			rect(context, 34, 43, 7, 1, '#13152a');
			rect(context, 32, 44, 11, 1, '#13152a');
			rect(context, 39, 40, 2, 3, '#13152a');
			rect(context, 35, 47, 2, 2, '#ffcf70');
			rect(context, 39, 48, 2, 3, '#2a2a48');
		},
		front: (context, time) => {
			stars.forEach((star) => {
				const glow = 0.5 + 0.5 * Math.sin(time * star.speed + star.phase);

				if (star.big && 0.6 < glow) {
					dot(context, star.x - 1, star.y, '#8f97c9');
					dot(context, star.x + 1, star.y, '#8f97c9');
					dot(context, star.x, star.y - 1, '#8f97c9');
					dot(context, star.x, star.y + 1, '#8f97c9');
				}

				dot(context, star.x, star.y, 0.8 < glow ? '#fff8dc' : 0.4 < glow ? '#c3c9ec' : '#5f689c');
			});

			const shot = (time % 8) / 1.1;

			if (1 > shot)
				tail.forEach((color, index) => dot(context, 6 + shot * 30 - index, 3 + shot * 12 - index * 0.4, color));

			for (let puff = 0; 3 > puff; puff++) {
				const rise = (time * 3 + puff * 3) % 9;
				dot(context, 39 + Math.round(Math.sin(time + puff) * (rise / 6)), 39 - rise, 0 === Math.floor(rise) % 2 ? '#4a4f80' : '#3c4072');
			}

			flies.forEach((fly, index) => {
				if (0.2 < Math.sin(time * 2 + fly.phase * 3))
					dot(context, fly.x + Math.sin(time * 0.7 + index) * 3, 55 + Math.sin(time * 1.1 + fly.phase) * 3, '#e8ff8a');
			});
		},
	};
}

/**
 * A cute dino crossing the desert, jumping over cacti, with a pterodactyl passing by.
 */
export function dinoScene (): LedScene {
	const random = seeded(21);
	const pebbles = [ ...Array(20) ].map(() => ({ x: random() * 64, y: 49 + Math.floor(random() * 14) }));
	const dino = [
		'........gGGGGG.',
		'.......gGGGGGGG',
		'.......GGGWEGGG',
		'.......GGGEEGGG',
		'.......GGGGGGPG',
		'g......GGGGGGG.',
		'gG....gGGGG....',
		'gGG..gGGBBGG...',
		'.gGGGGGGBBGGG..',
		'..gGGGGGBBG....',
		'...gGGGGGGG....',
	];
	const legs = [ [ '....GG..GG.....', '....g....gG....' ], [ '....GG..GG.....', '...gG....g.....' ] ];
	const air = [ '....GG..GG.....', '....g....g.....' ];
	const dinoPalette = { G: '#7ccf8a', g: '#4f9e63', B: '#e4f5cf', E: '#1d2a22', W: '#ffffff', P: '#f4a7b9' };
	const cactus = [ '...F...', '...C...', '..CCC..', 'c.CCC.c', 'c.CCC.c', 'cCCCCCc', '..CCC..', '..CCC..', '..CCC..', '..CCC..' ];
	const cactusPalette = { C: '#86bf7d', c: '#6aa565', F: '#ff9fd4' };
	const ptero = [ [ 'v......v.', '.v....v..', '..VVVVVVk', '...VVV...' ], [ '..VVVVVVk', '.v.VVV.v.', 'v.......v', '.........' ] ];
	const pteroPalette = { V: '#b79ad6', v: '#9579bd', k: '#3a2c4f' };

	return {
		back: (context) => {
			sky(context, [ '#a9dbe3', '#c3e4df', '#dde6d4', '#efe1c4', '#f5d9b8' ], 0, 46);
			disc(context, 50, 11, 6, '#ffe7ad');
			disc(context, 50, 11, 4, '#fff3cf');
			rect(context, 2, 38, 18, 8, '#e2b892');
			rect(context, 5, 35, 11, 3, '#e2b892');
			rect(context, 5, 35, 11, 1, '#d4a47c');
			rect(context, 40, 39, 22, 7, '#e7c09a');
			rect(context, 44, 37, 12, 2, '#e7c09a');
			rect(context, 0, 46, 64, 18, '#ecd2a6');
			rect(context, 0, 46, 64, 1, '#c89a6c');
			rect(context, 0, 54, 64, 10, '#e5c798');
		},
		front: (context, time) => {
			for (let cloud = 0; 3 > cloud; cloud++) {
				const x = ((14 + cloud * 30 - time * 3) % 84 + 84) % 84 - 12;
				const y = 6 + cloud * 7;
				rect(context, x + 2, y, 6, 1, '#fffdf6');
				rect(context, x, y + 1, 10, 2, '#fffdf6');
				rect(context, x + 1, y + 3, 8, 1, '#e6eef0');
			}

			pebbles.forEach((pebble) => dot(context, ((pebble.x - time * 16) % 64 + 64) % 64, pebble.y, '#cfa877'));

			let jump = 0;

			[ 40, 95 ].forEach((start) => {
				const x = ((start - time * 16) % 110 + 110) % 110 - 14;
				sprite(context, cactus, x, 37, cactusPalette);

				/**
				 * How far the cactus is from the dino; the dino jumps while it passes under it.
				 */
				const gap = x + 3 - 15;

				if (-10 < gap && 10 > gap)
					jump = Math.max(jump, Math.sin(((10 - gap) / 20) * Math.PI) * 13);
			});

			const blink = 0.15 > time % 3.5;
			const body = dino.map((row) => (blink ? row.replace(/[WE]/g, 'G') : row));
			const feet = 0.5 < jump ? air : legs[Math.floor(time * 8) % 2];
			sprite(context, [ ...body, ...feet ], 7, 34 - Math.round(jump), dinoPalette);
			sprite(context, ptero[Math.floor(time * 5) % 2], 80 - ((time * 11) % 110), 15 + Math.round(Math.sin(time * 2.2) * 2), pteroPalette);
		},
	};
}

/**
 * A midnight pizzeria with a friendly (mostly) animatronic dog that, when the lights go out, only
 * shows its eyes.
 */
export function pizzeriaScene (): LedScene {
	const random = seeded(5);
	const confetti = [ ...Array(26) ].map(() => ({
		x: 11 + Math.floor(random() * 42),
		y: 2 + Math.floor(random() * 26),
		color: [ '#ff9fd4', '#7fe0ee', '#ffe08a', '#a9e9b8' ][Math.floor(random() * 4)],
	}));
	const glyphs: Record<string, string[]> = {
		P: [ '111', '101', '111', '100', '100' ],
		I: [ '111', '010', '010', '010', '111' ],
		Z: [ '111', '001', '010', '100', '111' ],
		A: [ '010', '101', '111', '101', '101' ],
	};
	const word = (context: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void => {
		[ ...text ].forEach((letter, place) => glyphs[letter].forEach((row, line) => {
			for (let column = 0; 3 > column; column++)
				if ('1' === row[column])
					dot(context, x + place * 4 + column, y + line, color);
		}));
	};

	return {
		back: (context) => {
			rect(context, 0, 0, 64, 44, '#2b2340');

			for (let x = 2; 64 > x; x += 6)
				rect(context, x, 0, 2, 36, '#31284a');

			confetti.forEach((bit) => dot(context, bit.x, bit.y, bit.color));
			rect(context, 0, 34, 64, 10, '#3a2c4f');
			rect(context, 0, 34, 64, 1, '#5a4570');

			for (let y = 44; 64 > y; y += 4)
				for (let x = 0; 64 > x; x += 4)
					rect(context, x, y, 4, 4, 0 === ((x + y) / 4) % 2 ? '#cfc6dd' : '#2a2438');

			rect(context, 13, 36, 38, 7, '#5b3f2e');
			rect(context, 13, 36, 38, 1, '#7a5640');
			rect(context, 0, 0, 10, 44, '#7b2f52');
			rect(context, 54, 0, 10, 44, '#7b2f52');

			for (let x = 1; 10 > x; x += 3) {
				rect(context, x, 0, 1, 44, '#5e2340');
				rect(context, 54 + x, 0, 1, 44, '#5e2340');
			}

			for (let x = 0; 64 > x; x += 4) {
				rect(context, x, 0, 4, 3, '#8f3a61');
				rect(context, x + 1, 3, 2, 1, '#8f3a61');
			}

			rect(context, 3, 53, 20, 4, '#efe3f7');

			for (let x = 3; 23 > x; x += 4)
				rect(context, x, 53, 2, 4, '#f4b8d6');

			rect(context, 3, 57, 20, 1, '#b7a6c8');
			rect(context, 5, 57, 2, 6, '#6b5a7e');
			rect(context, 19, 57, 2, 6, '#6b5a7e');
			rect(context, 9, 51, 6, 2, '#f2c46b');
			rect(context, 10, 50, 4, 1, '#f2c46b');
			dot(context, 10, 51, '#e0584f');
			dot(context, 13, 52, '#e0584f');
		},
		front: (context, time) => {
			const cycle = time % 7;
			const dark = (4.6 < cycle && 5.3 > cycle) || (4.3 < cycle && 4.4 > cycle);
			const x = 25 + Math.round(Math.sin(time * 1.6));

			[ { left: 17, color: '#ff9fd4' }, { left: 46, color: '#7fe0ee' } ].forEach((balloon, index) => {
				const top = 9 + Math.round(Math.sin(time * 1.3 + index * 2) * 1.5);
				disc(context, balloon.left, top, 3.2, balloon.color);
				dot(context, balloon.left - 1, top - 2, '#ffffff');
				rect(context, balloon.left, top + 3, 1, 1, balloon.color);

				for (let knot = 0; 10 > knot; knot++)
					dot(context, balloon.left + (0 === Math.floor(knot / 2) % 2 ? 0 : 1), top + 4 + knot, '#9a8fb0');
			});

			rect(context, x + 6, 1, 2, 1, '#ffd27a');
			rect(context, x + 5, 2, 4, 2, '#6fc7d6');
			rect(context, x + 4, 4, 6, 1, '#ffd27a');
			rect(context, x + 3, 5, 8, 2, '#6fc7d6');
			rect(context, x - 2, 9, 3, 8, '#7d5f42');
			rect(context, x + 13, 9, 3, 8, '#7d5f42');
			rect(context, x + 1, 7, 12, 11, '#a8835c');
			rect(context, x, 8, 14, 9, '#a8835c');
			rect(context, x + 2, 10, 3, 2, '#ffffff');
			rect(context, x + 9, 10, 3, 2, '#ffffff');
			dot(context, x + 3, 11, '#1b1424');
			dot(context, x + 10, 11, '#1b1424');
			rect(context, x + 4, 13, 6, 4, '#e3c49c');
			rect(context, x + 6, 13, 2, 1, '#1b1424');
			rect(context, x + 5, 16, 4, 1, '#c79a6d');
			rect(context, x + 1, 18, 12, 16, '#a8835c');
			rect(context, x + 4, 21, 6, 10, '#e3c49c');
			rect(context, x - 2, 19, 3, 9, '#93704d');
			rect(context, x + 13, 19, 3, 7, '#93704d');
			rect(context, x + 15, 16, 2, 3, '#9aa0b5');
			rect(context, x + 2, 34, 4, 2, '#7d5f42');
			rect(context, x + 8, 34, 4, 2, '#7d5f42');

			if (dark) {
				context.fillStyle = 'rgba(6, 4, 12, 0.86)';
				context.fillRect(0, 0, 64, 64);
				dot(context, x + 3, 11, '#ff6b6b');
				dot(context, x + 10, 11, '#ff6b6b');
				dot(context, x + 2, 11, '#5a1c28');
				dot(context, x + 11, 11, '#5a1c28');
			}

			word(context, 'PIZZA', 22, 37, !dark && !(2.1 < cycle && 2.25 > cycle) ? '#ff9fd4' : '#4a2f45');
		},
	};
}

/**
 * A meadow seen from above, like the map of an adventure game: a path, a pond, trees, a chest and
 * a little hero walking.
 */
export function meadowScene (): LedScene {
	const random = seeded(11);
	const lane = (y: number): number => 22 + Math.sin(y * 0.12) * 5;
	const flowers: { x: number; y: number; color: string }[] = [];

	while (14 > flowers.length) {
		const x = Math.floor(random() * 62) + 1;
		const y = Math.floor(random() * 62) + 1;

		if (6 < Math.abs(x - lane(y)) && 13 < Math.hypot((x - 46) / 1.4, y - 40))
			flowers.push({ x, y, color: [ '#ffd27a', '#ff9fd4', '#ffffff' ][flowers.length % 3] });
	}

	const tree = (context: CanvasRenderingContext2D, x: number, y: number): void => {
		rect(context, x - 3, y + 5, 7, 2, '#5ea85c');
		rect(context, x - 1, y + 3, 2, 3, '#7a5236');
		disc(context, x, y, 5, '#3f8f5a');
		disc(context, x - 1, y - 1, 3.2, '#57a66c');
		dot(context, x - 2, y - 2, '#7cc58a');
	};
	const hero = { h: '#5b3a29', s: '#e86a6a', T: '#4d7fd6', k: '#f2c9a0', b: '#3a2a20' };

	return {
		back: (context) => {
			rect(context, 0, 0, 64, 64, '#7cc576');

			for (let tuft = 0; 90 > tuft; tuft++) {
				const x = Math.floor(random() * 64);
				const y = Math.floor(random() * 64);
				dot(context, x, y, '#68b064');
				dot(context, x + 1, y - 1, '#68b064');
			}

			for (let y = 0; 64 > y; y++) {
				const middle = Math.round(lane(y));
				rect(context, middle - 4, y, 9, 1, '#c4a270');
				rect(context, middle - 3, y, 7, 1, '#dcc08f');
			}

			for (let y = 30; 52 > y; y++)
				for (let x = 30; 62 > x; x++) {
					const distance = Math.hypot((x + 0.5 - 46) / 1.45, y + 0.5 - 40);

					if (8 > distance)
						dot(context, x, y, 7 > distance ? '#6fb8d4' : '#4e93b3');
				}

			disc(context, 41, 38, 1.6, '#5fae6b');
			dot(context, 41, 37, '#ff9fd4');
			tree(context, 8, 8);
			tree(context, 55, 9);
			tree(context, 7, 50);
			tree(context, 57, 57);
			rect(context, 36, 9, 7, 5, '#c98a3c');
			rect(context, 36, 9, 7, 2, '#a86d2a');
			rect(context, 39, 11, 1, 2, '#ffd27a');
			disc(context, 47, 24, 2.2, '#a9b3b8');
			dot(context, 46, 23, '#cdd5d9');
			disc(context, 13, 30, 2.5, '#4f9a59');
			disc(context, 30, 56, 2.5, '#4f9a59');
		},
		front: (context, time) => {
			for (let sparkle = 0; 6 > sparkle; sparkle++) {
				const angle = time * 0.8 + sparkle * 1.7;
				dot(context, 46 + Math.round(Math.cos(angle) * (3 + sparkle % 3) * 1.4), 40 + Math.round(Math.sin(angle * 1.3) * (2 + sparkle % 2)), '#cdeef5');
			}

			flowers.forEach((flower, index) => {
				dot(context, flower.x + (0 < Math.sin(time * 2 + index) ? 1 : 0), flower.y, flower.color);
				dot(context, flower.x, flower.y + 1, '#4f9e63');
			});

			const y = 70 - (time * 7) % 80;
			const step = Math.floor(time * 6) % 2;
			sprite(context, [ '.hhh.', 'hhhhh', '.hhh.', 'sssss', 'kTTTk', '.TTT.', step ? '.b...' : '...b.' ], Math.round(lane(y)) - 2, Math.round(y), hero);

			for (let wing = 0; 2 > wing; wing++) {
				const x = 28 + Math.sin(time * 0.6 + wing * 3) * 18;
				const top = 20 + Math.cos(time * 0.9 + wing * 2) * 10 + wing * 18;
				const color = wing ? '#ffd27a' : '#c9a8ff';

				if (0 === Math.floor(time * 8 + wing) % 2) {
					dot(context, x - 1, top, color);
					dot(context, x + 1, top, color);
				}

				dot(context, x, top, '#3a2c4f');
			}
		},
	};
}

/**
 * A platform level with spinning coins, a block and the Kü-V mascot hopping along. It goes on the
 * top face.
 */
export function levelScene (): LedScene {
	const random = seeded(3);
	const coins = [ [ 12, 22 ], [ 18, 22 ], [ 51, 14 ] ];
	const bot = [ '...y...', '...a...', '.CCCCC.', '.CYCYC.', '.CCCCC.', '.cCCCc.' ];
	const botPalette = { y: '#ff7ac6', a: '#9fb0c4', C: '#5be3f5', c: '#2fa8bd', Y: '#ffd84d' };
	const cloud = (context: CanvasRenderingContext2D, x: number, y: number): void => {
		rect(context, x + 3, y, 6, 1, '#ffffff');
		rect(context, x + 1, y + 1, 11, 3, '#ffffff');
		rect(context, x, y + 2, 13, 2, '#ffffff');
		rect(context, x + 1, y + 4, 11, 1, '#d5eef7');
	};

	return {
		back: (context) => {
			sky(context, [ '#86cdee', '#9fd7f0', '#b7e1f2', '#cfeaf3' ], 0, 52);
			disc(context, 12, 58, 15, '#5fae7c');
			disc(context, 12, 58, 14, '#86d3a0');
			disc(context, 48, 60, 13, '#5fae7c');
			disc(context, 48, 60, 12, '#93dbab');
			rect(context, 0, 52, 64, 3, '#6cc070');
			rect(context, 0, 52, 64, 1, '#a0e294');
			rect(context, 0, 55, 64, 9, '#c98d5a');

			for (let spot = 0; 24 > spot; spot++)
				rect(context, Math.floor(random() * 63), 56 + Math.floor(random() * 7), 2, 1, '#ad7043');

			rect(context, 8, 30, 16, 4, '#e39a5c');

			for (let x = 8; 24 > x; x += 4)
				rect(context, x, 30, 1, 4, '#b56f3a');

			rect(context, 8, 32, 16, 1, '#b56f3a');
			disc(context, 30, 52, 3, '#5fb36a');
			disc(context, 34, 52, 2.5, '#5fb36a');
		},
		front: (context, time) => {
			cloud(context, ((6 - time * 2) % 80 + 80) % 80 - 14, 4);
			cloud(context, ((46 - time * 2) % 80 + 80) % 80 - 14, 13);

			const bob = 0 === Math.floor(time * 2) % 2 ? 0 : -1;
			rect(context, 40, 22 + bob, 7, 7, '#c99a1a');
			rect(context, 41, 23 + bob, 5, 5, '#ffd84d');
			rect(context, 43, 24 + bob, 1, 2, '#7a5a00');
			dot(context, 43, 27 + bob, '#7a5a00');

			coins.forEach(([ x, y ], index) => {
				const width = [ 4, 2, 1, 2 ][Math.floor(time * 6 + index) % 4];
				rect(context, x - Math.floor(width / 2), y, width, 6, '#c99a1a');

				if (2 < width)
					rect(context, x - 1, y + 1, 2, 4, '#ffe37a');
			});

			const run = (time * 9) % 70;
			const hop = Math.abs(Math.sin(time * 3.2)) * 9;
			const walking = 0 === Math.floor(time * 8) % 2 ? '.d...d.' : '..d.d..';
			sprite(context, bot, Math.round(run - 6), Math.round(46 - hop), botPalette);
			sprite(context, [ 0.5 < hop ? '..d.d..' : walking ], Math.round(run - 6), Math.round(52 - hop), { d: '#2b3442' });
		},
	};
}
