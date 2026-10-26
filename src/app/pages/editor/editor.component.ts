import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CubeComponent, Environment, Face } from '../../cube';
import { BackgroundPanelComponent } from './background-panel.component';
import { ProgramAreaComponent } from './program-area.component';

/**
 * The editor: a cube on one side, and on the other a panel with two tabs: the program area and
 * the background. The page only connects them to the cube: whatever the program area emits is
 * run by the cube, and the environment the background panel edits is shown by it.
 */
@Component({
	selector: 'app-editor',
	standalone: true,
	imports: [ RouterLink, CubeComponent, ProgramAreaComponent, BackgroundPanelComponent ],
	templateUrl: './editor.component.html',
})
export class EditorPage {
	/**
	 * The tabs of the side panel.
	 */
	protected readonly tabs = [
		{ id: 'program', label: 'Program' },
		{ id: 'background', label: 'Background' },
	] as const;

	protected readonly tab = signal<(typeof this.tabs)[number]['id']>('program');

	/**
	 * The stage of the cube, edited by the background panel.
	 */
	protected readonly environment = signal<Environment>({});

	/**
	 * Faces the camera can turn to.
	 */
	protected readonly faces = [
		{ value: Face.FRONT, label: 'Front' },
		{ value: Face.RIGHT, label: 'Right' },
		{ value: Face.LEFT, label: 'Left' },
		{ value: Face.BACK, label: 'Back' },
		{ value: Face.TOP, label: 'Top' },
	];
}
