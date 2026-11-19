import { ART_NAMES, ART_SIDE, EMPTY_SECTIONS, artFor, artOf, formatDate, formatLikes } from './home-data';

/**
 * Every picture there is.
 */
const ARTS = ART_NAMES;

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

describe('formatDate', () => {
	it('writes the day as it was given, whatever the time zone', () => {
		expect(formatDate('2026-01-01')).toMatch(/^1 ene\.? 2026$/);
		expect(formatDate('2026-10-28')).toMatch(/^28 oct\.? 2026$/);
	});
});

describe('artFor', () => {
	it('gives the same picture to the same id, and a picture that exists to any id', () => {
		expect(artFor(7)).toBe(artFor(7));

		for (const id of [ 1, 12, 13, 1000 ])
			expect(ART_NAMES).toContain(artFor(id));
	});
});

describe('EMPTY_SECTIONS', () => {
	it('has sections with no animations, each with its own id', () => {
		const ids = EMPTY_SECTIONS.map((section) => section.id);

		expect(ids.length).toBeGreaterThan(0);
		expect(new Set(ids).size).toBe(ids.length);

		for (const section of EMPTY_SECTIONS)
			expect(section.animations, section.id).toEqual([]);
	});
});
