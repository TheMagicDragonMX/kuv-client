import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CreateCommand, CubeComponent, Environment, Face } from '../../cube';
import { BackgroundPanelComponent } from './background-panel.component';
import { BlocksTabComponent } from './blocks-tab.component';
import { ObjectsPanelComponent } from './objects-panel.component';
import { ProgramAreaComponent } from './program-area.component';

/**
 * The editor: a cube on one side, and on the other a panel with four tabs: the blocks, the
 * objects they move, the background and the program (the JSON the blocks are turned into, read
 * only). The page only
 * connects them to the cube: the program the blocks emit is run by the cube, and the environment
 * the background panel edits is shown by it.
 */
@Component({
	selector: 'app-editor',
	standalone: true,
	imports: [ RouterLink, CubeComponent, ProgramAreaComponent, BackgroundPanelComponent, BlocksTabComponent, ObjectsPanelComponent ],
	templateUrl: './editor.component.html',
})
export class EditorPage {
	/**
	 * The tabs of the side panel.
	 */
	protected readonly tabs = [
		{ id: 'blocks', label: 'Blocks' },
		{ id: 'objects', label: 'Objects' },
		{ id: 'background', label: 'Background' },
		{ id: 'program', label: 'Program' },
	] as const;

	protected readonly tab = signal<(typeof this.tabs)[number]['id']>('blocks');

	/**
	 * The objects of the program, made in the Objects tab and moved by the blocks.
	 */
	protected readonly objects = signal<CreateCommand[]>([]);

	/**
	 * Names of the objects the user has hidden to see what is behind them. Only a view setting:
	 * it is not part of the program.
	 */
	protected readonly hiddenObjects = signal<string[]>([]);

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
