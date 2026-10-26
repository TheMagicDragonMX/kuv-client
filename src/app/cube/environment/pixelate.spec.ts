import { EngineError } from '../errors';
import { RawImage, pixelate } from './pixelate';

/**
 * A picture where every pixel is made by `color(x, y)`, which returns [r, g, b, a].
 */
function picture (width: number, height: number, color: (x: number, y: number) => number[]): RawImage {
	const data = new Uint8ClampedArray(width * height * 4);

	for (let y = 0; y < height; y += 1)
		for (let x = 0; x < width; x += 1)
			data.set(color(x, y), (y * width + x) * 4);

	return { width, height, data };
}

describe('pixelate', () => {
	it('keeps a picture that already has the size of a face', () => {
		const image = picture(64, 64, (x, y) => [ x * 4, y * 4, 7, 255 ]);

		const pixels = pixelate(image);

		expect(pixels.length).toBe(64 * 64);
		expect(pixels[0]).toBe(0x000007);
		expect(pixels[5 * 64 + 10]).toBe((40 << 16) | (20 << 8) | 7);
	});

	it('averages the area each pixel covers when shrinking', () => {
		// 128x128, left half black and right half white, with the split inside no output pixel.
		const image = picture(128, 128, (x) => 64 > x ? [ 0, 0, 0, 255 ] : [ 255, 255, 255, 255 ]);

		const pixels = pixelate(image);

		expect(pixels[0]).toBe(0x000000);
		expect(pixels[63]).toBe(0xffffff);
	});

	it('mixes the colors under a pixel and does not skip any', () => {
		// 2x2 pixels shrunk to 1x1: the plain average of the four.
		const image = picture(2, 2, (x, y) => [ [ 0, 100, 200, 40 ][y * 2 + x], 0, 0, 255 ]);

		expect(pixelate(image, 1)[0]).toBe(85 << 16);
	});

	it('weights pixels cut by the border of a cell by the part that is inside', () => {
		// 3 pixels shrunk to 2: each output pixel covers 1.5 of them.
		const image = picture(3, 1, (x) => [ [ 0, 90, 180 ][x], 0, 0, 255 ]);

		const [ left, right ] = pixelate(image, 2).slice(0, 2);

		// Left covers 1 of the first pixel and 0.5 of the second: (0 * 1 + 90 * 0.5) / 1.5.
		expect(left).toBe(30 << 16);
		expect(right).toBe(150 << 16);
	});

	it('stretches a small picture to the size of a face', () => {
		const image = picture(2, 2, (x, y) => [ x * 255, y * 255, 0, 255 ]);

		const pixels = pixelate(image);

		expect(pixels[0]).toBe(0x000000);
		expect(pixels[63]).toBe(0xff0000);
		expect(pixels[63 * 64]).toBe(0x00ff00);
		expect(pixels[64 * 64 - 1]).toBe(0xffff00);
	});

	it('turns transparent parts into black', () => {
		const image = picture(64, 64, (x) => 32 > x ? [ 255, 255, 255, 0 ] : [ 255, 255, 255, 255 ]);

		const pixels = pixelate(image);

		expect(pixels[0]).toBe(0x000000);
		expect(pixels[63]).toBe(0xffffff);
	});

	it('rejects a picture whose bytes do not match its size', () => {
		expect(() => pixelate({ width: 4, height: 4, data: new Uint8ClampedArray(10) })).toThrow(EngineError);
		expect(() => pixelate({ width: 0, height: 0, data: new Uint8ClampedArray(0) })).toThrow(EngineError);
	});
});
