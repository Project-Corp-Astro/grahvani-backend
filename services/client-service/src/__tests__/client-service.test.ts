import { jest } from "@jest/globals";
import { prismaMock } from "./setup";
import { ClientService, RequestMetadata } from "../services/client.service";
import { ClientNotFoundError, DuplicateClientError } from "../errors/client.errors";

// Mock chart service to prevent side effects
jest.mock("../services/chart.service", () => ({
  chartService: {
    ensureFullVedicProfile: jest.fn(),
    generateFullVedicProfile: (jest.fn() as any).mockResolvedValue(undefined),
  },
  generationLocks: new Set(),
  abortedClients: new Set(),
}));

const clientService = new ClientService();

const tenantId = "tenant-123";
const metadata: RequestMetadata = {
  userId: "user-456",
  ipAddress: "127.0.0.1",
  userAgent: "Jest/Test",
  deviceType: "desktop",
};

const mockClient = {
  id: "client-1",
  tenantId,
  fullName: "Arjun Sharma",
  email: "arjun@test.com",
  phonePrimary: "+919876543210",
  clientCode: "CL-123-001",
  birthDate: new Date("1990-05-15"),
  birthTime: new Date("1990-05-15T08:30:00Z"),
  birthPlace: "Mumbai",
  birthLatitude: 19.076,
  birthLongitude: 72.8777,
  birthTimezone: "Asia/Kolkata",
  birthTimeKnown: true,
  birthTimeAccuracy: "exact",
  gender: "male",
  maritalStatus: null,
  occupation: null,
  createdBy: "user-456",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  generationStatus: "completed",
  notes: [],
  remedies: [],
  consultations: [],
  familyLinksFrom: [],
  familyLinksTo: [],
} as any;

// Re-apply chart service mocks after each clearAllMocks
beforeEach(() => {
  const { chartService } = require("../services/chart.service");
  chartService.ensureFullVedicProfile = jest.fn();
  chartService.generateFullVedicProfile = (jest.fn() as any).mockResolvedValue(undefined);
});

