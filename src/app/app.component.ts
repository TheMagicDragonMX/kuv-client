import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeToggleComponent } from './components/theme-toggle.component';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [ RouterOutlet, ThemeToggleComponent ],
	templateUrl: './app.component.html',
})
export class App {
}
