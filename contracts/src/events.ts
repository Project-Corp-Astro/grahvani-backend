// Event Definitions - Shared between all services
// This is the ONLY shared code in the monorepo
// Events are the "language" services use to communicate asynchronously

// ============ BASE EVENT STRUCTURE ============

export interface BaseEvent<T extends string, D> {
    type: T;
    data: D;
    metadata: {
        eventId: string;
        timestamp: string;
        source: string;
        correlationId?: string;
        version: '1.0';
    };
}

// ============ AUTH EVENTS ============

export type UserRegisteredEvent = BaseEvent<'user.registered', {
    userId: string;
    email: string;
    name: string;
    tenantId?: string;
    isSocial?: boolean;
}>;

export type UserLoginEvent = BaseEvent<'user.login', {
    userId: string;
    sessionId: string;
    ipAddress?: string;
    deviceType?: string;
    provider?: string;
}>;

export type UserLogoutEvent = BaseEvent<'user.logout', {
    userId: string;
    sessionId: string;
    allDevices: boolean;
}>;

export type PasswordResetRequestedEvent = BaseEvent<'auth.password_reset_requested', {
    userId: string;
    email: string;
    name: string;
    resetToken: string;
    expiresAt: string;
}>;

export type PasswordChangedEvent = BaseEvent<'auth.password_changed', {
    userId: string;
}>;

export type EmailVerifiedEvent = BaseEvent<'auth.email_verified', {
    userId: string;
    email: string;
}>;

// ============ BOOKING EVENTS ============

export type BookingCreatedEvent = BaseEvent<'booking.created', {
    bookingId: string;
    clientId: string;
    astrologerId: string;
    serviceType: string;
    scheduledAt: string;
    duration: number;
}>;

export type BookingConfirmedEvent = BaseEvent<'booking.confirmed', {
    bookingId: string;
    clientId: string;
    astrologerId: string;
}>;

export type BookingCancelledEvent = BaseEvent<'booking.cancelled', {
    bookingId: string;
    clientId: string;
    astrologerId: string;
    reason: string;
    cancelledBy: 'client' | 'astrologer' | 'system';
}>;

export type BookingCompletedEvent = BaseEvent<'booking.completed', {
    bookingId: string;
    clientId: string;
    astrologerId: string;
    duration: number;
}>;

// ============ PAYMENT EVENTS ============

export type PaymentInitiatedEvent = BaseEvent<'payment.initiated', {
    paymentId: string;
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    provider: 'razorpay' | 'phonepe';
}>;

export type PaymentCompletedEvent = BaseEvent<'payment.completed', {
    paymentId: string;
    orderId: string;
    userId: string;
    amount: number;
    transactionId: string;
}>;

export type PaymentFailedEvent = BaseEvent<'payment.failed', {
    paymentId: string;
    orderId: string;
    userId: string;
    reason: string;
}>;

export type RefundInitiatedEvent = BaseEvent<'refund.initiated', {
    refundId: string;
    paymentId: string;
    userId: string;
    amount: number;
}>;

// ============ NOTIFICATION EVENTS ============

export type NotificationRequestedEvent = BaseEvent<'notification.requested', {
    type: 'email' | 'sms' | 'push';
    userId: string;
    template: string;
    data: Record<string, unknown>;
}>;

// ============ REPORT EVENTS ============

export type ReportGeneratedEvent = BaseEvent<'report.generated', {
    reportId: string;
    clientId: string;
    astrologerId: string;
    type: string;
    url: string;
}>;

// ============ ALL EVENTS UNION ============

export type GrahvaniEvent =
    // Auth
    | UserRegisteredEvent
    | UserLoginEvent
    | UserLogoutEvent
    | PasswordResetRequestedEvent
    | PasswordChangedEvent
    | EmailVerifiedEvent
    // Booking
    | BookingCreatedEvent
    | BookingConfirmedEvent
    | BookingCancelledEvent
    | BookingCompletedEvent
    // Payment
    | PaymentInitiatedEvent
    | PaymentCompletedEvent
    | PaymentFailedEvent
    | RefundInitiatedEvent
    // Notification
    | NotificationRequestedEvent
    // Report
    | ReportGeneratedEvent;

// ============ EVENT CHANNELS ============

export const EVENT_CHANNELS = {
    AUTH: 'grahvani:events:auth',
    BOOKING: 'grahvani:events:booking',
    PAYMENT: 'grahvani:events:payment',
    NOTIFICATION: 'grahvani:events:notification',
    REPORT: 'grahvani:events:report',
    ALL: 'grahvani:events:*',
} as const;
