// Engine Health Service — Production-grade monitoring with history & analytics
import { config } from "../config";
import { logger } from "../config/logger";
import { getPrismaClient } from "../config/database";

// Types
export interface ServiceHealth {
  name: string;
  status: "online" | "offline" | "degraded";
  latencyMs: number;
  url: string;
  lastChecked: string;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  version?: string;
  uptime?: number;
  uptimeFormatted?: string;
  error?: string;
  consecutiveFailures: number;
  availability24h: number; // percentage
}

export interface DatabaseMetrics {
  status: "connected" | "disconnected" | "slow";
  latencyMs: number;
  queryCount?: number;
  slowQueries?: number;
}

export interface HealthAlert {
  id: string;
  service: string;
  severity: "critical" | "warning" | "info";
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface ServiceHistory {
  latencies: number[];
  firstSeenOnline: Date | null;
  lastStatus: "online" | "offline" | "degraded";
  consecutiveFailures: number;
  statusChanges: { status: string; timestamp: Date }[];
  alerts: HealthAlert[];
}

export interface HealthSnapshot {
  timestamp: string;
  services: ServiceHealth[];
  statistics: {
    total: number;
    online: number;
    degraded: number;
    offline: number;
    avgResponseTime: number;
    uptimePercentage: number;
  };
}

// Constants
const MAX_HISTORY = 100; // Keep last 100 latency readings
const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const SLOW_THRESHOLD = 500; // ms
const DEGRADED_THRESHOLD = 2000; // ms

// In-memory storage (in production, use Redis or time-series DB)
const serviceHistory: Map<string, ServiceHistory> = new Map();
const healthSnapshots: HealthSnapshot[] = [];
const MAX_SNAPSHOTS = 288; // 24 hours of 5-minute snapshots

// Initialize history for a service
function getOrCreateHistory(serviceName: string): ServiceHistory {
  if (!serviceHistory.has(serviceName)) {
    serviceHistory.set(serviceName, {
      latencies: [],
      firstSeenOnline: null,
      lastStatus: "offline",
      consecutiveFailures: 0,
      statusChanges: [],
      alerts: [],
    });
  }
  return serviceHistory.get(serviceName)!;
}

// Format uptime helper
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "Just started";
}

// Calculate availability over last 24h
function calculateAvailability(history: ServiceHistory): number {
  const changes = history.statusChanges;
  if (changes.length === 0) return 100;
  
  const now = Date.now();
  const windowStart = now - HISTORY_WINDOW_MS;
  
  let onlineTime = 0;
  let lastStatus = "offline";
  let lastTime = Math.max(windowStart, changes[0]?.timestamp.getTime() || windowStart);
  
  for (const change of changes) {
    const changeTime = change.timestamp.getTime();
    if (changeTime < windowStart) continue;
    
    if (lastStatus === "online") {
      onlineTime += changeTime - lastTime;
    }
    lastStatus = change.status;
    lastTime = changeTime;
  }
  
  // Add time from last change to now
  if (lastStatus === "online") {
    onlineTime += now - lastTime;
  }
  
  const totalWindow = Math.min(now - windowStart, HISTORY_WINDOW_MS);
  return Math.round((onlineTime / totalWindow) * 100);
}

// Add alert
function addAlert(serviceName: string, severity: HealthAlert["severity"], message: string) {
  const history = getOrCreateHistory(serviceName);
  const alert: HealthAlert = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    service: serviceName,
    severity,
    message,
    timestamp: new Date().toISOString(),
    resolved: false,
  };
  history.alerts.unshift(alert);
  // Keep only last 50 alerts
  if (history.alerts.length > 50) history.alerts.pop();
}

// Resolve alerts when service recovers
function resolveAlerts(serviceName: string) {
  const history = getOrCreateHistory(serviceName);
  history.alerts.forEach(alert => {
    if (!alert.resolved) alert.resolved = true;
  });
}

