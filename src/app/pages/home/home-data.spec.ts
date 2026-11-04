import { ART_SIDE, ArtName, COMMUNITY, SECTIONS, artOf, formatLikes } from './home-data';

/**
 * Every picture there is.
 */
const ARTS = [ ...new Set(COMMUNITY.map((animation) => animation.art)) ] as ArtName[];

describe('artOf', () => {
	it('makes a picture of ART_SIDE by ART_SIDE LEDs for every animation', () => {
		for (const art of ARTS)
			expect(artOf(art), art).toHaveLength(ART_SIDE * ART_SIDE);
	});

	it('lights some LEDs and leaves others off in a drawing', () => {
		const heart = artOf('heart');

		expect(heart.filter((dot) => 'pink' === dot).length).toBeGreaterThan(0);
		expect(heart[0]).toBeNull();
		expect(heart[1]).toBe('pink');
	});

	it('makes every picture show something', () => {
		for (const art of ARTS)
			expect(artOf(art).some((dot) => null !== dot), art).toBe(true);
	});

	it('makes the rainbow with every color in order along a diagonal', () => {
		const rainbow = artOf('rainbow');

		expect(rainbow[0]).toBe('red');
		expect(rainbow[1]).toBe('orange');
		expect(rainbow[ART_SIDE]).toBe('orange');
	});
});

describe('formatLikes', () => {
	it('writes small numbers as they are and thousands with a k', () => {
		expect(formatLikes(845)).toBe('845');
		expect(formatLikes(1000)).toBe('1k');
		expect(formatLikes(1200)).toBe('1.2k');
		expect(formatLikes(18000)).toBe('18k');
	});
});

describe('SECTIONS', () => {
	it('has sections with their animations, each in its section once', () => {
		expect(SECTIONS.length).toBeGreaterThan(0);

		for (const section of SECTIONS) {
			const ids = section.animations.map((animation) => animation.id);

			expect(section.animations.length, section.id).toBeGreaterThan(0);
			expect(new Set(ids).size, section.id).toBe(ids.length);
		}
	});
});
