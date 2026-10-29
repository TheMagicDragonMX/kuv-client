import { Routes } from '@angular/router';
import { LoginPage } from './pages/login-page.component';
import { RegisterPage } from './pages/register-page.component';
import { TestCubePage } from './pages/test-cube/test-cube.component';
import { EditorPage } from './pages/editor/editor.component';

export const routes: Routes = [
	{ path: 'login', component: LoginPage },
	{ path: 'register', component: RegisterPage },
	{ path: 'test-cube', component: TestCubePage },
	{ path: 'editor', component: EditorPage },
	// Lazy: it is only needed next to a cube, and keeps the initial bundle under budget.
	{ path: 'setup', loadComponent: () => import('./pages/setup/setup.component').then((page) => page.SetupPage) },
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: '**', redirectTo: 'login' },
];
