import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SnackbarComponent } from './components/snackbar.component';
import { ThemeToggleComponent } from './components/theme-toggle.component';

/**
 * The root component, which only hosts the router outlet.
 */
@Component({
	selector: 'app-root',
	standalone: true,
	imports: [ RouterOutlet, SnackbarComponent, ThemeToggleComponent ],
	templateUrl: './app.component.html',
})
export class App {
}
