import React, { useState, ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";

/**
 * Dashboard Sidebar Component
 * Collapsible sidebar menu for dashboard navigation (Supabase-style)
 */
interface DashboardSidebarProps {
  children: ReactNode;
  portfolioId: string | null;
}

export default function DashboardSidebar({
  children,
  portfolioId,
}: DashboardSidebarProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const menuItems = [
    {
      label: "Dashboard",
      icon: "📊",
      path: "/dashboard",
      color: "#60a5fa",
    },
    {
      label: "Añadir Aportación",
      icon: "💰",
      path: "/dashboard/contribution",
      color: "#34d399",
    },
    {
      label: "Rebalancear",
      icon: "⚖️",
      path: "/dashboard/rebalance",
      color: "#a5b4fc",
    },
    {
      label: "Actualización Manual",
      icon: "✏️",
      path: "/dashboard/manual-update",
      color: "#fbbf24",
    },
    {
      label: "Configuración",
      icon: "⚙️",
      path: "/dashboard/configuration",
      color: "#94a3b8",
    },
    {
      label: "Mi Perfil",
      icon: "👤",
      path: "/dashboard/profile",
      color: "#c084fc",
    },
  ];

  const isActive = (path: string) => {
    return router.pathname === path;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <div
        style={{
          width: isCollapsed ? "70px" : "260px",
          background: "#0f172a",
          borderRight: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease",
          position: "fixed",
          height: "100vh",
          zIndex: 1000,
        }}
      >
        {/* Logo / Header */}
        <div
          style={{
            padding: isCollapsed ? "1.5rem 0.75rem" : "1.5rem 1.25rem",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>📈</span>
            {!isCollapsed && (
              <span
                style={{
                  color: "#f1f5f9",
                  fontWeight: "700",
                  fontSize: "1.125rem",
                }}
              >
                DCA App
              </span>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <div
          style={{
            flex: 1,
            padding: "1rem 0.5rem",
            overflowY: "auto",
          }}
        >
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => {
                  const path =
                    item.path === "/dashboard"
                      ? `${item.path}?portfolioId=${portfolioId}`
                      : `${item.path}?portfolioId=${portfolioId}`;
                  router.push(path);
                }}
                style={{
                  width: "100%",
                  padding: isCollapsed ? "0.875rem 0.5rem" : "0.875rem 1rem",
                  background: active
                    ? "rgba(59, 130, 246, 0.1)"
                    : "transparent",
                  color: active ? item.color : "#cbd5e1",
                  border: "none",
                  borderRadius: "8px",
                  textAlign: "left",
                  fontSize: "0.9375rem",
                  fontWeight: active ? "600" : "500",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  marginBottom: "0.25rem",
                  transition: "all 0.15s ease",
                  justifyContent: isCollapsed ? "center" : "flex-start",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.05)";
                    e.currentTarget.style.color = "#f1f5f9";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#cbd5e1";
                  }
                }}
              >
                <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>
                  {item.icon}
                </span>
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Footer: Collapse button and Sign Out */}
        <div
          style={{
            borderTop: "1px solid #1e293b",
            padding: "1rem 0.5rem",
          }}
        >
          {/* Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              width: "100%",
              padding: isCollapsed ? "0.875rem 0.5rem" : "0.875rem 1rem",
              background: "transparent",
              color: "#64748b",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.9375rem",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.875rem",
              marginBottom: "0.25rem",
              transition: "all 0.15s ease",
              justifyContent: isCollapsed ? "center" : "flex-start",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              e.currentTarget.style.color = "#cbd5e1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#64748b";
            }}
          >
            <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>
              {isCollapsed ? "→" : "←"}
            </span>
            {!isCollapsed && <span>Colapsar</span>}
          </button>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            style={{
              width: "100%",
              padding: isCollapsed ? "0.875rem 0.5rem" : "0.875rem 1rem",
              background: "transparent",
              color: "#ef4444",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.9375rem",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.875rem",
              transition: "all 0.15s ease",
              justifyContent: isCollapsed ? "center" : "flex-start",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
              e.currentTarget.style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#ef4444";
            }}
          >
            <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>🚪</span>
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          marginLeft: isCollapsed ? "70px" : "260px",
          flex: 1,
          transition: "margin-left 0.2s ease",
          minHeight: "100vh",
        }}
      >
        {children}
      </div>
    </div>
  );
}

