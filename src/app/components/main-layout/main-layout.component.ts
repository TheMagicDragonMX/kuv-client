import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteHeaderComponent } from '../site-header/site-header.component';

/**
 * The frame of every page of a signed-in user: the header (with the bottom bar of phones) once,
 * and the page under it. The pages bring no navigation of their own.
 */
@Component({
	selector: 'app-main-layout',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ RouterOutlet, SiteHeaderComponent ],
	templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
}
