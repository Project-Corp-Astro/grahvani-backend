// Navigation Service — Clean sidebar config
import { getPrismaClient } from "../config/database";
import { logger } from "../config/logger";
import { engineHealthService } from "./engine-health.service";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: number;
  badgeVariant?: "danger" | "warning" | "info";
  children?: NavItem[];
  section?: string;
}

// Clean navigation structure - sections are groups, not headers
const BASE_NAV: NavItem[] = [
  // Dashboard - No section (appears at top)
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
  },
  
  // MONETIZATION section
  {
    id: "subscriptions",
    label: "Subscriptions",
    href: "/dashboard/subscriptions",
    icon: "CreditCard",
    section: "monetization",
    children: [
      { 
        id: "subscriptions-overview", 
        label: "Overview", 
        href: "/dashboard/subscriptions", 
        icon: "LayoutDashboard" 
      },
      { 
        id: "subscriptions-plans", 
        label: "Plans", 
        href: "/dashboard/subscriptions/plans", 
        icon: "Layers" 
      },
      { 
        id: "subscriptions-list", 
        label: "All Subscribers", 
        href: "/dashboard/subscriptions/list", 
        icon: "List" 
      },
    ],
  },
  
  // INSIGHTS section
  {
    id: "analytics",
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: "BarChart3",
    section: "insights",
  },
  {
    id: "engine",
    label: "Engine Monitor",
    href: "/dashboard/engine",
    icon: "Cpu",
    section: "insights",
  },
  
  // MANAGEMENT section
  {
    id: "content",
    label: "Content",
    href: "/dashboard/content",
    icon: "FileText",
    section: "management",
  },
  {
    id: "announcements",
    label: "Announcements",
    href: "/dashboard/announcements",
    icon: "Megaphone",
    section: "management",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    icon: "Settings",
    section: "management",
  },
  {
    id: "support",
    label: "Support",
    href: "/dashboard/support",
    icon: "LifeBuoy",
    section: "management",
  },
  
  // OPERATIONS section
  {
    id: "users",
    label: "Astrologers",
    href: "/dashboard/users",
    icon: "Users",
    section: "operations",
  },
  {
    id: "clients",
    label: "Clients",
    href: "/dashboard/clients",
    icon: "Shield",
    section: "operations",
  },
  {
    id: "admins",
    label: "Admin Team",
    href: "/dashboard/admins",
    icon: "UserCheck",
    section: "operations",
  },
  {
    id: "audit-log",
    label: "Audit Log",
    href: "/dashboard/audit-log",
    icon: "ScrollText",
    section: "operations",
  },
  {
    id: "profile",
    label: "My Profile",
    href: "/dashboard/profile",
    icon: "UserCircle",
    section: "operations",
  },
];

export class NavigationService {
  async getNavigation(): Promise<NavItem[]> {
    const prisma = getPrismaClient();

    // Get live badge counts
    let openTickets = 0;
    let pendingVerifications = 0;
    let offlineServices = 0;

    try {
      const [tickets, pending, health] = await Promise.all([
        prisma.supportTicket.count({ where: { status: { in: ["open", "in_progress"] } } }),
        (prisma as any).user?.count({ where: { status: "pending_verification" } }).catch(() => 0) ?? 0,
        engineHealthService.getHealth().catch(() => null),
      ]);
      
      openTickets = tickets;
      pendingVerifications = pending;
      
      if (health) {
        offlineServices = health.statistics.offline;
      }
    } catch (err) {
      logger.warn({ err }, "Could not fetch badge counts for navigation");
    }

    return BASE_NAV.map((item) => {
      if (item.id === "support" && openTickets > 0) {
        return { ...item, badge: openTickets, badgeVariant: "danger" as const };
      }
      if (item.id === "users" && pendingVerifications > 0) {
        return { ...item, badge: pendingVerifications, badgeVariant: "warning" as const };
      }
      if (item.id === "engine" && offlineServices > 0) {
        return { ...item, badge: offlineServices, badgeVariant: "danger" as const };
      }
      return item;
    });
  }
}

export const navigationService = new NavigationService();
