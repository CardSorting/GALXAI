/**
 * GALXAI: Supabase Stripe Customer & Invoice Mesh Repository + BroccoliDB Hot Tables
 * High-performance L1 cached storage for Stripe customers, checkout sessions, invoices, and webhook event DLQ.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';

export interface StripeCustomerRecord {
  id: string;
  userId: string;
  stripeCustomerId: string;
  email: string | null;
  currency: string;
  defaultPaymentMethodId: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface StripeCheckoutSessionRecord {
  sessionId: string;
  userId: string;
  customerId: string | null;
  amountUsd: number;
  matchGrantUsd: number;
  totalCreditedUsd: number;
  status: 'open' | 'complete' | 'expired' | 'canceled';
  paymentStatus: 'unpaid' | 'paid' | 'no_payment_required';
  paymentIntentId: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface StripeInvoiceRecord {
  id: string;
  userId: string;
  stripeInvoiceId: string;
  amountDueUsd: number;
  amountPaidUsd: number;
  status: string;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface StripeEventRecord {
  eventId: string;
  eventType: string;
  status: 'processed' | 'ignored' | 'failed';
  errorMessage: string | null;
  payloadHash: string;
  createdAt: string;
}

export class StripeRepository {
  private static instance: StripeRepository;
  public readonly customerTable: BroccoliDbTable<StripeCustomerRecord>;
  public readonly sessionTable: BroccoliDbTable<StripeCheckoutSessionRecord>;
  public readonly invoiceTable: BroccoliDbTable<StripeInvoiceRecord>;
  public readonly eventTable: BroccoliDbTable<StripeEventRecord>;

  private constructor() {
    this.customerTable = new BroccoliDbTable<StripeCustomerRecord>('stripe_customers');
    this.customerTable.createIndex('userId');
    this.customerTable.createIndex('stripeCustomerId');

    this.sessionTable = new BroccoliDbTable<StripeCheckoutSessionRecord>('stripe_checkout_sessions');
    this.sessionTable.createIndex('userId');
    this.sessionTable.createIndex('status');

    this.invoiceTable = new BroccoliDbTable<StripeInvoiceRecord>('stripe_invoices');
    this.invoiceTable.createIndex('userId');
    this.invoiceTable.createIndex('stripeInvoiceId');

    this.eventTable = new BroccoliDbTable<StripeEventRecord>('stripe_events');
    this.eventTable.createIndex('eventType');
    this.eventTable.createIndex('status');
  }

  static getInstance(): StripeRepository {
    if (!StripeRepository.instance) {
      StripeRepository.instance = new StripeRepository();
    }
    return StripeRepository.instance;
  }

  async getCustomer(userId: string): Promise<StripeCustomerRecord | null> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_stripe_customers')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!error && data) {
          const mapped: StripeCustomerRecord = {
            id: data.id,
            userId: data.user_id,
            stripeCustomerId: data.stripe_customer_id,
            email: data.email,
            currency: data.currency,
            defaultPaymentMethodId: data.default_payment_method_id,
            metadata: (data.metadata as Record<string, any>) || {},
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
          this.customerTable.put(userId, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    const matches = this.customerTable.query({
      where: { userId: { $eq: userId } }
    }) as StripeCustomerRecord[];
    return matches[0] || null;
  }

  async getCustomerByStripeId(stripeCustomerId: string): Promise<StripeCustomerRecord | null> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_stripe_customers')
          .select('*')
          .eq('stripe_customer_id', stripeCustomerId)
          .single();

        if (!error && data) {
          const mapped: StripeCustomerRecord = {
            id: data.id,
            userId: data.user_id,
            stripeCustomerId: data.stripe_customer_id,
            email: data.email,
            currency: data.currency,
            defaultPaymentMethodId: data.default_payment_method_id,
            metadata: (data.metadata as Record<string, any>) || {},
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
          this.customerTable.put(mapped.userId, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    const matches = this.customerTable.query({
      where: { stripeCustomerId: { $eq: stripeCustomerId } }
    }) as StripeCustomerRecord[];
    return matches[0] || null;
  }

  async upsertCustomer(params: {
    userId: string;
    stripeCustomerId: string;
    email?: string | null;
    currency?: string;
    defaultPaymentMethodId?: string | null;
    metadata?: Record<string, any>;
  }): Promise<StripeCustomerRecord> {
    const existing = await this.getCustomer(params.userId);
    const id = existing ? existing.id : `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: StripeCustomerRecord = {
      id,
      userId: params.userId,
      stripeCustomerId: params.stripeCustomerId,
      email: params.email ?? existing?.email ?? null,
      currency: params.currency || existing?.currency || 'usd',
      defaultPaymentMethodId: params.defaultPaymentMethodId ?? existing?.defaultPaymentMethodId ?? null,
      metadata: { ...existing?.metadata, ...params.metadata },
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    this.customerTable.put(params.userId, record);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_stripe_customers').upsert({
          id: record.id,
          user_id: record.userId,
          stripe_customer_id: record.stripeCustomerId,
          email: record.email,
          currency: record.currency,
          default_payment_method_id: record.defaultPaymentMethodId,
          metadata: record.metadata,
          updated_at: now
        }, { onConflict: 'user_id' });
      } catch {
        // Fallback
      }
    }

    return record;
  }

  async recordCheckoutSession(params: {
    sessionId: string;
    userId: string;
    customerId?: string | null;
    amountUsd: number;
    matchGrantUsd: number;
    totalCreditedUsd: number;
    status?: 'open' | 'complete' | 'expired' | 'canceled';
    paymentStatus?: 'unpaid' | 'paid' | 'no_payment_required';
    paymentIntentId?: string | null;
    metadata?: Record<string, any>;
  }): Promise<StripeCheckoutSessionRecord> {
    const now = new Date().toISOString();
    const record: StripeCheckoutSessionRecord = {
      sessionId: params.sessionId,
      userId: params.userId,
      customerId: params.customerId || null,
      amountUsd: params.amountUsd,
      matchGrantUsd: params.matchGrantUsd,
      totalCreditedUsd: params.totalCreditedUsd,
      status: params.status || 'open',
      paymentStatus: params.paymentStatus || 'unpaid',
      paymentIntentId: params.paymentIntentId || null,
      metadata: params.metadata || {},
      createdAt: now,
      updatedAt: now
    };

    this.sessionTable.put(params.sessionId, record);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_stripe_checkout_sessions').upsert({
          session_id: record.sessionId,
          user_id: record.userId,
          customer_id: record.customerId,
          amount_usd: record.amountUsd,
          match_grant_usd: record.matchGrantUsd,
          total_credited_usd: record.totalCreditedUsd,
          status: record.status,
          payment_status: record.paymentStatus,
          payment_intent_id: record.paymentIntentId,
          metadata: record.metadata,
          updated_at: now
        }, { onConflict: 'session_id' });
      } catch {
        // Fallback
      }
    }

    return record;
  }

  async getCheckoutSession(sessionId: string): Promise<StripeCheckoutSessionRecord | null> {
    const local = this.sessionTable.get(sessionId);
    if (local) return local;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_stripe_checkout_sessions')
          .select('*')
          .eq('session_id', sessionId)
          .single();

        if (!error && data) {
          const record: StripeCheckoutSessionRecord = {
            sessionId: data.session_id,
            userId: data.user_id,
            customerId: data.customer_id,
            amountUsd: Number(data.amount_usd),
            matchGrantUsd: Number(data.match_grant_usd),
            totalCreditedUsd: Number(data.total_credited_usd),
            status: data.status as any,
            paymentStatus: data.payment_status as any,
            paymentIntentId: data.payment_intent_id,
            metadata: (data.metadata as Record<string, any>) || {},
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
          this.sessionTable.put(sessionId, record);
          return record;
        }
      } catch {
        // Fallback
      }
    }

    return null;
  }

  async completeCheckoutSession(sessionId: string, paymentIntentId?: string): Promise<boolean> {
    const session = await this.getCheckoutSession(sessionId);
    if (!session) return false;

    session.status = 'complete';
    session.paymentStatus = 'paid';
    session.paymentIntentId = paymentIntentId || session.paymentIntentId;
    session.updatedAt = new Date().toISOString();
    this.sessionTable.put(sessionId, session);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('galx_stripe_checkout_sessions')
          .update({
            status: 'complete',
            payment_status: 'paid',
            payment_intent_id: session.paymentIntentId,
            updated_at: session.updatedAt
          })
          .eq('session_id', sessionId);
      } catch {
        // Fallback
      }
    }

    return true;
  }

  async isEventProcessed(eventId: string): Promise<boolean> {
    const local = this.eventTable.get(eventId);
    if (local && local.status === 'processed') return true;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_stripe_events')
          .select('event_id, status')
          .eq('event_id', eventId)
          .single();

        if (!error && data && data.status === 'processed') {
          return true;
        }
      } catch {
        // Fallback
      }
    }

    return false;
  }

  async recordEvent(params: {
    eventId: string;
    eventType: string;
    status: 'processed' | 'ignored' | 'failed';
    payloadHash: string;
    errorMessage?: string | null;
  }): Promise<void> {
    const now = new Date().toISOString();
    const record: StripeEventRecord = {
      eventId: params.eventId,
      eventType: params.eventType,
      status: params.status,
      errorMessage: params.errorMessage || null,
      payloadHash: params.payloadHash,
      createdAt: now
    };

    this.eventTable.put(params.eventId, record);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_stripe_events').upsert({
          event_id: record.eventId,
          event_type: record.eventType,
          status: record.status,
          error_message: record.errorMessage,
          payload_hash: record.payloadHash,
          created_at: now
        }, { onConflict: 'event_id' });
      } catch {
        // Fallback
      }
    }
  }

  async recordInvoice(params: {
    userId: string;
    stripeInvoiceId: string;
    amountDueUsd: number;
    amountPaidUsd: number;
    status: string;
    hostedInvoiceUrl?: string | null;
    invoicePdfUrl?: string | null;
    periodStart?: string | null;
    periodEnd?: string | null;
    metadata?: Record<string, any>;
  }): Promise<StripeInvoiceRecord> {
    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: StripeInvoiceRecord = {
      id,
      userId: params.userId,
      stripeInvoiceId: params.stripeInvoiceId,
      amountDueUsd: params.amountDueUsd,
      amountPaidUsd: params.amountPaidUsd,
      status: params.status,
      hostedInvoiceUrl: params.hostedInvoiceUrl || null,
      invoicePdfUrl: params.invoicePdfUrl || null,
      periodStart: params.periodStart || null,
      periodEnd: params.periodEnd || null,
      metadata: params.metadata || {},
      createdAt: now
    };

    this.invoiceTable.put(params.stripeInvoiceId, record);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_stripe_invoices').upsert({
          id: record.id,
          user_id: record.userId,
          stripe_invoice_id: record.stripeInvoiceId,
          amount_due_usd: record.amountDueUsd,
          amount_paid_usd: record.amountPaidUsd,
          status: record.status,
          hosted_invoice_url: record.hostedInvoiceUrl,
          invoice_pdf_url: record.invoicePdfUrl,
          period_start: record.periodStart,
          period_end: record.periodEnd,
          metadata: record.metadata,
          created_at: now
        }, { onConflict: 'stripe_invoice_id' });
      } catch {
        // Fallback
      }
    }

    return record;
  }

  async getInvoices(userId: string): Promise<StripeInvoiceRecord[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_stripe_invoices')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const mapped = data.map(d => ({
            id: d.id,
            userId: d.user_id,
            stripeInvoiceId: d.stripe_invoice_id,
            amountDueUsd: Number(d.amount_due_usd),
            amountPaidUsd: Number(d.amount_paid_usd),
            status: d.status,
            hostedInvoiceUrl: d.hosted_invoice_url,
            invoicePdfUrl: d.invoice_pdf_url,
            periodStart: d.period_start,
            periodEnd: d.period_end,
            metadata: (d.metadata as Record<string, any>) || {},
            createdAt: d.created_at
          }));
          for (const inv of mapped) this.invoiceTable.put(inv.stripeInvoiceId, inv);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.invoiceTable.query({
      where: { userId: { $eq: userId } }
    }) as StripeInvoiceRecord[];
  }
}
