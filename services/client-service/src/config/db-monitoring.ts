/**
 * Database Health & Monitoring Service
 *
 * Tracks:
 * - Connection pool health
 * - Query performance
 * - Error rates
 * - Circuit breaker status
 * - Resource utilization
 *
 * For Supabase PRO plan with enterprise monitoring
 */

import { logger } from "./logger";
import { getDBMetrics, performHealthCheck } from "./db-pro";

export interface MonitoringAlert {
  level: "info" | "warning" | "critical";
  metric: string;
  current: number;
  threshold: number;
  message: string;
  timestamp: Date;
}

export class DatabaseMonitoring {
  private alerts: MonitoringAlert[] = [];
  private maxAlertsHistory = 1000;

  /**
   * Thresholds for alerting
   */
  private thresholds = {
    avgQueryTime: 5000, // 5 seconds
    maxQueryTime: 30000, // 30 seconds
    errorRate: 0.05, // 5%
    connectionErrors: 10, // More than 10 errors
    queryErrors: 50, // More than 50 errors
    lowHitRate: 0.3, // Hit rate below 30%
  };

  /**
   * Run comprehensive monitoring check
   */
  async runMonitoringCheck(): Promise<void> {
    try {
      const metrics = getDBMetrics();
      const health = await performHealthCheck();

      logger.info(
        {
          metrics,
          health,
          alerts: this.alerts.slice(-10),
        },
        "📊 Database monitoring check",
      );

      // Check various conditions
      this.checkQueryPerformance(metrics);
      this.checkErrorRates(metrics);
      this.checkCacheHitRate(metrics);
      this.checkCircuitBreaker(metrics);
      this.checkHealthStatus(health);

      // Log alerts
      if (this.alerts.length > 0) {
        const lastAlert = this.alerts[this.alerts.length - 1];
        logger.warn(
          {
            alert: lastAlert,
            totalAlerts: this.alerts.length,
          },
          "🚨 Database alert",
        );
      }
    } catch (error) {
      logger.error({ error }, "❌ Monitoring check failed");
    }
  }

  /**
   * Check query performance
   */
  private checkQueryPerformance(metrics: any): void {
    if (metrics.averageQueryTime > this.thresholds.avgQueryTime) {
      this.addAlert({
        level: "warning",
        metric: "averageQueryTime",
        current: metrics.averageQueryTime,
        threshold: this.thresholds.avgQueryTime,
        message: `Average query time ${metrics.averageQueryTime}ms exceeds threshold`,
      });
    }

    if (metrics.maxQueryTime > this.thresholds.maxQueryTime) {
      this.addAlert({
        level: "critical",
        metric: "maxQueryTime",
        current: metrics.maxQueryTime,
        threshold: this.thresholds.maxQueryTime,
        message: `Max query time ${metrics.maxQueryTime}ms exceeds threshold`,
      });
    }
  }

  /**
   * Check error rates
   */
  private checkErrorRates(metrics: any): void {
    const errorRate = metrics.queryErrors / (metrics.queryErrors + 100); // Estimate total queries

    if (errorRate > this.thresholds.errorRate) {
      this.addAlert({
        level: "warning",
        metric: "errorRate",
        current: errorRate * 100,
        threshold: this.thresholds.errorRate * 100,
        message: `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold`,
      });
    }

    if (metrics.connectionErrors > this.thresholds.connectionErrors) {
      this.addAlert({
        level: "critical",
        metric: "connectionErrors",
        current: metrics.connectionErrors,
        threshold: this.thresholds.connectionErrors,
        message: `Connection errors ${metrics.connectionErrors} exceeds threshold`,
      });
    }

    if (metrics.queryErrors > this.thresholds.queryErrors) {
      this.addAlert({
        level: "warning",
        metric: "queryErrors",
        current: metrics.queryErrors,
        threshold: this.thresholds.queryErrors,
        message: `Query errors ${metrics.queryErrors} exceeds threshold`,
      });
    }
  }

