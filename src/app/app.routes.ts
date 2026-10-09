import { Routes } from '@angular/router';
import { LoginPage } from './pages/login-page.component';
import { RegisterPage } from './pages/register-page.component';
import { TestCubePage } from './pages/test-cube/test-cube.component';
import { SimulationPage } from './pages/simulation/simulation.component';

export const routes: Routes = [
	{ path: 'login', component: LoginPage },
	{ path: 'register', component: RegisterPage },
	{ path: 'test-cube', component: TestCubePage },
	{ path: 'simulation', component: SimulationPage },
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: '**', redirectTo: 'login' },
];
