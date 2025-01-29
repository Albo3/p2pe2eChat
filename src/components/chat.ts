import { html } from "npm:hono/html";
import { Header } from "./header.ts";
import { Context } from "hono";

export function ChatPage(c: Context) {
    return html`<!DOCTYPE html>
    <html lang="en" class="dark">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>P2P Chat</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script>
        <script type="module">
            document.addEventListener('DOMContentLoaded', async function() {
                let username = '';
                let peer;
                const connections = new Map();

                // Get username from session
                try {
                    const response = await fetch('/api/auth/me', {
                        credentials: 'include'
                    });
                    if (!response.ok) {
                        window.location.href = '/';
                        throw new Error('Not authenticated');
                    }
                    const data = await response.json();
                    username = data.user.username;
                } catch (error) {
                    console.error('Auth check failed:', error);
                    window.location.href = '/';
                    return;
                }

                try {
                    // Initialize peer with random ID
                    peer = new Peer(username + '-' + Math.random().toString(36).substr(2, 9));
                    
                    peer.on('open', (id) => {
                        document.getElementById('peerId').textContent = id;
                        console.log('My peer ID is: ' + id);
                        updatePeerCount();
                    });

                    // Handle incoming connections
                    peer.on('connection', (conn) => {
                        handleConnection(conn);
                    });

                    // Handle connection errors
                    peer.on('error', (err) => {
                        console.error('Peer error:', err);
                        document.getElementById('peerId').textContent = 'Connection error';
                    });

                    // Connect to peer button
                    const connectBtn = document.getElementById('connectBtn');
                    const peerIdInput = document.getElementById('peerIdInput');
                    
                    if (connectBtn && peerIdInput) {
                        connectBtn.onclick = () => {
                            const peerId = peerIdInput.value.trim();
                            if (peerId && peerId !== peer.id) {
                                const conn = peer.connect(peerId);
                                handleConnection(conn);
                                peerIdInput.value = '';
                            }
                        };
                    }

                    // Handle sending messages
                    const messageForm = document.getElementById('messageForm');
                    const messageInput = document.getElementById('messageInput');
                    
                    if (messageForm && messageInput) {
                        messageForm.onsubmit = function(e) {
                            e.preventDefault();
                            const message = messageInput.value.trim();
                            if (message) {
                                const msg = {
                                    from: username,
                                    message,
                                    timestamp: Date.now()
                                };
                                // Send to all connected peers
                                connections.forEach(conn => {
                                    conn.send(msg);
                                });
                                // Show own message
                                addMessage(msg);
                                messageInput.value = '';
                            }
                        };
                    }

                    function handleConnection(conn) {
                        conn.on('open', () => {
                            connections.set(conn.peer, conn);
                            updatePeerCount();
                        });

                        conn.on('data', (data) => {
                            addMessage(data);
                        });

                        conn.on('close', () => {
                            connections.delete(conn.peer);
                            updatePeerCount();
                        });
                    }

                    function updatePeerCount() {
                        document.getElementById('peerCount').textContent = connections.size.toString();
                    }

                } catch (error) {
                    console.error('P2P initialization failed:', error);
                    document.getElementById('peerId').textContent = 'Failed to connect';
                }

                function addMessage(msg) {
                    const messagesDiv = document.getElementById('messages');
                    const msgDiv = document.createElement('div');
                    msgDiv.className = msg.from === username ? 'flex justify-end' : 'flex justify-start';
                    
                    const innerDiv = document.createElement('div');
                    innerDiv.className = msg.from === username 
                        ? 'max-w-[70%] rounded-lg px-4 py-2 bg-emerald-500/10 text-emerald-400'
                        : 'max-w-[70%] rounded-lg px-4 py-2 bg-white/5 text-white/90';
                    
                    const header = document.createElement('div');
                    header.className = 'text-xs opacity-70 mb-1';
                    header.textContent = msg.from === username ? 'You' : msg.from;
                    
                    const content = document.createElement('div');
                    content.className = 'text-sm';
                    content.textContent = msg.message;
                    
                    innerDiv.appendChild(header);
                    innerDiv.appendChild(content);
                    msgDiv.appendChild(innerDiv);
                    messagesDiv.appendChild(msgDiv);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
            });
        </script>
        <style>
            body {
                min-height: 100vh;
                background: radial-gradient(circle at 50% -250%, rgba(17, 24, 39, 1), rgba(3, 7, 18, 1) 55%);
            }
        </style>
    </head>
    <body class="bg-background text-foreground">
        ${Header()}
        
        <main class="container mx-auto px-4 py-6">
            <div class="rounded-lg border border-white/5 glass-dark p-6">
                <div class="flex h-[calc(100vh-12rem)] flex-col">
                    <!-- Chat Header -->
                    <div class="border-b border-white/10 pb-4">
                        <div class="flex justify-between items-center">
                            <h1 class="text-xl font-mono text-emerald-400/90">P2P Chat Room</h1>
                            <div class="text-sm text-white/50">
                                <span>Your Peer ID: </span>
                                <span id="peerId" class="font-mono">Connecting...</span>
                            </div>
                        </div>
                        
                        <!-- Add Peer Connection Input -->
                        <div class="flex gap-2 mt-2">
                            <input type="text" id="peerIdInput" 
                                   placeholder="Enter peer ID to connect..."
                                   class="flex-1 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/30">
                            <button id="connectBtn"
                                    class="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                                Connect
                            </button>
                        </div>

                        <div class="text-sm text-white/50 mt-1">
                            <span>Connected Peers: </span>
                            <span id="peerCount">0</span>
                        </div>
                    </div>

                    <!-- Chat Messages -->
                    <div id="messages" class="flex-1 space-y-4 overflow-y-auto py-4">
                        <!-- Messages will be inserted here -->
                    </div>

                    <!-- Chat Input -->
                    <div class="border-t border-white/10 pt-4">
                        <form id="messageForm" class="flex gap-4">
                            <input type="hidden" name="csrf_token" value="${c.get("csrfToken")}">
                            <input type="text" id="messageInput" 
                                   class="flex-1 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                                   placeholder="Type your message...">
                            <button type="submit"
                                    class="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </main>
    </body>
    </html>`;
}
