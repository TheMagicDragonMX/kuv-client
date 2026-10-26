import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CubeComponent, Environment, Face } from '../../cube';
import { BackgroundPanelComponent } from './background-panel.component';
import { BlocksTabComponent } from './blocks-tab.component';
import { ProgramAreaComponent } from './program-area.component';

/**
 * The editor: a cube on one side, and on the other a panel with three tabs: the blocks, the
 * program area (the same program as JSON) and the background. The page only connects them to
 * the cube: whatever the blocks or the program area emit is run by the cube, and the environment
 * the background panel edits is shown by it.
 */
@Component({
	selector: 'app-editor',
	standalone: true,
	imports: [ RouterLink, CubeComponent, ProgramAreaComponent, BackgroundPanelComponent, BlocksTabComponent ],
	templateUrl: './editor.component.html',
})
export class EditorPage {
	/**
	 * The tabs of the side panel.
	 */
	protected readonly tabs = [
		{ id: 'blocks', label: 'Blocks' },
		{ id: 'program', label: 'Program' },
		{ id: 'background', label: 'Background' },
	] as const;

	protected readonly tab = signal<(typeof this.tabs)[number]['id']>('blocks');

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
