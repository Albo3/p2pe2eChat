import Stripe from "npm:stripe@14";
import type { RedisService } from "./redis.ts";

// Initialize Stripe with secret key
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
    typescript: true,
    httpClient: Stripe.createFetchHttpClient(),
});

export interface StripeService {
    createCheckoutSession: (userId: string, email: string) => Promise<string>;
    syncStripeDataToKV: (customerId: string) => Promise<STRIPE_SUB_CACHE>;
    handleWebhookEvent: (body: string, signature: string) => Promise<void>;
    getCustomerSubscription: (userId: string) => Promise<STRIPE_SUB_CACHE | null>;
}

// Following the guide's recommended type for subscription data
export type STRIPE_SUB_CACHE =
    | {
        subscriptionId: string | null;
        status: Stripe.Subscription.Status;
        priceId: string | null;
        currentPeriodStart: number | null;
        currentPeriodEnd: number | null;
        cancelAtPeriodEnd: boolean;
        paymentMethod: {
            brand: string | null; // e.g., "visa", "mastercard"
            last4: string | null; // e.g., "4242"
        } | null;
    }
    | {
        status: "none";
    };

// Update the ALLOWED_EVENTS list
const ALLOWED_EVENTS = [
    // Checkout & Payment Events
    "checkout.session.completed",
    "checkout.session.expired",
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "payment_intent.requires_action",

    // Subscription Lifecycle Events
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.trial_will_end",

    // Invoice Events
    "invoice.paid",
    "invoice.payment_failed",
    "invoice.upcoming",

    // Customer Events
    "customer.created",
    "customer.updated",
    "customer.deleted",

    // Charge Events (important for tracking payments)
    "charge.succeeded",
    "charge.failed",
    "charge.refunded",

    // Dispute Events (important for business)
    "charge.dispute.created",
    "charge.dispute.closed"
] as const;

export function createStripeService(redis: RedisService): StripeService {
    async function getOrCreateCustomer(userId: string, email: string) {
        // Try to get existing Stripe customer ID from KV
        const existingCustomerId = await redis.get(`stripe:user:${userId}`);
        if (existingCustomerId) {
            return existingCustomerId;
        }

        // Create new customer if none exists
        const customer = await stripe.customers.create({
            email,
            metadata: {
                userId, // Important for webhook handling
            },
        });

        // Store the customer ID in KV
        await redis.set(`stripe:user:${userId}`, customer.id);
        return customer.id;
    }

    return {
        async createCheckoutSession(userId: string, email: string) {
            const customerId = await getOrCreateCustomer(userId, email);

            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                mode: "subscription",
                payment_method_types: ["card"],
                line_items: [{
                    price: Deno.env.get("STRIPE_PRICE_ID"),
                    quantity: 1,
                }],
                success_url: `${Deno.env.get("APP_URL")}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${Deno.env.get("APP_URL")}/cancel`,
                allow_promotion_codes: true,
                subscription_data: {
                    metadata: {
                        userId,
                    },
                },
            });

            return session.url || "";
        },

        // Core function to sync Stripe data to KV (from guide)
        async syncStripeDataToKV(customerId: string): Promise<STRIPE_SUB_CACHE> {
            try {
                const subscriptions = await stripe.subscriptions.list({
                    customer: customerId,
                    limit: 1,
                    status: "all",
                    expand: ["data.default_payment_method"],
                });

                if (subscriptions.data.length === 0) {
                    const subData = { status: "none" } as const;
                    await redis.set(`stripe:customer:${customerId}`, JSON.stringify(subData));
                    return subData;
                }

                const subscription = subscriptions.data[0];

                const subData: STRIPE_SUB_CACHE = {
                    subscriptionId: subscription.id,
                    status: subscription.status,
                    priceId: subscription.items.data[0].price.id,
                    currentPeriodEnd: subscription.current_period_end,
                    currentPeriodStart: subscription.current_period_start,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    paymentMethod:
                        subscription.default_payment_method &&
                            typeof subscription.default_payment_method !== "string"
                            ? {
                                brand: subscription.default_payment_method.card?.brand ?? null,
                                last4: subscription.default_payment_method.card?.last4 ?? null,
                            }
                            : null,
                };

                await redis.set(`stripe:customer:${customerId}`, JSON.stringify(subData));
                return subData;
            } catch (error) {
                console.error("Error syncing Stripe data:", error);
                throw error;
            }
        },

        async handleWebhookEvent(body: string, signature: string) {
            try {
                const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
                if (!webhookSecret) {
                    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable");
                }

                const event = await stripe.webhooks.constructEventAsync(
                    body,
                    signature,
                    webhookSecret
                );

                console.log("Processing webhook event:", {
                    type: event.type,
                    id: event.id,
                    created: new Date(event.created * 1000).toISOString()
                });

                // Skip if not in allowed events list
                if (!ALLOWED_EVENTS.includes(event.type as any)) {
                    console.log(`Skipping event type: ${event.type} (not in allowed list)`);
                    return;
                }

                // Extract customer ID based on event type
                let customerId: string | undefined;

                if (event.type.startsWith('customer.')) {
                    customerId = (event.data.object as { id: string }).id;
                } else if (event.type.startsWith('checkout.session.')) {
                    customerId = (event.data.object as { customer: string }).customer;
                } else {
                    customerId = (event.data.object as { customer: string }).customer;
                }

                if (!customerId) {
                    console.log(`No customer ID found for event: ${event.type}`);
                    return;
                }

                // Sync customer data
                await this.syncStripeDataToKV(customerId);

                // Log specific event details based on type
                switch (event.type) {
                    case 'checkout.session.completed':
                        console.log('Checkout completed:', {
                            customerId,
                            amount: (event.data.object as any).amount_total,
                            currency: (event.data.object as any).currency
                        });
                        break;
                    case 'customer.subscription.created':
                    case 'customer.subscription.updated':
                        console.log('Subscription update:', {
                            customerId,
                            status: (event.data.object as any).status,
                            planId: (event.data.object as any).plan?.id
                        });
                        break;
                    case 'invoice.paid':
                        console.log('Invoice paid:', {
                            customerId,
                            amount: (event.data.object as any).amount_paid,
                            invoiceId: (event.data.object as any).id
                        });
                        break;
                    default:
                        console.log(`Processed ${event.type} for customer ${customerId}`);
                }

                return;
            } catch (error) {
                console.error("[STRIPE HOOK] Error processing webhook:", {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
                throw error;
            }
        },

        async getCustomerSubscription(userId: string): Promise<STRIPE_SUB_CACHE | null> {
            try {
                const customerId = await redis.get(`stripe:user:${userId}`);
                if (!customerId) return null;

                const cached = await redis.get(`stripe:customer:${customerId}`);
                if (cached) {
                    return JSON.parse(cached);
                }

                // If not in cache, sync and return fresh data
                return await this.syncStripeDataToKV(customerId);
            } catch (error) {
                console.error("Error getting customer subscription:", error);
                return null;
            }
        },
    };
}
