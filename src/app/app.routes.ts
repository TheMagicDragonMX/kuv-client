import { Routes } from '@angular/router';
import { RegisterComponent } from './pages/register/register.component';
import { VIRTUAL_CUBE } from './components/pixel-glow/pixel-glow.component';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';
import { signedInGuard, signedOutGuard, signupGuard } from './services/auth.guard';

/**
 * The pages of the app and the path of each one. Only the login, register and signup pages open without a
 * session; every other page sits under a parent that checks it on each navigation and draws the
 * header around them.
 */
export const routes: Routes = [

	/**
	 * Lazy: the cube, the mascot and the sounds of the login page keep the initial bundle under budget.
	 */
	{ path: 'login', canActivate: [ signedOutGuard ], loadComponent: () => import('./pages/login/login.component').then((page) => page.LoginComponent) },
	{ path: 'register', canActivate: [ signedOutGuard ], component: RegisterComponent },
	{
		path: 'signup',
		canActivate: [ signedOutGuard, signupGuard ],
		loadComponent: () => import('./pages/signup/signup.component').then((page) => page.SignupPage),
	},
	{
		path: '',
		canActivateChild: [ signedInGuard ],
		component: MainLayoutComponent,
		children: [
			{ path: 'test-cube', loadComponent: () => import('./pages/test-cube/test-cube.component').then((page) => page.TestCubePage), data: { [VIRTUAL_CUBE]: true } },
			{ path: 'editor', loadComponent: () => import('./pages/editor/editor.component').then((page) => page.EditorPage), data: { [VIRTUAL_CUBE]: true } },
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
