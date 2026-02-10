import { userRepository } from "../repositories/user.repository";
import {
  AddressResponse,
  CreateAddressRequest,
  UpdateAddressRequest,
} from "../dtos/address.dto";
import { RequestMetadata } from "./user.service";
import { UserNotFoundError, NotFoundError } from "../errors";

export class AddressService {
  /**
   * Get all addresses for a user
   */
  async getUserAddresses(userId: string): Promise<AddressResponse[]> {
    const user = (await userRepository.findById(
      "00000000-0000-0000-0000-000000000000",
      userId,
    )) as any;
    if (!user) throw new UserNotFoundError();

    return (user.addresses || []).map((addr: any) =>
      this.toAddressResponse(addr),
    );
  }

  /**
   * Add a new address
   */
  async addAddress(
    userId: string,
    data: CreateAddressRequest,
    metadata: RequestMetadata,
  ): Promise<AddressResponse> {
    const address = await userRepository.createAddress(userId, data);

    // Log activity
    await userRepository.createActivityLog({
      userId,
      action: "address_created",
      entityType: "address",
      entityId: address.id,
      newValues: data,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    return this.toAddressResponse(address);
  }

  /**
   * Update an address
   */
  async updateAddress(
    userId: string,
    addressId: string,
    data: UpdateAddressRequest,
    metadata: RequestMetadata,
  ): Promise<AddressResponse> {
    const existing = await userRepository.findAddressById(userId, addressId);
    if (!existing) throw new NotFoundError("Address");

    const updated = await userRepository.updateAddress(userId, addressId, data);

    // Log activity
    await userRepository.createActivityLog({
      userId,
      action: "address_updated",
      entityType: "address",
      entityId: addressId,
      newValues: data,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    return this.toAddressResponse(updated);
  }

  /**
   * Delete an address
   */
  async deleteAddress(
    userId: string,
    addressId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const existing = await userRepository.findAddressById(userId, addressId);
    if (!existing) throw new NotFoundError("Address");

    await userRepository.deleteAddress(userId, addressId);

    // Log activity
    await userRepository.createActivityLog({
      userId,
      action: "address_deleted",
      entityType: "address",
      entityId: addressId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
  }

  private toAddressResponse(addr: any): AddressResponse {
    return {
      id: addr.id,
      label: addr.label,
      streetLine1: addr.streetLine1,
      streetLine2: addr.streetLine2,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      isDefault: addr.isDefault,
      createdAt: addr.createdAt.toISOString(),
      updatedAt: addr.updatedAt.toISOString(),
    };
  }
}

export const addressService = new AddressService();
