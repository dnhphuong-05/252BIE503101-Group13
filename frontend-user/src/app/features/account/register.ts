import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header';
import { FooterComponent } from '../../shared/components/footer/footer';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent {
  registerData = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  constructor(private router: Router) {}

  onSignUp() {
    if (this.registerData.password !== this.registerData.confirmPassword) {
      alert('Mật khẩu không khớp!');
      return;
    }
    console.log('Sign up attempt:', this.registerData);
    // Implement your registration logic here
  }

  switchToSignIn(event: Event) {
    event.preventDefault();
    this.router.navigate(['/login']);
  }
}
