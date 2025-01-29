import { html } from "npm:hono/html";
import { Header } from "./header.ts";

export function HomePage() {
  return html`<!DOCTYPE html>
    <html lang="en" class="dark">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>P2P Chat</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          :root {
            --background: 224 71% 4%;
            --foreground: 213 31% 91%;
          }
          body {
            min-height: 100vh;
            background: radial-gradient(circle at 50% -250%, rgba(17, 24, 39, 1), rgba(3, 7, 18, 1) 55%);
          }
          .glass-dark {
            background: linear-gradient(180deg, rgba(17, 24, 39, 0.6) 0%, rgba(17, 24, 39, 0.3) 100%);
            backdrop-filter: blur(10px);
          }
          .terminal-glow {
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.1);
          }
        </style>
      </head>
      <body class="bg-background text-foreground">
        ${Header()}
        
        <main class="container mx-auto px-4 py-6">
          <!-- Terminal-style Hero Section -->
          <div class="rounded-lg border border-white/5 glass-dark p-6 mb-12 terminal-glow">
            <div class="flex items-start space-x-4">
              <div class="min-w-0 flex-1">
                <div class="font-mono mb-4">
                  <span class="text-green-500">$</span>
                  <span class="text-emerald-400/90"> init</span>
                  <span class="text-white/80"> p2p-chat</span>
                </div>
                <h1 class="text-2xl md:text-3xl font-mono text-white/90 mb-4 tracking-tight">
                  Encrypted P2P Communication
                </h1>
                <div class="font-mono text-sm space-y-1.5">
                  <p class="text-emerald-400/80">→ End-to-end encryption</p>
                  <p class="text-emerald-400/70">→ No central servers</p>
                  <p class="text-emerald-400/60">→ Direct peer connections</p>
                </div>
              </div>
              <div class="hidden md:block">
                <div class="w-32 h-32 rounded-lg border border-white/5 bg-black/40 p-4">
                  <svg class="w-full h-full text-emerald-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Connection Status Panel -->
          <div class="grid gap-6 md:grid-cols-2 mb-12">
            <div class="rounded-lg border border-white/5 glass-dark p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-mono text-emerald-400/90">Network Status</h2>
                <div class="flex items-center space-x-2">
                  <div class="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
                  <span class="text-sm text-emerald-400/70">Online</span>
                </div>
              </div>
              <div class="space-y-2 font-mono text-sm">
                <div class="flex justify-between text-white/60">
                  <span>Peers Connected:</span>
                  <span>0</span>
                </div>
                <div class="flex justify-between text-white/60">
                  <span>Latency:</span>
                  <span>--ms</span>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-white/5 glass-dark p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-mono text-emerald-400/90">Quick Connect</h2>
              </div>
              <div class="flex space-x-2">
                <input type="text" 
                       placeholder="Enter peer ID" 
                       class="flex-1 rounded-md border border-white/5 bg-black/40 px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500/30">
                <button class="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                  Connect
                </button>
              </div>
            </div>
          </div>

          <!-- Technical Specs -->
          <div class="rounded-lg border border-white/5 glass-dark p-6">
            <h2 class="text-lg font-mono text-emerald-400/90 mb-4">Technical Specifications</h2>
            <div class="grid gap-6 md:grid-cols-3 font-mono text-sm">
              <div class="space-y-2">
                <div class="text-emerald-400/50">Protocol</div>
                <div class="text-white/90">libp2p</div>
                <div class="text-white/50">TCP/QUIC Transport</div>
              </div>
              <div class="space-y-2">
                <div class="text-emerald-400/50">Security</div>
                <div class="text-white/90">Noise Protocol</div>
                <div class="text-white/50">TLS 1.3 + Certificate Pinning</div>
              </div>
              <div class="space-y-2">
                <div class="text-emerald-400/50">Network</div>
                <div class="text-white/90">DHT Kademlia</div>
                <div class="text-white/50">PubSub + Circuit Relay</div>
              </div>
            </div>
          </div>
        </main>

        <script>
          // Check auth status on load
          // fetch('/profile')
          //   .then(response => {
          //     const authStatus = document.getElementById('authStatus');
          //     const loginBtn = document.getElementById('loginBtn');
              
          //     if (response.ok) {
          //       authStatus.textContent = 'Authenticated';
          //       loginBtn.textContent = 'Logout';
          //       loginBtn.onclick = () => fetch('/logout', { method: 'POST' })
          //         .then(() => window.location.reload());
          //     } else {
          //       authStatus.textContent = 'Guest';
          //       loginBtn.onclick = () => window.location.href = '/login';
          //     }
          //   });
        </script>
      </body>
    </html>`;
} 