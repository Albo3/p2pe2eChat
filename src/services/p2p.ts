import { createLibp2p } from 'libp2p'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { webSockets } from '@libp2p/websockets'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { bootstrap } from '@libp2p/bootstrap'
import { identify } from '@libp2p/identify'
import { floodsub } from '@libp2p/floodsub'
import type { Message } from '@libp2p/interface-pubsub'

const CHAT_TOPIC = 'p2p-chat-app'

export interface P2PMessage {
    from: string;
    message: string;
    timestamp: number;
}

export class P2PService {
    private node: any;
    private messageCallbacks: ((msg: P2PMessage) => void)[] = [];

    async init() {
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
                        // Add some bootstrap nodes here
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
        await this.node.services.pubsub.subscribe(CHAT_TOPIC);
        this.node.services.pubsub.addEventListener('message', (evt: CustomEvent<Message>) => {
            if (evt.detail.topic === CHAT_TOPIC) {
                try {
                    const msg = JSON.parse(new TextDecoder().decode(evt.detail.data)) as P2PMessage;
                    this.messageCallbacks.forEach(cb => cb(msg));
                } catch (err) {
                    console.error('Failed to parse message:', err);
                }
            }
        });

        await this.node.start();
        console.log('P2P node started with ID:', this.node.peerId.toString());
    }

    async sendMessage(message: string, username: string) {
        const msg: P2PMessage = {
            from: username,
            message,
            timestamp: Date.now()
        };

        await this.node.services.pubsub.publish(
            CHAT_TOPIC,
            new TextEncoder().encode(JSON.stringify(msg))
        );
    }

    onMessage(callback: (msg: P2PMessage) => void) {
        this.messageCallbacks.push(callback);
    }

    async stop() {
        if (this.node) {
            await this.node.stop();
        }
    }

    getPeerId() {
        return this.node?.peerId.toString();
    }

    getConnectedPeers() {
        return this.node?.getPeers() || [];
    }

    async connectToPeer(peerId: string) {
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