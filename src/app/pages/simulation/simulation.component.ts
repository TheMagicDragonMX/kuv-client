import {
	AfterViewInit,
	Component,
	ElementRef,
	OnDestroy,
	ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
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

	ngAfterViewInit (): void {
		this.cube = new VirtualCube(this.cubeHost.nativeElement);
	}

	ngOnDestroy (): void {
		this.cube?.dispose();
	}

	togglePanels (): void {
		this.cube?.setPanelsEnabled(!this.cube.isPanelsEnabled);
	}
}
