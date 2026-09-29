import { Routes } from '@angular/router';
import { LoginPage } from './pages/login-page';
import { RegisterPage } from './pages/register-page';

export const routes: Routes = [
	{ path: 'login', component: LoginPage },
	{ path: 'register', component: RegisterPage },
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: '**', redirectTo: 'login' },
];