describe("ClientService", () => {
  describe("getAllClients", () => {
    it("returns paginated results with defaults", async () => {
      (prismaMock.client.findMany as any).mockResolvedValue([mockClient]);
      (prismaMock.client.count as any).mockResolvedValue(1);

      const result = await clientService.getAllClients(tenantId, {});

      expect(result.clients).toHaveLength(1);
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it("respects page and limit params", async () => {
      (prismaMock.client.findMany as any).mockResolvedValue([]);
      (prismaMock.client.count as any).mockResolvedValue(50);

      const result = await clientService.getAllClients(tenantId, {
        page: "3",
        limit: "10",
      });

      expect(result.pagination).toEqual({
        total: 50,
        page: 3,
        limit: 10,
        totalPages: 5,
      });
    });

    it("handles search term", async () => {
      (prismaMock.client.findMany as any).mockResolvedValue([]);
      (prismaMock.client.count as any).mockResolvedValue(0);

      await clientService.getAllClients(tenantId, { search: "arjun" });

      expect(prismaMock.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            OR: expect.arrayContaining([
              expect.objectContaining({
                fullName: { contains: "arjun", mode: "insensitive" },
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe("getClient", () => {
    it("returns client when found", async () => {
      (prismaMock.client.findFirst as any).mockResolvedValue(mockClient);

      const result = await clientService.getClient(tenantId, "client-1");

      expect(result).toEqual(mockClient);
    });

    it("throws ClientNotFoundError when client does not exist", async () => {
      (prismaMock.client.findFirst as any).mockResolvedValue(null);

      await expect(
        clientService.getClient(tenantId, "nonexistent"),
      ).rejects.toThrow(ClientNotFoundError);
    });

    it("triggers chart audit when metadata and birthDate present", async () => {
      (prismaMock.client.findFirst as any).mockResolvedValue(mockClient);
      const { chartService } = require("../services/chart.service");

      await clientService.getClient(tenantId, "client-1", metadata);

      expect(chartService.ensureFullVedicProfile).toHaveBeenCalledWith(
        tenantId,
        "client-1",
        metadata,
      );
    });
  });

  describe("createClient", () => {
    const validData = {
      fullName: "Priya Patel",
      email: "priya@test.com",
      phonePrimary: "+919876543211",
      birthDate: "1995-03-20",
      birthTime: "14:30:00",
      birthPlace: "Delhi",
      birthLatitude: 28.6139,
      birthLongitude: 77.209,
      birthTimezone: "Asia/Kolkata",
    };

    it("creates a client successfully", async () => {
      (prismaMock.client.findFirst as any).mockResolvedValue(null); // No duplicate
      (prismaMock.client.create as any).mockResolvedValue({
        ...mockClient,
        id: "client-2",
        ...validData,
      });

      const result = await clientService.createClient(
        tenantId,
        validData,
        metadata,
      );

      expect(result).toBeDefined();
      expect(prismaMock.client.create).toHaveBeenCalled();
    });

    it("throws DuplicateClientError on email collision", async () => {
      (prismaMock.client.findFirst as any).mockResolvedValue({
        ...mockClient,
        email: validData.email,
      });

      await expect(
        clientService.createClient(tenantId, validData, metadata),
      ).rejects.toThrow(DuplicateClientError);
    });

    it("generates a client code", async () => {
      (prismaMock.client.findFirst as any).mockResolvedValue(null);
      (prismaMock.client.create as any).mockImplementation(
        async ({ data }: any) => ({
          ...mockClient,
          ...data,
        }),
      );

      await clientService.createClient(tenantId, validData, metadata);

      const createCall = (prismaMock.client.create as any).mock.calls[0][0];
      expect(createCall.data.clientCode).toMatch(/^CL-\d+-\d{3}$/);
    });

    it("records activity and publishes event", async () => {
      (prismaMock.client.findFirst as any).mockResolvedValue(null);
      (prismaMock.client.create as any).mockResolvedValue(mockClient);

      const { activityService } = require("../services/activity.service");
      const { eventPublisher } = require("../services/event.publisher");

      await clientService.createClient(tenantId, validData, metadata);

      expect(activityService.recordActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          action: "client.created",
          userId: metadata.userId,
        }),
      );
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        "client.created",
        expect.objectContaining({ clientId: mockClient.id, tenantId }),
      );
    });

    it("skips chart generation when generateInitialChart is false", async () => {
      (prismaMock.client.findFirst as any).mockResolvedValue(null);
      (prismaMock.client.create as any).mockResolvedValue(mockClient);

      const { chartService } = require("../services/chart.service");

      await clientService.createClient(
        tenantId,
        { ...validData, generateInitialChart: false },
        metadata,
      );

      expect(chartService.generateFullVedicProfile).not.toHaveBeenCalled();
    });

    it("rejects invalid data (missing fullName)", async () => {
      await expect(
        clientService.createClient(tenantId, { email: "test@test.com" }, metadata),
      ).rejects.toThrow();
    });
  });

  describe("updateClient", () => {
    it("updates client successfully", async () => {
      (prismaMock.client.findFirst as any).mockResolvedValue(mockClient);
      (prismaMock.client.update as any).mockResolvedValue({
        ...mockClient,
        fullName: "Updated Name",
      });

      const result = await clientService.updateClient(
        tenantId,
        "client-1",
        { fullName: "Updated Name" },
        metadata,
      );

      expect(result.fullName).toBe("Updated Name");
    });

    it("throws ClientNotFoundError for nonexistent client", async () => {
      (prismaMock.client.findFirst as any).mockResolvedValue(null);

      await expect(
        clientService.updateClient(
          tenantId,
          "nonexistent",
          { fullName: "X" },
          metadata,
        ),
      ).rejects.toThrow(ClientNotFoundError);
    });
  });

  describe("deleteClient", () => {
    it("deletes client successfully", async () => {
      (prismaMock.client.findFirst as any).mockResolvedValue(mockClient);
      (prismaMock.client.update as any).mockResolvedValue(mockClient);
      (prismaMock.client.delete as any).mockResolvedValue(mockClient);
      (prismaMock.$transaction as any).mockImplementation(async (fn: any) => {
        return fn({
          $executeRawUnsafe: jest.fn(),
          client: { delete: jest.fn() },
        });
      });

      const result = await clientService.deleteClient(
        tenantId,
        "client-1",
        metadata,
      );

      expect(result).toEqual({ success: true });
    });

    it("throws ClientNotFoundError when client does not exist", async () => {
      (prismaMock.client.findFirst as any).mockResolvedValue(null);

      await expect(
        clientService.deleteClient(tenantId, "nonexistent", metadata),
      ).rejects.toThrow(ClientNotFoundError);
    });
  });
});
