import {
  LayoutDashboard,
  Users,
  Building2,
  TrendingUp,
  CheckSquare,
  Activity,
  MessageSquare,
  MessageCircle,
  Phone,
  Ban,
  Upload,
  Settings,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { useGetIdentity } from "ra-core";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  end?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard, end: true },
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Carriers", to: "/carriers", icon: Building2 },
  { label: "Pipeline", to: "/pipeline", icon: TrendingUp },
  { label: "Follow-Ups", to: "/follow_ups", icon: CheckSquare },
  { label: "Activity Log", to: "/contact_logs", icon: Activity },
];

const TOOLS_NAV: NavItem[] = [
  { label: "SMS Campaigns", to: "/sms", icon: MessageSquare },
  { label: "Reply Analyzer", to: "/replies", icon: MessageCircle },
  { label: "Call Scripts", to: "/scripts", icon: Phone },
  { label: "Stop List", to: "/stop-list", icon: Ban },
  { label: "Import Data", to: "/import", icon: Upload },
];

function NavMenuItem({ item }: { item: NavItem }) {
  const { pathname } = useLocation();
  const { openMobile, setOpenMobile } = useSidebar();

  const isActive = item.end
    ? pathname === item.to
    : pathname.startsWith(item.to);

  const handleClick = () => {
    if (openMobile) setOpenMobile(false);
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link to={item.to} onClick={handleClick}>
          <item.icon />
          {item.label}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function Divider() {
  return (
    <div
      className="mx-3 my-1"
      style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
    />
  );
}

export function AppSidebar() {
  const { identity } = useGetIdentity();

  const id = identity as { fullName?: string; email?: string } | undefined;
  const name: string = id?.fullName ?? id?.email ?? "Agent";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5 h-auto"
            >
              <Link to="/" className="flex flex-col items-start gap-0 py-2">
                <span
                  className="text-base font-bold leading-tight tracking-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  ALPHA
                </span>
                <span className="text-[9px] font-normal tracking-widest opacity-60 uppercase group-data-[collapsible=icon]:hidden">
                  Insurance Agency
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN_NAV.map((item) => (
                <NavMenuItem key={item.to} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Divider />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {TOOLS_NAV.map((item) => (
                <NavMenuItem key={item.to} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Divider />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavMenuItem
                item={{ label: "Settings", to: "/settings", icon: Settings }}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:justify-center">
          <div
            className="size-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 text-white"
            style={{ background: "#7B1C2A" }}
          >
            {initials || "A"}
          </div>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-medium truncate leading-tight">
              {name}
            </span>
            <span
              className="text-[10px] opacity-50 leading-tight"
              style={{ color: "var(--sidebar-foreground)" }}
            >
              signed in
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

