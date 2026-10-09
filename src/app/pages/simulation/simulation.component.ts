import {
	AfterViewInit,
	Component,
	ElementRef,
	OnDestroy,
	ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CubeState, Face } from '../../cube/cube-state';
import { Command, executeProgram } from '../../cube/command';
import { VirtualCube } from '../../cube/virtual-cube';

@Component({
	selector: 'app-simulation',
	standalone: true,
	imports: [ RouterLink ],
	templateUrl: './simulation.component.html',
})
export class SimulationPage implements AfterViewInit, OnDestroy {
	@ViewChild('cubeHost', { static: true }) cubeHost!: ElementRef<HTMLDivElement>;

	cube?: VirtualCube;

	private state = new CubeState();

	ngAfterViewInit (): void {
		this.cube = new VirtualCube(this.cubeHost.nativeElement, this.state);
		executeProgram(this.state, this.demoProgram());
	}

	ngOnDestroy (): void {
		this.cube?.dispose();
	}

	togglePanels (): void {
		this.cube?.setPanelsEnabled(!this.cube.isPanelsEnabled);
	}

	/**
	 * Placeholder program that exercises the drawing commands on every face.
	 */
	private demoProgram (): Command[] {
		const faces = [ Face.FRONT, Face.RIGHT, Face.LEFT, Face.BACK, Face.TOP ];
		const colors = [ 0xff4d6d, 0xffd166, 0x06d6a0, 0x4cc9f0, 0xc77dff ];

		return faces.flatMap((face, index): Command[] => [
			{ op: 'drawRect', face, x: 0, y: 0, width: 64, height: 64, color: colors[index] },
			{ op: 'drawLine', face, x0: 0, y0: 0, x1: 63, y1: 63, color: colors[index] },
			{ op: 'fillCircle', face, cx: 32, cy: 32, radius: 10, color: colors[index] },
		]);
	}
}
