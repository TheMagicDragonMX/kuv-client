import { Routes } from '@angular/router';
import { LoginPage } from './pages/login-page.component';
import { RegisterPage } from './pages/register-page.component';
import { TestCubePage } from './pages/test-cube/test-cube.component';
import { EditorPage } from './pages/editor/editor.component';
import { signedInGuard } from './services/auth.guard';

/**
 * The pages of the app and the path of each one.
 */
export const routes: Routes = [
	{ path: 'login', component: LoginPage },
	{ path: 'register', component: RegisterPage },
	{ path: 'test-cube', component: TestCubePage },
	{ path: 'editor', component: EditorPage },
	{ path: 'inicio', loadComponent: () => import('./pages/home/home.component').then((page) => page.HomePage) },
	{ path: 'perfil', canActivate: [ signedInGuard ], loadComponent: () => import('./pages/profile/profile.component').then((page) => page.ProfilePage) },
	{ path: 'gallery', loadComponent: () => import('./pages/gallery/gallery.component').then((page) => page.GalleryPage) },

	/**
	 * Lazy: it is only needed next to a cube, and keeps the initial bundle under budget.
	 */
	{ path: 'setup', loadComponent: () => import('./pages/setup/setup.component').then((page) => page.SetupPage) },
	{ path: 'cube-chat', loadComponent: () => import('./pages/cube-chat/cube-chat.component').then((page) => page.CubeChatPage) },
	{ path: '', pathMatch: 'full', redirectTo: 'inicio' },
	{ path: '**', redirectTo: 'inicio' },
];
