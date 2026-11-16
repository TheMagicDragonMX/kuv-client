import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { TestCubePage } from './pages/test-cube/test-cube.component';
import { EditorPage } from './pages/editor/editor.component';
import { signedInGuard, signedOutGuard } from './services/auth.guard';

/**
 * The pages of the app and the path of each one. Only the login and register pages open without a
 * session; every other page sits under a parent that checks it on each navigation.
 */
export const routes: Routes = [
	{ path: 'login', canActivate: [ signedOutGuard ], component: LoginComponent },
	{ path: 'register', canActivate: [ signedOutGuard ], component: RegisterComponent },
	{
		path: '',
		canActivateChild: [ signedInGuard ],
		children: [
			{ path: 'test-cube', component: TestCubePage },
			{ path: 'editor', component: EditorPage },
			{ path: 'inicio', loadComponent: () => import('./pages/home/home.component').then((page) => page.HomePage) },
			{ path: 'perfil', loadComponent: () => import('./pages/profile/profile.component').then((page) => page.ProfilePage) },
			{ path: 'perfil/:id', loadComponent: () => import('./pages/profile/profile.component').then((page) => page.ProfilePage) },
			{ path: 'gallery', loadComponent: () => import('./pages/gallery/gallery.component').then((page) => page.GalleryPage) },

			/**
			 * Lazy: it is only needed next to a cube, and keeps the initial bundle under budget.
			 */
			{ path: 'setup', loadComponent: () => import('./pages/setup/setup.component').then((page) => page.SetupPage) },
			{ path: 'cube-chat', loadComponent: () => import('./pages/cube-chat/cube-chat.component').then((page) => page.CubeChatPage) },
			{ path: '', pathMatch: 'full', redirectTo: 'inicio' },
		],
	},
	{ path: '**', redirectTo: 'inicio' },
];
