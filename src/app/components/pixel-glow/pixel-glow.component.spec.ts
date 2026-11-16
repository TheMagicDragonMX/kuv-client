import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { CELL, LEVELS, RADIUS, glowCells } from './pixel-glow';
import { PixelGlowComponent, VIRTUAL_CUBE } from './pixel-glow.component';

/**
 * A page for the routes of the tests.
 */
@Component({ selector: 'app-blank', template: '' })
class BlankPage {
}

describe('the pixel glow', () => {
	it('lights squares on the grid, brightest in the middle and in a few steps', () => {
		const cells = glowCells(200, 200);
		const middle = cells.find((cell) => 200 >= cell.x && 200 < cell.x + CELL && 200 >= cell.y && 200 < cell.y + CELL);

		expect(cells.every((cell) => 0 === cell.x % CELL && 0 === cell.y % CELL)).toBe(true);
		expect(middle).toMatchObject({ strength: 1, inner: true });
		expect(new Set(cells.map((cell) => cell.strength)).size).toBeLessThanOrEqual(LEVELS);
	});

	it('reaches no further than its radius', () => {
		const far = glowCells(500, 500).filter((cell) => Math.hypot(cell.x + CELL / 2 - 500, cell.y + CELL / 2 - 500) >= RADIUS);

		expect(far).toEqual([]);
	});

	it('has the outer color at its edge', () => {
		const edge = glowCells(300, 300).filter((cell) => Math.hypot(cell.x + CELL / 2 - 300, cell.y + CELL / 2 - 300) > RADIUS * 0.8);

		expect(edge.length).toBeGreaterThan(0);
		expect(edge.every((cell) => !cell.inner && cell.strength <= 1 / LEVELS)).toBe(true);
	});
});

describe('PixelGlowComponent', () => {
	/**
	 * Opens a page and says whether the glow is allowed on it.
	 */
	async function allowedOn (path: string): Promise<boolean> {
		TestBed.configureTestingModule({
			providers: [ provideRouter([
				{ path: 'inicio', component: BlankPage },
				{ path: 'editor', component: BlankPage, data: { [VIRTUAL_CUBE]: true } },
			]) ],
		});

		const fixture = TestBed.createComponent(PixelGlowComponent);
		await TestBed.inject(Router).navigateByUrl(path);
		fixture.detectChanges();

		return (fixture.componentInstance as unknown as { allowed(): boolean }).allowed();
	}

	it('glows on pages without the virtual cube', async () => {
		expect(await allowedOn('/inicio')).toBe(true);
	});

	it('stays out of pages that show the virtual cube', async () => {
		expect(await allowedOn('/editor')).toBe(false);
	});

	it('never catches the mouse nor is read out', () => {
		const fixture = TestBed.createComponent(PixelGlowComponent);
		const host = fixture.nativeElement as HTMLElement;

		expect(host.classList).toContain('pointer-events-none');
		expect(host.getAttribute('aria-hidden')).toBe('true');
	});
});
