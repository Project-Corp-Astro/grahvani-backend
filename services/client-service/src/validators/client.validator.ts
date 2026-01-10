import { z } from 'zod';

export const GenderSchema = z.enum(['male', 'female', 'other']);
export const MaritalStatusSchema = z.enum(['single', 'married', 'divorced', 'widowed']);
export const BirthTimeAccuracySchema = z.enum(['exact', 'approximate', 'rectified', 'unknown']);

export const BirthDetailsSchema = z.object({
    // Accept either YYYY-MM-DD or full ISO-8601 DateTime (2026-01-27T10:33:39.000Z)
    birthDate: z.string().refine(
        (val) => {
            // Match YYYY-MM-DD or ISO-8601 DateTime
            return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(val);
        },
        { message: 'Invalid date format (YYYY-MM-DD or ISO-8601 DateTime)' }
    ).nullable().optional().transform(v => v || undefined),
    birthTime: z.string().refine(
        (val) => {
            // Match HH:MM, HH:MM:SS, or ISO-8601 DateTime
            return /^\d{2}:\d{2}(:\d{2})?$/.test(val) || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val);
        },
        { message: 'Invalid time format (HH:MM, HH:MM:SS or ISO string)' }
    ).nullable().optional().transform(v => v || undefined),
    birthPlace: z.string().min(1).max(300).nullable().optional().transform(v => v || undefined),
    birthLatitude: z.coerce.number().min(-90).max(90).nullable().optional().transform(v => v === null ? undefined : v),
    birthLongitude: z.coerce.number().min(-180).max(180).nullable().optional().transform(v => v === null ? undefined : v),
    birthTimezone: z.string().min(1).max(50).nullable().optional().transform(v => v || undefined),
    birthTimeKnown: z.boolean().default(true),
    birthTimeAccuracy: BirthTimeAccuracySchema.default('exact'),
});

export const CreateClientSchema = z.object({
    fullName: z.string().min(1).max(200),
    phonePrimary: z.string().max(20).nullable().optional().transform(v => v || undefined),
    phoneSecondary: z.string().max(20).nullable().optional().transform(v => v || undefined),
    email: z.string().email().max(255).nullable().optional().transform(v => v || undefined),
    photoUrl: z.string().url().max(500).nullable().optional().transform(v => v || undefined),

    // Birth Details
    ...BirthDetailsSchema.shape,

    // Personal Details
    gender: GenderSchema.nullable().optional().transform(v => v || undefined),
    maritalStatus: MaritalStatusSchema.nullable().optional().transform(v => v || undefined),
    occupation: z.string().max(200).nullable().optional().transform(v => v || undefined),
    businessDetails: z.string().nullable().optional().transform(v => v || undefined),
    currentSituation: z.string().nullable().optional().transform(v => v || undefined),
    specialConsiderations: z.string().nullable().optional().transform(v => v || undefined),

    // Address
    addressLine1: z.string().max(300).nullable().optional().transform(v => v || undefined),
    addressLine2: z.string().max(300).nullable().optional().transform(v => v || undefined),
    city: z.string().max(100).nullable().optional().transform(v => v || undefined),
    state: z.string().max(100).nullable().optional().transform(v => v || undefined),
    postalCode: z.string().max(20).nullable().optional().transform(v => v || undefined),
    country: z.string().max(100).nullable().optional().transform(v => v || undefined),

    // Organization
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
});

export const UpdateClientSchema = CreateClientSchema.partial();

export const FamilyLinkSchema = z.object({
    relatedClientId: z.string().uuid(),
    relationshipType: z.enum(['spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'in_law', 'uncle_aunt', 'nephew_niece', 'cousin', 'other']),
    relationshipLabel: z.string().max(100).optional(),
    notes: z.string().max(1000).optional(),
});
