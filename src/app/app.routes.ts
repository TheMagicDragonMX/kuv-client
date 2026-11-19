import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { TestCubePage } from './pages/test-cube/test-cube.component';
import { EditorPage } from './pages/editor/editor.component';
import { VIRTUAL_CUBE } from './components/pixel-glow/pixel-glow.component';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';
import { signedInGuard, signedOutGuard, signupGuard, superAdminGuard } from './services/auth.guard';

/**
 * The pages of the app and the path of each one. Only the login, register and signup pages open without a
 * session; every other page sits under a parent that checks it on each navigation and draws the
 * header around them.
 */
export const routes: Routes = [
	{ path: 'login', canActivate: [ signedOutGuard ], component: LoginComponent },
	{ path: 'register', canActivate: [ signedOutGuard ], component: RegisterComponent },
	{
		path: 'signup',
		canActivate: [ signedOutGuard, signupGuard ],
		loadComponent: () => import('./pages/signup/signup.component').then((page) => page.SignupPage),
	},
	{
		path: 'demo-animacion',
		component: MainLayoutComponent,
		children: [
			{ path: '', loadComponent: () => import('./pages/animation-detail/animation-detail.component').then((page) => page.AnimationDetailPage), data: { [VIRTUAL_CUBE]: true } },
			{ path: ':id', loadComponent: () => import('./pages/animation-detail/animation-detail.component').then((page) => page.AnimationDetailPage), data: { [VIRTUAL_CUBE]: true } },
		],
	},
	{
		path: '',
		canActivateChild: [ signedInGuard ],
		component: MainLayoutComponent,
		children: [
			{ path: 'test-cube', component: TestCubePage, data: { [VIRTUAL_CUBE]: true } },
			{ path: 'editor', component: EditorPage, data: { [VIRTUAL_CUBE]: true } },
			{ path: 'animacion/:id', loadComponent: () => import('./pages/animation-detail/animation-detail.component').then((page) => page.AnimationDetailPage), data: { [VIRTUAL_CUBE]: true } },
			{ path: 'animacion', loadComponent: () => import('./pages/animation-detail/animation-detail.component').then((page) => page.AnimationDetailPage), data: { [VIRTUAL_CUBE]: true } },
			{ path: 'inicio', loadComponent: () => import('./pages/home/home.component').then((page) => page.HomePage) },
			{ path: 'perfil', loadComponent: () => import('./pages/profile/profile.component').then((page) => page.ProfilePage) },
			{ path: 'perfil/:id', loadComponent: () => import('./pages/profile/profile.component').then((page) => page.ProfilePage) },
			{ path: 'gallery', loadComponent: () => import('./pages/gallery/gallery.component').then((page) => page.GalleryPage) },

			/**
			 * Lazy: it is only needed next to a cube, and keeps the initial bundle under budget.
			 */
			{ path: 'setup', loadComponent: () => import('./pages/setup/setup.component').then((page) => page.SetupPage) },

			/**
			 * Only for super admins, who are few: lazy, so nobody else downloads it.
			 */
			{ path: 'admin', canActivate: [ superAdminGuard ], loadComponent: () => import('./pages/admin/admin.component').then((page) => page.AdminPage) },
			{ path: 'cube-chat', loadComponent: () => import('./pages/cube-chat/cube-chat.component').then((page) => page.CubeChatPage) },
			{ path: '', pathMatch: 'full', redirectTo: 'inicio' },
		],
	},
	{ path: '**', redirectTo: 'inicio' },
];
