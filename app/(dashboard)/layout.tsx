"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  GitBranch,
  Mail,
  MessageCircle,
  Sparkles,
  Settings,
  CreditCard,
  Zap,
  LogOut,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Workflows", href: "/dashboard/workflows", icon: GitBranch },
  { name: "Email", href: "/dashboard/email", icon: Mail },
  { name: "WhatsApp", href: "/dashboard/whatsapp", icon: MessageCircle },
  { name: "AI Assistant", href: "/dashboard/ai", icon: Sparkles },
];

const bottomNavItems = [
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [orgName, setOrgName] = useState("My Workspace");
  const [initials, setInitials] = useState("MW");
  const [plan, setPlan] = useState("Free Plan");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    fetch("/api/org/api-key")
      .then((r) => r.json())
      .then((data) => {
        setOrgName(data.orgName || "My Workspace");
        const first2 = (data.orgName || "MW")
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        setInitials(first2);
        setPlan(
          data.org?.subscriptionStatus === "active" ? "Pro Plan" : "Free Plan",
        );
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("automax_logged_in");
    localStorage.removeItem("automax_initials");
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        height: "100vh",
        width: "100%",
        overflow: isMobile ? "hidden" : "visible",
      }}
    >
      <aside
        style={{
          width: 256,
          minWidth: 256,
          height: "100vh",
          display: isMobile ? "none" : "flex",
          flexDirection: "column",
          backgroundColor: "var(--sidebar)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 24px",
            borderBottom: "1px solid var(--sidebar-border)",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={20} color="white" />
            </div>
            <span
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "var(--sidebar-foreground)",
              }}
            >
              Auto<span style={{ color: "var(--primary)" }}>Max</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: 16,
            gap: 4,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  style={{
                    backgroundColor: active
                      ? "var(--sidebar-accent)"
                      : "transparent",
                    color: active
                      ? "var(--sidebar-accent-foreground)"
                      : "var(--muted-foreground)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 14,
                    fontWeight: 500,
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "var(--accent)";
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--foreground)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "transparent";
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--muted-foreground)";
                    }
                  }}
                >
                  <Icon
                    size={20}
                    color={
                      active ? "var(--primary)" : "var(--muted-foreground)"
                    }
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Bottom nav */}
          <div
            style={{
              borderTop: "1px solid var(--sidebar-border)",
              paddingTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {bottomNavItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  style={{
                    backgroundColor: active
                      ? "var(--sidebar-accent)"
                      : "transparent",
                    color: active
                      ? "var(--sidebar-accent-foreground)"
                      : "var(--muted-foreground)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 14,
                    fontWeight: 500,
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "var(--accent)";
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--foreground)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "transparent";
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--muted-foreground)";
                    }
                  }}
                >
                  <Icon
                    size={20}
                    color={
                      active ? "var(--primary)" : "var(--muted-foreground)"
                    }
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* User section */}
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              backgroundColor: "var(--secondary)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 600,
                color: "white",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--sidebar-foreground)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {orgName}
              </span>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                {plan}
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
                color: "var(--muted-foreground)",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--destructive)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--muted-foreground)";
              }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </nav>
      </aside>

      {isMobile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            height: 56,
            backgroundColor: "var(--sidebar)",
            borderBottom: "1px solid var(--sidebar-border)",
            zIndex: 40,
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                backgroundColor: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={16} color="white" />
            </div>
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "var(--sidebar-foreground)",
              }}
            >
              Auto<span style={{ color: "var(--primary)" }}>Max</span>
            </span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              href="/dashboard/settings"
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                color: "var(--muted-foreground)",
                textDecoration: "none",
                backgroundColor: isActive("/dashboard/settings")
                  ? "var(--accent)"
                  : "transparent",
              }}
            >
              Settings
            </Link>
            <Link
              href="/dashboard/billing"
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                color: "var(--muted-foreground)",
                textDecoration: "none",
                backgroundColor: isActive("/dashboard/billing")
                  ? "var(--accent)"
                  : "transparent",
              }}
            >
              Billing
            </Link>
            <button
              onClick={handleLogout}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                color: "white",
                backgroundColor: "var(--primary)",
                border: "none",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          backgroundColor: "var(--background)",
          paddingTop: isMobile ? "56px" : 0,
          paddingBottom: isMobile ? "72px" : 0,
          minHeight: isMobile ? 0 : "auto",
        }}
      >
        {children}
      </main>

      {isMobile && (
        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            backgroundColor: "var(--sidebar)",
            borderTop: "1px solid var(--sidebar-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            zIndex: 50,
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  padding: "6px 8px",
                  textDecoration: "none",
                  color: active ? "var(--primary)" : "var(--muted-foreground)",
                  fontSize: 9,
                  fontWeight: active ? 600 : 400,
                  minWidth: 48,
                  textAlign: "center",
                }}
              >
                <Icon
                  size={20}
                  color={active ? "var(--primary)" : "var(--muted-foreground)"}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