async function pingService(name: string, url: string, path = "/health"): Promise<ServiceHealth> {
  const start = Date.now();
  const history = getOrCreateHistory(name);
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${url}${path}`, {
      method: "GET",
      signal: controller.signal,
      headers: { "Accept": "application/json" },
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - start;
    let status: "online" | "offline" | "degraded" = res.ok ? "online" : "degraded";
    
    // Performance thresholds
    if (latencyMs > DEGRADED_THRESHOLD) status = "degraded";
    else if (latencyMs > SLOW_THRESHOLD && status === "online") {
      // Still online but slow - could add warning
    }

    // Parse response
    let version: string | undefined;
    try {
      const data = await res.json();
      version = data.version || data.data?.version || data.service?.version;
    } catch {
      // Ignore parsing errors
    }

    // Update history
    history.latencies.push(latencyMs);
    if (history.latencies.length > MAX_HISTORY) history.latencies.shift();
    
    // Track status changes
    if (status !== history.lastStatus) {
      history.statusChanges.push({ status, timestamp: new Date() });
      // Keep only last 100 changes
      if (history.statusChanges.length > 100) history.statusChanges.shift();
      
      // Add alert on status change to degraded/offline
      if (status === "offline" && history.lastStatus !== "offline") {
        addAlert(name, "critical", `Service went offline (${latencyMs}ms timeout)`);
        history.consecutiveFailures++;
      } else if (status === "degraded" && history.lastStatus === "online") {
        addAlert(name, "warning", `Service degraded - high latency (${latencyMs}ms)`);
      } else if (status === "online" && (history.lastStatus === "offline" || history.lastStatus === "degraded")) {
        addAlert(name, "info", `Service recovered (${latencyMs}ms)`);
        resolveAlerts(name);
        history.consecutiveFailures = 0;
      }
    }
    
    // Reset failures on success
    if (status === "online") {
      history.consecutiveFailures = 0;
      if (!history.firstSeenOnline) {
        history.firstSeenOnline = new Date();
      }
    }
    
    history.lastStatus = status;

    const uptime = history.firstSeenOnline 
      ? Math.floor((Date.now() - history.firstSeenOnline.getTime()) / 1000)
      : undefined;

    return {
      name,
      status,
      latencyMs,
      url,
      lastChecked: new Date().toISOString(),
      avgLatencyMs: Math.round(history.latencies.reduce((a, b) => a + b, 0) / history.latencies.length) || latencyMs,
      minLatencyMs: Math.min(...history.latencies) || latencyMs,
      maxLatencyMs: Math.max(...history.latencies) || latencyMs,
      version,
      uptime,
      uptimeFormatted: uptime ? formatUptime(uptime) : undefined,
      consecutiveFailures: history.consecutiveFailures,
      availability24h: calculateAvailability(history),
    };
  } catch (error: any) {
    const latencyMs = Date.now() - start;
    history.latencies.push(latencyMs);
    if (history.latencies.length > MAX_HISTORY) history.latencies.shift();
    
    history.consecutiveFailures++;
    history.lastStatus = "offline";
    
    // Add alert on failure
    if (history.consecutiveFailures === 1) {
      addAlert(name, "critical", `Connection failed: ${error.name === "AbortError" ? "Timeout" : error.message}`);
    }

    return {
      name,
      status: "offline",
      latencyMs,
      url,
      lastChecked: new Date().toISOString(),
      avgLatencyMs: Math.round(history.latencies.reduce((a, b) => a + b, 0) / history.latencies.length) || latencyMs,
      minLatencyMs: Math.min(...history.latencies) || latencyMs,
      maxLatencyMs: Math.max(...history.latencies) || latencyMs,
      error: error.name === "AbortError" ? "Connection timeout (>5s)" : error.message,
      consecutiveFailures: history.consecutiveFailures,
      availability24h: calculateAvailability(history),
    };
  }
}

async function checkDatabaseHealth(): Promise<DatabaseMetrics> {
  const start = Date.now();
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1 as health`;
    const latencyMs = Date.now() - start;

    // Try to get query stats (PostgreSQL specific)
    let queryCount = 0;
    let slowQueries = 0;
    try {
      const result = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE query_start < NOW() - INTERVAL '1 second') as slow
        FROM pg_stat_activity 
        WHERE state = 'active'
      ` as any;
      queryCount = parseInt(result[0]?.total) || 0;
      slowQueries = parseInt(result[0]?.slow) || 0;
    } catch {
      // Ignore if stats not available
    }

    return {
      status: latencyMs > 1000 ? "slow" : "connected",
      latencyMs,
      queryCount,
      slowQueries,
    };
  } catch (error: any) {
    return {
      status: "disconnected",
      latencyMs: Date.now() - start,
    };
  }
}

export class EngineHealthService {
  async getHealth() {
    const services = config.services;
    
    // Check all services
    const serviceChecks = await Promise.all([
      pingService("API Gateway", services.gateway, "/health"),
      pingService("Auth Service", services.auth),
      pingService("User Service", services.user),
      pingService("Client Service", services.client),
      pingService("Media Service", services.media),
      pingService("Astro Engine (Proxy)", services.astroProxy),
      pingService("Astro Engine (Core)", services.astroCore, "/ping"),
    ]);

    // Check database
    const dbHealth = await checkDatabaseHealth();

    // Calculate statistics
    const onlineCount = serviceChecks.filter((s) => s.status === "online").length;
    const degradedCount = serviceChecks.filter((s) => s.status === "degraded").length;
    const offlineCount = serviceChecks.filter((s) => s.status === "offline").length;
    const totalServices = serviceChecks.length;

    // Determine overall status
    let overallStatus: "healthy" | "degraded" | "critical";
    if (offlineCount === 0 && degradedCount === 0 && dbHealth.status === "connected") {
      overallStatus = "healthy";
    } else if (offlineCount > totalServices / 2 || dbHealth.status === "disconnected") {
      overallStatus = "critical";
    } else {
      overallStatus = "degraded";
    }

    const avgResponseTime = Math.round(
      serviceChecks.reduce((sum, s) => sum + s.latencyMs, 0) / totalServices
    );

    const result = {
      overallStatus,
      timestamp: new Date().toISOString(),
      services: serviceChecks,
      database: dbHealth,
      statistics: {
        total: totalServices,
        online: onlineCount,
        degraded: degradedCount,
        offline: offlineCount,
        avgResponseTime,
        uptimePercentage: Math.round((onlineCount / totalServices) * 100),
      },
    };

    // Store snapshot for historical data
    healthSnapshots.push(result);
    if (healthSnapshots.length > MAX_SNAPSHOTS) healthSnapshots.shift();

    return result;
  }

  // Get historical data for charts
  async getHistory(hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return healthSnapshots.filter(s => new Date(s.timestamp).getTime() > cutoff);
  }

  // Get all alerts across all services
  async getAlerts(includeResolved = false) {
    const allAlerts: HealthAlert[] = [];
    serviceHistory.forEach((history, serviceName) => {
      const alerts = includeResolved 
        ? history.alerts 
        : history.alerts.filter(a => !a.resolved);
      allAlerts.push(...alerts);
    });
    return allAlerts.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Get detailed history for a specific service
  async getServiceDetails(serviceName: string) {
    const history = getOrCreateHistory(serviceName);
    return {
      name: serviceName,
      latencyHistory: history.latencies,
      statusHistory: history.statusChanges.slice(-20),
      alerts: history.alerts,
      availability24h: calculateAvailability(history),
    };
  }

  // Test a service endpoint
  async testEndpoint(serviceName: string) {
    const services = config.services as Record<string, string>;
    const serviceMap: Record<string, { url: string; path: string }> = {
      "API Gateway": { url: services.gateway, path: "/health" },
      "Auth Service": { url: services.auth, path: "/health" },
      "User Service": { url: services.user, path: "/health" },
      "Client Service": { url: services.client, path: "/health" },
      "Media Service": { url: services.media, path: "/health" },
      "Astro Engine (Proxy)": { url: services.astroProxy, path: "/health" },
      "Astro Engine (Core)": { url: services.astroCore, path: "/ping" },
    };

    const svc = serviceMap[serviceName];
    if (!svc) throw new Error("Unknown service");

    const start = Date.now();
    try {
      const res = await fetch(`${svc.url}${svc.path}`, { 
        method: "GET",
        signal: AbortSignal.timeout(10000) // 10s timeout for manual test
      });
      const latency = Date.now() - start;
      const body = await res.text();
      
      return {
        success: res.ok,
        statusCode: res.status,
        latencyMs: latency,
        headers: Object.fromEntries(res.headers.entries()),
        bodyPreview: body.slice(0, 500), // First 500 chars
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        latencyMs: Date.now() - start,
      };
    }
  }
}

export const engineHealthService = new EngineHealthService();
