// Mocks are handled in setup.ts

import { AuthService } from "../services/auth.service";
import { describe, beforeEach, it, expect, jest } from "@jest/globals";
import { prismaMock, redisMock, supabaseAdminMock } from "./setup";
import bcrypt from "bcryptjs";

describe("Auth Service Production Lifecycle", () => {
  let authService: AuthService;
  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testTenantId = "00000000-0000-0000-0000-000000000000";
  const testEmail = "naveenmotika143@gmail.com";
  const testPassword = "Naveen@143";
  const testName = "Naveen Motika";
  const metadata = {
    ipAddress: "127.0.0.1",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    deviceType: "desktop",
    deviceName: "Chrome on Windows",
  };

  beforeEach(() => {
    authService = new AuthService();
  });

  it("should complete a full production lifecycle: Register -> Verify -> Login", async () => {
    // --- 1. REGISTRATION PHASE ---
    (prismaMock.user.findUnique as any).mockResolvedValue(null);
    (supabaseAdminMock.auth.admin.createUser as any).mockResolvedValue({
      data: {
        user: { id: "550e8400-e29b-41d4-a716-446655440000", email: testEmail },
      },
      error: null,
    });
    (prismaMock.user.create as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: testEmail,
      name: testName,
      role: "user",
      status: "pending_verification",
      tenantId: "00000000-0000-0000-0000-000000000000",
      createdAt: new Date(),
    });
    (prismaMock.session.create as any).mockResolvedValue({
      id: "sess-123",
      userId: "550e8400-e29b-41d4-a716-446655440000",
      deviceType: "desktop",
      deviceName: "Chrome on Windows",
    });

    const regResult = await authService.register(
      {
        email: testEmail,
        password: testPassword,
        name: testName,
      },
      metadata,
    );

    expect(regResult.user.email).toBe(testEmail);
    expect(prismaMock.user.create).toHaveBeenCalled();

    // Verify metadata was used for session
    expect(prismaMock.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        }),
      }),
    );

    // --- 2. LOGIN PHASE ---
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    (prismaMock.user.findUnique as any).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: testEmail,
      passwordHash: hashedPassword,
      status: "active",
      role: "user",
      tenantId: "00000000-0000-0000-0000-000000000000",
      name: testName,
      createdAt: new Date(),
    });
    (prismaMock.loginAttempt.create as any).mockResolvedValue({});

    const loginResult = await authService.login(
      {
        email: testEmail,
        password: testPassword,
        rememberMe: false,
      },
      metadata,
    );

    expect(loginResult.tokens).toBeDefined();

    // Verify enriched forensic metadata in LoginAttempt
    expect(prismaMock.loginAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "550e8400-e29b-41d4-a716-446655440000",
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          deviceType: "desktop",
          deviceName: "Chrome on Windows",
        }),
      }),
    );

    // Verify Event Publishing with full forensics
    expect(redisMock.publish).toHaveBeenCalledWith(
      "grahvani:events:auth",
      expect.stringContaining('"type":"user.login"'),
    );

    const lastPublish = JSON.parse(
      (redisMock.publish as any).mock.calls.find((call: any) =>
        call[1].includes("user.login"),
      )[1],
    );
    expect(lastPublish.data.metadata).toMatchObject({
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceType: "desktop",
      deviceName: "Chrome on Windows",
    });
  });
});
