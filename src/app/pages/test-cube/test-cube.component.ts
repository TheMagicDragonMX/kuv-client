import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CubeComponent, EXAMPLE_PROGRAMS } from '../../cube';

/**
 * The simplest use of the cube: put `<app-cube>` in the template, give it a program.
 * The buttons only swap which program it is given.
 */
@Component({
	selector: 'app-test-cube',
	standalone: true,
	imports: [ RouterLink, CubeComponent ],
	templateUrl: './test-cube.component.html',
})
export class TestCubePage {
	/**
	 * The programs the user can pick from.
	 */
	protected readonly examples = EXAMPLE_PROGRAMS;

	/**
	 * The program currently shown on the cube.
	 */
	protected readonly selected = signal(EXAMPLE_PROGRAMS[0]);
}
