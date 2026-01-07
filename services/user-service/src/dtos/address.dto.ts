import { z } from 'zod';

export const AddressSchema = z.object({
    id: z.string().uuid().optional(),
    label: z.string().min(1).max(50),
    streetLine1: z.string().min(1).max(255),
    streetLine2: z.string().max(255).nullable().optional(),
    city: z.string().min(1).max(100),
    state: z.string().max(100).nullable().optional(),
    postalCode: z.string().min(1).max(20),
    country: z.string().length(2), // ISO 3166-1 alpha-2
    isDefault: z.boolean().default(false),
});

export const CreateAddressRequestSchema = AddressSchema.omit({ id: true });
export const UpdateAddressRequestSchema = AddressSchema.omit({ id: true }).partial();

export type AddressResponse = z.infer<typeof AddressSchema> & {
    createdAt: string;
    updatedAt: string;
};

export type CreateAddressRequest = z.infer<typeof CreateAddressRequestSchema>;
export type UpdateAddressRequest = z.infer<typeof UpdateAddressRequestSchema>;
