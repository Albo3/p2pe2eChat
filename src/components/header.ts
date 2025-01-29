import { html } from "npm:hono/html";

export function Header() {
  return html`
    <header class="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 border-b border-white/10 shadow-lg backdrop-blur-sm">
      <div class="container mx-auto px-4">
        <div class="flex h-16 items-center justify-between">
          <!-- Left section -->
          <div class="flex items-center space-x-6">
            <a class="flex items-center space-x-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 hover:bg-black/60 transition-colors" href="/">
              <svg class="h-5 w-5 text-emerald-400/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span class="hidden font-mono text-emerald-400/90 sm:inline-block">P2P Chat</span>
            </a>
            <nav class="flex items-center space-x-4">
              <a href="/chat" id="chatLink" class="rounded-md border border-white/10 px-3 py-1.5 transition-colors hover:bg-white/5 text-white/70 hover:text-white/90">Chat</a>
            </nav>
          </div>

          <!-- Right section - Auth -->
          <div class="relative" id="authContainer">
            <!-- Login Button -->
            <button id="authBtn" class="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors">
              Login
            </button>

            <!-- Auth Dropdown -->
            <div id="authDropdown" class="hidden absolute right-0 mt-2 w-80 rounded-lg border border-white/10 bg-gray-900 shadow-lg">
              <div class="p-4">
                <!-- Login Form -->
                <form id="loginForm" class="space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="text-lg font-mono text-emerald-400/90">Login</div>
                    <div class="flex gap-2">
                      <button type="button" id="githubLogin"
                              class="flex items-center justify-center w-8 h-8 rounded-md border border-white/10 bg-black/40 hover:bg-black/60 transition-colors">
                        <svg class="h-5 w-5 text-white/70" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clip-rule="evenodd"/>
                        </svg>
                      </button>
                      <button type="button" id="googleLogin"
                              class="flex items-center justify-center w-8 h-8 rounded-md border border-white/10 bg-black/40 hover:bg-black/60 transition-colors">
                        <svg class="h-5 w-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div id="loginError" class="hidden text-sm text-red-400 mb-2"></div>
                  <input type="text" name="username" placeholder="Username" required
                         class="w-full rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/30">
                  <input type="password" name="password" placeholder="Password" required
                         class="w-full rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/30">
                  <button type="submit" 
                          class="w-full rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                    Sign In
                  </button>
                </form>

                <div class="border-t border-white/10 my-4"></div>

                <!-- Register Form -->
                <form id="registerForm" class="space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="text-lg font-mono text-emerald-400/90">Register</div>
                    <div class="flex gap-2">
                      <button type="button" id="githubRegister"
                              class="flex items-center justify-center w-8 h-8 rounded-md border border-white/10 bg-black/40 hover:bg-black/60 transition-colors">
                        <svg class="h-5 w-5 text-white/70" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clip-rule="evenodd"/>
                        </svg>
                      </button>
                      <button type="button" id="googleRegister"
                              class="flex items-center justify-center w-8 h-8 rounded-md border border-white/10 bg-black/40 hover:bg-black/60 transition-colors">
                        <svg class="h-5 w-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div id="registerError" class="hidden text-sm text-red-400 mb-2"></div>
                  <input type="text" name="username" placeholder="Username" required
                         class="w-full rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/30">
                  <input type="email" name="email" placeholder="Email" required
                         class="w-full rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/30">
                  <input type="password" name="password" placeholder="Password" required
                         class="w-full rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/30">
                  <button type="submit"
                          class="w-full rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                    Create Account
                  </button>
                </form>
              </div>
            </div>

            <!-- User Menu -->
            <div id="userMenu" class="hidden">
              <button id="userMenuBtn" class="flex items-center space-x-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
                <span class="text-sm text-emerald-400/90" id="username"></span>
                <svg class="h-4 w-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              <!-- User Dropdown -->
              <div id="userDropdown" class="hidden absolute right-0 mt-2 w-[360px]">
                <div class="relative">
                  <div class="absolute -inset-4 pointer-events-none" aria-hidden="true"></div>
                  <div class="relative rounded-lg border border-white/10 bg-gray-900 shadow-lg">
                    <div class="p-4">
                      <!-- Profile Section -->
                      <div class="mb-4">
                        <h3 class="text-lg font-mono text-emerald-400/90 mb-3">Profile</h3>
                        <div class="space-y-2">
                          <div class="flex justify-between items-center text-sm">
                            <span class="text-white/70">Username:</span>
                            <span class="text-white/90" id="profileUsername"></span>
                          </div>
                          <div class="flex justify-between items-center text-sm">
                            <span class="text-white/70">Email:</span>
                            <span class="text-white/90" id="profileEmail"></span>
                          </div>
                          <div class="flex justify-between items-center text-sm">
                            <span class="text-white/70">Member since:</span>
                            <span class="text-white/90" id="profileCreatedAt"></span>
                          </div>
                        </div>
                      </div>

                      <div class="border-t border-white/10 my-4"></div>

                      <!-- Settings Section -->
                      <div class="space-y-3">
                        <h3 class="text-lg font-mono text-emerald-400/90 mb-3">Settings</h3>
                        
                        <!-- Collapsible Password Change Section -->
                        <div class="space-y-2">
                          <button type="button" id="togglePasswordForm"
                                  class="flex w-full items-center justify-between rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5">
                            <span>Change Password</span>
                            <svg id="passwordArrow" class="h-4 w-4 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                            </svg>
                          </button>
                          
                          <form id="changePasswordForm" class="hidden space-y-3 pt-2">
                            <div id="passwordError" class="hidden text-sm text-red-400 mb-2"></div>
                            <input type="password" name="currentPassword" placeholder="Current Password" required
                                   class="w-full rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/30">
                            <input type="password" name="newPassword" placeholder="New Password" required
                                   class="w-full rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/30">
                            <input type="password" name="confirmPassword" placeholder="Confirm New Password" required
                                   class="w-full rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/30">
                            <button type="submit"
                                    class="w-full rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                              Update Password
                            </button>
                          </form>
                        </div>
                      </div>

                      <div class="border-t border-white/10 my-4"></div>

                      <!-- Logout Button -->
                      <button id="logoutBtn" class="w-full rounded-md border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors">
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Spacer to prevent content from hiding under fixed header -->
    <div class="h-16"></div>

    <style>
      .glass-dark {
        background: linear-gradient(180deg, rgba(17, 24, 39, 0.7) 0%, rgba(17, 24, 39, 0.6) 100%);
        backdrop-filter: blur(8px);
      }
    </style>

    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const elements = {
          authBtn: document.getElementById('authBtn'),
          authDropdown: document.getElementById('authDropdown'),
          userMenu: document.getElementById('userMenu'),
          userMenuBtn: document.getElementById('userMenuBtn'),
          userDropdown: document.getElementById('userDropdown'),
          loginForm: document.getElementById('loginForm'),
          registerForm: document.getElementById('registerForm'),
          logoutBtn: document.getElementById('logoutBtn'),
          loginError: document.getElementById('loginError'),
          registerError: document.getElementById('registerError'),
          username: document.getElementById('username'),
          profileUsername: document.getElementById('profileUsername'),
          profileEmail: document.getElementById('profileEmail'),
          profileCreatedAt: document.getElementById('profileCreatedAt')
        };

        // Error handling
        function showError(element, message) {
          if (element) {
            element.textContent = message;
            element.classList.remove('hidden');
          }
        }

        function hideError(element) {
          if (element) {
            element.classList.add('hidden');
            element.textContent = '';
          }
        }

        // Toggle auth dropdown
        if (elements.authBtn && elements.authDropdown) {
          elements.authBtn.onclick = function(e) {
            e.stopPropagation();
            elements.authDropdown.classList.toggle('hidden');
          };
        }

        // Toggle user menu
        if (elements.userMenuBtn && elements.userDropdown) {
          elements.userMenuBtn.onclick = function(e) {
            e.stopPropagation();
            elements.userDropdown.classList.toggle('hidden');
            if (!elements.userDropdown.classList.contains('hidden')) {
              fetchProfileData();
            }
          };
        }

        // Close dropdowns when clicking outside
        document.onclick = function(e) {
          // For auth dropdown
          if (!elements.authBtn?.contains(e.target) && !elements.authDropdown?.contains(e.target)) {
            elements.authDropdown?.classList.add('hidden');
          }

          // For user dropdown with buffer zone
          const dropdownContainer = elements.userDropdown?.querySelector('.relative');
          if (!elements.userMenuBtn?.contains(e.target) && 
              !dropdownContainer?.contains(e.target)) {
            elements.userDropdown?.classList.add('hidden');
          }
        };

        // Fetch profile data
        function fetchProfileData() {
          fetch('/api/auth/me', {
            credentials: 'include'
          })
          .then(response => response.json())
          .then(data => {
            if (data.success && data.user) {
              if (elements.profileUsername) {
                elements.profileUsername.textContent = data.user.username;
              }
              if (elements.profileEmail) {
                elements.profileEmail.textContent = data.user.email;
              }
              if (elements.profileCreatedAt && data.user.created_at) {
                const date = new Date(data.user.created_at);
                elements.profileCreatedAt.textContent = date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
              }
            }
          })
          .catch(error => console.error('Failed to fetch profile:', error));
        }

        // Handle login
        if (elements.loginForm) {
          elements.loginForm.onsubmit = async function(e) {
            e.preventDefault();
            hideError(elements.loginError);
            
            const formData = new FormData(elements.loginForm);
            const data = Object.fromEntries(formData);

            try {
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include'
              });

              const result = await response.json();
              
              if (result.success) {
                // After successful login, fetch CSRF token
                await fetch('/api/auth/me', {
                  credentials: 'include'
                });
                window.location.reload();
              } else {
                showError(elements.loginError, result.error || 'Login failed');
              }
            } catch (error) {
              console.error('Login error:', error);
              showError(elements.loginError, 'Network error. Please try again.');
            }
          };
        }

        // Handle registration
        if (elements.registerForm) {
          elements.registerForm.onsubmit = function(e) {
            e.preventDefault();
            hideError(elements.registerError);
            
            const formData = new FormData(elements.registerForm);
            const data = Object.fromEntries(formData);

            fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
              credentials: 'include'
            })
            .then(response => response.json())
            .then(result => {
              if (result.success) {
                window.location.reload();
              } else {
                showError(elements.registerError, result.error || 'Registration failed');
              }
            })
            .catch(error => {
              console.error('Registration error:', error);
              showError(elements.registerError, 'Network error. Please try again.');
            });
          };
        }

        // Handle logout
        if (elements.logoutBtn) {
          elements.logoutBtn.onclick = async function(e) {
            e.preventDefault();
            try {
              const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
              });

              if (response.ok) {
                window.location.reload();
              } else {
                const error = await response.json();
                console.error('Logout failed:', error);
              }
            } catch (error) {
              console.error('Logout error:', error);
            }
          };
        }

        // Handle password form toggle
        const togglePasswordForm = document.getElementById('togglePasswordForm');
        const passwordForm = document.getElementById('changePasswordForm');
        const passwordArrow = document.getElementById('passwordArrow');

        if (togglePasswordForm && passwordForm && passwordArrow) {
          togglePasswordForm.onclick = function() {
            passwordForm.classList.toggle('hidden');
            passwordArrow.classList.toggle('rotate-90');
          };
        }

        // Handle password change
        if (passwordForm) {
          passwordForm.onsubmit = async function(e) {
            e.preventDefault();
            const formData = new FormData(passwordForm);
            const data = Object.fromEntries(formData);

            if (data.newPassword !== data.confirmPassword) {
              showError(passwordError, 'New passwords do not match');
              return;
            }

            try {
              const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  currentPassword: data.currentPassword,
                  newPassword: data.newPassword
                }),
                credentials: 'include'
              });

              const result = await response.json();
              
              if (response.ok) {
                alert('Password updated successfully');
                passwordForm.reset();
                passwordForm.classList.add('hidden');
                passwordArrow.classList.remove('rotate-90');
                elements.userDropdown?.classList.add('hidden');
              } else {
                showError(passwordError, result.error || 'Failed to update password');
              }
            } catch (error) {
              console.error('Password change error:', error);
              showError(passwordError, 'Network error. Please try again.');
            }
          };
        }

        // Check auth status
        fetch('/api/auth/me', {
          credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
          if (data.success && data.sessionData?.username) {
            if (elements.authBtn) elements.authBtn.classList.add('hidden');
            if (elements.userMenu) elements.userMenu.classList.remove('hidden');
            if (elements.username) {
              elements.username.textContent = data.sessionData.username;
            }
          }
        })
        .catch(() => {
          if (elements.authBtn) elements.authBtn.classList.remove('hidden');
          if (elements.userMenu) elements.userMenu.classList.add('hidden');
        });

        // Handle chat link visibility
        const chatLink = document.getElementById('chatLink');
        if (chatLink) {
          fetch('/api/auth/me', {
            credentials: 'include'
          })
          .then(response => {
            if (!response.ok) {
              chatLink.style.display = 'none';
            }
          })
          .catch(() => {
            chatLink.style.display = 'none';
          });
        }

        // Add OAuth button handlers
        const githubLogin = document.getElementById('githubLogin');
        const googleLogin = document.getElementById('googleLogin');

        if (githubLogin) {
          githubLogin.onclick = function() {
            // Redirect to GitHub OAuth endpoint
            window.location.href = '/api/auth/github';
          };
        }

        if (googleLogin) {
          googleLogin.onclick = function() {
            // Redirect to Google OAuth endpoint
            window.location.href = '/api/auth/google';
          };
        }
      });
    </script>`;
} 