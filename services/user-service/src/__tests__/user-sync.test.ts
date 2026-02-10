import { UserService } from "../services/user.service";
import { eventSubscriber, UserLoginEvent } from "../events/subscriber";
import { prismaMock } from "./setup";
import { describe, beforeEach, it, expect } from "@jest/globals";

describe("User Service Production Sync", () => {
  let userService: UserService;
  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testTenantId = "550e8400-e29b-41d4-a716-446655440001";
  const metadata = {
    ipAddress: "127.0.0.1",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  beforeEach(() => {
    userService = new UserService();
  });

  it("should correctly update user profile with DOB and Gender", async () => {
    // Mock finding existing user
    (prismaMock.user.findFirst as any).mockResolvedValue({
      id: testUserId,
      tenantId: testTenantId,
      name: "Naveen",
      email: "naveenmotika143@gmail.com",
      role: "user",
      status: "active",
      deletedAt: null,
    });

    // Mock update
    const fullUser = {
      id: testUserId,
      tenantId: testTenantId,
      name: "Naveen Motika",
      email: "naveenmotika143@gmail.com",
      role: "user",
      status: "active",
      birthDate: new Date("1995-05-15"),
      gender: "male",
      createdAt: new Date(),
      followersCount: 0,
      followingCount: 0,
      deletedAt: null,
    };
    (prismaMock.user.update as any).mockResolvedValue(fullUser);
    (prismaMock.userActivityLog.create as any).mockResolvedValue({});

    await userService.updateProfile(
      testTenantId,
      testUserId,
      {
        name: "Naveen Motika",
        birthDate: "1995-05-15",
        gender: "male",
      },
      metadata,
    );

    // Verify profile updated
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: testUserId },
        data: expect.objectContaining({
          name: "Naveen Motika",
          birthDate: new Date("1995-05-15"),
          gender: "male",
        }),
      }),
    );

    // Verify activity log captured forensics
    expect(prismaMock.userActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: testUserId,
          action: "profile_updated",
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        }),
      }),
    );
  });

  it("should correctly process user.login event from Auth Service", async () => {
    const loginEvent: UserLoginEvent = {
      type: "user.login",
      timestamp: new Date().toISOString(),
      data: {
        userId: testUserId,
        sessionId: "550e8400-e29b-41d4-a716-446655440002",
        metadata: {
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          deviceType: "desktop",
          deviceName: "Chrome on Windows",
        },
      },
    };

    (prismaMock.userActivityLog.create as any).mockResolvedValue({});

    // Manually trigger the handler (simulating Redis message)
    await (eventSubscriber as any).handleUserLogin(loginEvent);

    // Verify forensic metadata was mapped to UserActivityLog
    expect(prismaMock.userActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: testUserId,
          action: "user_login",
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          deviceType: "desktop",
          deviceName: "Chrome on Windows",
        }),
      }),
    );
  });
});