  /**
   * Check cache hit rate
   */
  private checkCacheHitRate(metrics: any): void {
    if (metrics.hitRate < this.thresholds.lowHitRate) {
      this.addAlert({
        level: "info",
        metric: "hitRate",
        current: metrics.hitRate * 100,
        threshold: this.thresholds.lowHitRate * 100,
        message: `Cache hit rate ${(metrics.hitRate * 100).toFixed(2)}% is below optimal`,
      });
    }
  }

  /**
   * Check circuit breaker status
   */
  private checkCircuitBreaker(metrics: any): void {
    if (metrics.circuitBreakerState === "open") {
      this.addAlert({
        level: "critical",
        metric: "circuitBreakerState",
        current: 1,
        threshold: 0,
        message: "Circuit breaker is OPEN - database may be unavailable",
      });
    } else if (metrics.circuitBreakerState === "half-open") {
      this.addAlert({
        level: "warning",
        metric: "circuitBreakerState",
        current: 0.5,
        threshold: 0,
        message: "Circuit breaker is HALF-OPEN - recovering from failure",
      });
    }
  }

  /**
   * Check health status
   */
  private checkHealthStatus(health: any): void {
    if (health.status === "unhealthy") {
      this.addAlert({
        level: "critical",
        metric: "healthStatus",
        current: 0,
        threshold: 1,
        message: "Database health check failed - connection may be lost",
      });
    } else if (health.status === "degraded") {
      this.addAlert({
        level: "warning",
        metric: "healthStatus",
        current: 0.5,
        threshold: 1,
        message: "Database is degraded - performance may be impacted",
      });
    }
  }

  /**
   * Add alert to history
   */
  private addAlert(alert: Omit<MonitoringAlert, "timestamp">): void {
    const fullAlert: MonitoringAlert = {
      ...alert,
      timestamp: new Date(),
    };

    this.alerts.push(fullAlert);

    // Maintain history size
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts = this.alerts.slice(-this.maxAlertsHistory);
    }
  }

  /**
   * Get current alerts
   */
  getAlerts(level?: "info" | "warning" | "critical"): MonitoringAlert[] {
    if (!level) return this.alerts;
    return this.alerts.filter((a) => a.level === level);
  }

  /**
   * Get alerts summary
   */
  getAlertsSummary() {
    return {
      total: this.alerts.length,
      critical: this.alerts.filter((a) => a.level === "critical").length,
      warning: this.alerts.filter((a) => a.level === "warning").length,
      info: this.alerts.filter((a) => a.level === "info").length,
      recent: this.alerts.slice(-10),
    };
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(ageMs: number = 86400000): void {
    const cutoffTime = Date.now() - ageMs;
    const beforeCount = this.alerts.length;
    this.alerts = this.alerts.filter((a) => a.timestamp.getTime() > cutoffTime);
    const cleared = beforeCount - this.alerts.length;
    logger.info(
      { cleared, remaining: this.alerts.length },
      "🧹 Cleared old alerts",
    );
  }
}

// Singleton instance
let monitoringInstance: DatabaseMonitoring | null = null;

export const getMonitoring = (): DatabaseMonitoring => {
  if (!monitoringInstance) {
    monitoringInstance = new DatabaseMonitoring();
  }
  return monitoringInstance;
};

/**
 * Start monitoring service
 * Runs health checks every 30 seconds
 */
export const startMonitoringService = (): NodeJS.Timer => {
  const monitoring = getMonitoring();

  logger.info("🚀 Starting database monitoring service...");

  // Run check immediately
  monitoring.runMonitoringCheck().catch((error) => {
    logger.error({ error }, "❌ Initial monitoring check failed");
  });

  // Run periodic checks (every 30 seconds)
  const interval = setInterval(() => {
    monitoring.runMonitoringCheck().catch((error) => {
      logger.error({ error }, "❌ Periodic monitoring check failed");
    });
  }, 30000);

  logger.info("✅ Database monitoring service started");

  return interval;
};

/**
 * Stop monitoring service
 */
export const stopMonitoringService = (interval: NodeJS.Timer): void => {
  clearInterval(interval as any);
  logger.info("🛑 Database monitoring service stopped");
};
