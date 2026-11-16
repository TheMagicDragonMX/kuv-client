import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PixelGlowComponent } from './components/pixel-glow/pixel-glow.component';
import { SnackbarComponent } from './components/snackbar/snackbar.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';

/**
 * The root component: the router outlet, and what floats over every page (the theme button, the
 * pixel glow that follows the mouse and the snackbar).
 */
@Component({
	selector: 'app-root',
	standalone: true,
	imports: [ RouterOutlet, PixelGlowComponent, SnackbarComponent, ThemeToggleComponent ],
	templateUrl: './app.component.html',
})
export class App {
}
