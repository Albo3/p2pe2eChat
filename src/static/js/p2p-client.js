// Client-side P2P service
class P2PService {
    constructor() {
        this.node = null;
        this.messageCallbacks = [];
        this.CHAT_TOPIC = 'p2p-chat-app';
    }

    async init() {
        try {
            // Import libp2p dynamically
            const { createLibp2p } = await import('https://esm.sh/libp2p');
            const { noise } = await import('https://esm.sh/@chainsafe/libp2p-noise');
            const { yamux } = await import('https://esm.sh/@chainsafe/libp2p-yamux');
            const { webSockets } = await import('https://esm.sh/@libp2p/websockets');
            const { gossipsub } = await import('https://esm.sh/@chainsafe/libp2p-gossipsub');
            const { bootstrap } = await import('https://esm.sh/@libp2p/bootstrap');
            const { identify } = await import('https://esm.sh/@libp2p/identify');

            // Create libp2p node
            this.node = await createLibp2p({
                addresses: {
                    listen: ['/ip4/0.0.0.0/tcp/0/ws']
                },
                transports: [webSockets()],
                connectionEncryption: [noise()],
                streamMuxers: [yamux()],
                peerDiscovery: [
                    bootstrap({
                        list: [
                            '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
                            '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
                        ]
                    })
                ],
                services: {
                    identify: identify(),
                    pubsub: gossipsub({ allowPublishToZeroPeers: true })
                }
            });

            // Handle incoming messages
            await this.node.services.pubsub.subscribe(this.CHAT_TOPIC);
            this.node.services.pubsub.addEventListener('message', (evt) => {
                if (evt.detail.topic === this.CHAT_TOPIC) {
                    try {
                        const msg = JSON.parse(new TextDecoder().decode(evt.detail.data));
                        this.messageCallbacks.forEach(cb => cb(msg));
                    } catch (err) {
                        console.error('Failed to parse message:', err);
                    }
                }
            });

            await this.node.start();
            console.log('P2P node started with ID:', this.node.peerId.toString());
        } catch (error) {
            console.error('Failed to initialize P2P node:', error);
            throw error;
        }
    }

    async sendMessage(message, username) {
        const msg = {
            from: username,
            message,
            timestamp: Date.now()
        };

        await this.node.services.pubsub.publish(
            this.CHAT_TOPIC,
            new TextEncoder().encode(JSON.stringify(msg))
        );
    }

    onMessage(callback) {
        this.messageCallbacks.push(callback);
    }

    async stop() {
        if (this.node) {
            await this.node.stop();
        }
    }

    getPeerId() {
        return this.node?.peerId.toString() || 'Not connected';
    }

    getConnectedPeers() {
        return this.node?.getPeers() || [];
    }

    async connectToPeer(peerId) {
        try {
            const connection = await this.node.dial(peerId);
            console.log('Connected to peer:', peerId);
            return connection;
        } catch (error) {
            console.error('Failed to connect to peer:', error);
            throw error;
        }
    }
} 