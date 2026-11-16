import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MainLayoutComponent } from './main-layout.component';

describe('MainLayoutComponent', () => {
	it('draws the header once, with the page under it', () => {
		TestBed.configureTestingModule({ providers: [ provideRouter([]), provideHttpClient(), provideHttpClientTesting() ] });

		const fixture = TestBed.createComponent(MainLayoutComponent);
		fixture.detectChanges();

		const element = fixture.nativeElement as HTMLElement;

		expect(element.querySelectorAll('app-site-header header')).toHaveLength(1);
		expect(element.querySelector('app-site-header + router-outlet')).not.toBeNull();
	});
});
