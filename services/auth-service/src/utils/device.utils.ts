export class DeviceUtils {
  /**
   * Detect device type from user agent string
   */
  static detectDeviceType(userAgent: string): string {
    if (/mobile/i.test(userAgent)) return "mobile";
    if (/tablet/i.test(userAgent)) return "tablet";
    if (/iPad/i.test(userAgent)) return "tablet";
    if (/iPhone/i.test(userAgent)) return "mobile";
    if (/Android/i.test(userAgent) && !/mobile/i.test(userAgent))
      return "tablet";
    return "desktop";
  }

  /**
   * Generate a human-readable device name from user agent
   */
  static generateDeviceName(userAgent: string): string {
    if (!userAgent || userAgent === "unknown") return "Unknown Device";

    let browser = "Unknown Browser";
    let os = "Unknown OS";

    // Browser Detection
    if (/Chrome/i.test(userAgent)) browser = "Chrome";
    else if (/Firefox/i.test(userAgent)) browser = "Firefox";
    else if (/Safari/i.test(userAgent)) browser = "Safari";
    else if (/Edge/i.test(userAgent)) browser = "Edge";
    else if (/Opera|OPR/i.test(userAgent)) browser = "Opera";

    // OS Detection
    if (/Windows/i.test(userAgent)) os = "Windows";
    else if (/Mac/i.test(userAgent)) os = "macOS";
    else if (/Linux/i.test(userAgent)) os = "Linux";
    else if (/Android/i.test(userAgent)) os = "Android";
    else if (/iPhone|iPad/i.test(userAgent)) os = "iOS";

    return `${browser} on ${os}`;
  }
}
