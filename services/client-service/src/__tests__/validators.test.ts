import {
  CreateClientSchema,
  UpdateClientSchema,
  FamilyLinkSchema,
  BirthDetailsSchema,
} from "../validators/client.validator";

describe("CreateClientSchema", () => {
  it("accepts valid minimal client data", () => {
    const result = CreateClientSchema.safeParse({ fullName: "Arjun Sharma" });
    expect(result.success).toBe(true);
  });

  it("rejects empty fullName", () => {
    const result = CreateClientSchema.safeParse({ fullName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing fullName", () => {
    const result = CreateClientSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts valid full client data", () => {
    const result = CreateClientSchema.safeParse({
      fullName: "Priya Patel",
      email: "priya@example.com",
      phonePrimary: "+919876543210",
      birthDate: "1995-03-20",
      birthTime: "14:30:00",
      birthPlace: "Mumbai, India",
      birthLatitude: 19.076,
      birthLongitude: 72.8777,
      birthTimezone: "Asia/Kolkata",
      gender: "female",
      maritalStatus: "single",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = CreateClientSchema.safeParse({
      fullName: "Test",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid gender enum", () => {
    const result = CreateClientSchema.safeParse({
      fullName: "Test",
      gender: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects latitude out of range", () => {
    const result = CreateClientSchema.safeParse({
      fullName: "Test",
      birthLatitude: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects longitude out of range", () => {
    const result = CreateClientSchema.safeParse({
      fullName: "Test",
      birthLongitude: 200,
    });
    expect(result.success).toBe(false);
  });

  it("accepts ISO-8601 birthDate format", () => {
    const result = CreateClientSchema.safeParse({
      fullName: "Test",
      birthDate: "2026-01-27T10:33:39.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid birthDate format", () => {
    const result = CreateClientSchema.safeParse({
      fullName: "Test",
      birthDate: "27/01/2026",
    });
    expect(result.success).toBe(false);
  });

  it("accepts ISO-8601 birthTime format", () => {
    const result = CreateClientSchema.safeParse({
      fullName: "Test",
      birthTime: "2026-01-27T14:30:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid birthTime format", () => {
    const result = CreateClientSchema.safeParse({
      fullName: "Test",
      birthTime: "2:30pm",
    });
    expect(result.success).toBe(false);
  });

  it("transforms null optional fields to undefined", () => {
    const result = CreateClientSchema.parse({
      fullName: "Test",
      email: null,
      phonePrimary: null,
    });
    expect(result.email).toBeUndefined();
    expect(result.phonePrimary).toBeUndefined();
  });

  it("defaults generateInitialChart to true", () => {
    const result = CreateClientSchema.parse({ fullName: "Test" });
    expect(result.generateInitialChart).toBe(true);
  });

  it("accepts valid system enum values", () => {
    for (const system of ["lahiri", "raman", "kp"]) {
      const result = CreateClientSchema.safeParse({
        fullName: "Test",
        system,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("UpdateClientSchema", () => {
  it("accepts partial updates", () => {
    const result = UpdateClientSchema.safeParse({ fullName: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no changes)", () => {
    const result = UpdateClientSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("validates fields when provided", () => {
    const result = UpdateClientSchema.safeParse({ email: "not-email" });
    expect(result.success).toBe(false);
  });
});

describe("FamilyLinkSchema", () => {
  it("accepts valid family link", () => {
    const result = FamilyLinkSchema.safeParse({
      relatedClientId: "550e8400-e29b-41d4-a716-446655440000",
      relationshipType: "spouse",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID relatedClientId", () => {
    const result = FamilyLinkSchema.safeParse({
      relatedClientId: "not-a-uuid",
      relationshipType: "spouse",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid relationship type", () => {
    const result = FamilyLinkSchema.safeParse({
      relatedClientId: "550e8400-e29b-41d4-a716-446655440000",
      relationshipType: "friend",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid relationship types", () => {
    const types = [
      "spouse",
      "child",
      "parent",
      "sibling",
      "grandparent",
      "grandchild",
      "in_law",
      "uncle_aunt",
      "nephew_niece",
      "cousin",
      "other",
    ];

    for (const type of types) {
      const result = FamilyLinkSchema.safeParse({
        relatedClientId: "550e8400-e29b-41d4-a716-446655440000",
        relationshipType: type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts optional notes and label", () => {
    const result = FamilyLinkSchema.safeParse({
      relatedClientId: "550e8400-e29b-41d4-a716-446655440000",
      relationshipType: "parent",
      relationshipLabel: "Father",
      notes: "Primary guardian",
    });
    expect(result.success).toBe(true);
  });

  it("rejects notes exceeding 1000 chars", () => {
    const result = FamilyLinkSchema.safeParse({
      relatedClientId: "550e8400-e29b-41d4-a716-446655440000",
      relationshipType: "other",
      notes: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe("BirthDetailsSchema", () => {
  it("accepts HH:MM format", () => {
    const result = BirthDetailsSchema.safeParse({ birthTime: "14:30" });
    expect(result.success).toBe(true);
  });

  it("accepts HH:MM:SS format", () => {
    const result = BirthDetailsSchema.safeParse({ birthTime: "14:30:45" });
    expect(result.success).toBe(true);
  });

  it("accepts YYYY-MM-DD date format", () => {
    const result = BirthDetailsSchema.safeParse({ birthDate: "1990-05-15" });
    expect(result.success).toBe(true);
  });

  it("defaults birthTimeKnown to true", () => {
    const result = BirthDetailsSchema.parse({});
    expect(result.birthTimeKnown).toBe(true);
  });

  it("defaults birthTimeAccuracy to exact", () => {
    const result = BirthDetailsSchema.parse({});
    expect(result.birthTimeAccuracy).toBe("exact");
  });
});
