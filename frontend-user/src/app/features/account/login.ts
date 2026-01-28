import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from "../../shared/components/header/header";
import { FooterComponent } from "../../shared/components/footer/footer";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  loginData = {
    email: '',
    password: '',
    rememberMe: false,
  };

  constructor(private router: Router) {}

  onSignIn() {
    console.log('Sign in attempt:', this.loginData);
    // Implement your authentication logic here
  }

  switchToSignUp(event: Event) {
    event.preventDefault();
    this.router.navigate(['/register']);
  }
}
