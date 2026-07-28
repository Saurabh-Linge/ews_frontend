import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { AuthService } from '../../core/services/auth/auth.service';
import { EwsStateService, EwsRole } from '../ews/services/ews-state.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, PasswordModule, Toast],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);
  private ewsState = inject(EwsStateService);

  username = '';
  password = '';
  loading = signal(false);
  selectedLanguage = 'en';

  demoUsers = [
    { label: 'CRO', icon: 'pi pi-shield', username: 'cro', password: 'password123' },
    { label: 'RO', icon: 'pi pi-user', username: 'ro', password: 'password123' },
    { label: 'Branch', icon: 'pi pi-building', username: 'branch', password: 'password123' }
  ];

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.ctrlKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.quickLogin('admin', 'password123');
    }
  }

  quickLogin(username: string, password: string = 'password123') {
    this.username = username;
    this.password = password;
    this.login();
  }

  onLanguageChange(lang: string) {
    this.selectedLanguage = lang;
    if (lang === 'mr') {
      document.body.classList.add('lang-mr');
    } else {
      document.body.classList.remove('lang-mr');
    }
  }

  login() {
    if (!this.username || !this.password) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please enter employee code and password' });
      return;
    }
    
    if (this.loading()) return;
    this.loading.set(true);

    this.authService
      .login({ username: this.username, password: this.password })
      .subscribe({
        next: (res: any) => {
          this.loading.set(false);
          const roleFromBackend = res.user.role; // e.g. 'cro', 'admin'
          this.ewsState.setRole(roleFromBackend as EwsRole, res.user);

          const returnUrl = this.route.snapshot.queryParams['returnUrl'];
          if (returnUrl) {
            this.router.navigate([returnUrl]);
          } else {
            this.router.navigate(['/ews/dashboard']);
          }
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid employee code or password' });
        },
      });
  }
}
