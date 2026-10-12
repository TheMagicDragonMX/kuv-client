import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CubeComponent, Face } from '../../cube';
import { ProgramAreaComponent } from './program-area.component';

/**
 * The editor: a cube on one side, the program area on the other. The page only connects the
 * two: whatever the program area emits is run by the cube.
 */
@Component({
	selector: 'app-editor',
	standalone: true,
	imports: [ RouterLink, CubeComponent, ProgramAreaComponent ],
	templateUrl: './editor.component.html',
})
export class EditorPage {
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
