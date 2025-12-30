import React, { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";

/**
 * Dashboard Menu Component
 * Reusable dropdown menu for dashboard pages
 */
export default function DashboardMenu({ portfolioId }: { portfolioId: string | null }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          padding: "0.625rem 1.25rem",
          background: "#131b2e",
          color: "#cbd5e1",
          border: "1px solid #334155",
          borderRadius: "6px",
          fontSize: "0.875rem",
          fontWeight: "500",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span>☰</span>
        <span>Menú</span>
      </button>

      {menuOpen && (
        <>
          {/* Overlay to close menu when clicking outside */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998,
            }}
            onClick={() => setMenuOpen(false)}
          />
          {/* Dropdown Menu */}
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: "0.5rem",
              background: "#131b2e",
              border: "1px solid #334155",
              borderRadius: "8px",
              minWidth: "220px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
              zIndex: 999,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => {
                router.push(
                  `/dashboard/contribution?portfolioId=${portfolioId}`
                );
                setMenuOpen(false);
              }}
              style={{
                width: "100%",
                padding: "0.875rem 1.25rem",
                background: "transparent",
                color: "#cbd5e1",
                border: "none",
                borderBottom: "1px solid #1e293b",
                textAlign: "left",
                fontSize: "0.9rem",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "rgba(59, 130, 246, 0.1)";
                e.currentTarget.style.color = "#60a5fa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#cbd5e1";
              }}
            >
              <span>💰</span>
              <span>+ Añadir Aportación</span>
            </button>
            <button
              onClick={() => {
                router.push(
                  `/dashboard/rebalance?portfolioId=${portfolioId}`
                );
                setMenuOpen(false);
              }}
              style={{
                width: "100%",
                padding: "0.875rem 1.25rem",
                background: "transparent",
                color: "#cbd5e1",
                border: "none",
                borderBottom: "1px solid #1e293b",
                textAlign: "left",
                fontSize: "0.9rem",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "rgba(102, 126, 234, 0.1)";
                e.currentTarget.style.color = "#a5b4fc";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#cbd5e1";
              }}
            >
              <span>⚖️</span>
              <span>Rebalancear Portfolio</span>
            </button>
            <button
              onClick={() => {
                router.push(
                  `/dashboard/manual-update?portfolioId=${portfolioId}`
                );
                setMenuOpen(false);
              }}
              style={{
                width: "100%",
                padding: "0.875rem 1.25rem",
                background: "transparent",
                color: "#cbd5e1",
                border: "none",
                borderBottom: "1px solid #1e293b",
                textAlign: "left",
                fontSize: "0.9rem",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.color = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#cbd5e1";
              }}
            >
              <span>✏️</span>
              <span>Actualización Manual</span>
            </button>
            <button
              onClick={() => {
                router.push(
                  `/dashboard/configuration?portfolioId=${portfolioId}`
                );
                setMenuOpen(false);
              }}
              style={{
                width: "100%",
                padding: "0.875rem 1.25rem",
                background: "transparent",
                color: "#cbd5e1",
                border: "none",
                borderBottom: "1px solid #1e293b",
                textAlign: "left",
                fontSize: "0.9rem",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.color = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#cbd5e1";
              }}
            >
              <span>⚙️</span>
              <span>Configuración</span>
            </button>
            <button
              onClick={() => {
                router.push(`/dashboard?portfolioId=${portfolioId}`);
                setMenuOpen(false);
              }}
              style={{
                width: "100%",
                padding: "0.875rem 1.25rem",
                background: "transparent",
                color: "#cbd5e1",
                border: "none",
                borderBottom: "1px solid #1e293b",
                textAlign: "left",
                fontSize: "0.9rem",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.color = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#cbd5e1";
              }}
            >
              <span>📊</span>
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => {
                router.push(
                  `/dashboard/profile?portfolioId=${portfolioId}`
                );
                setMenuOpen(false);
              }}
              style={{
                width: "100%",
                padding: "0.875rem 1.25rem",
                background: "transparent",
                color: "#cbd5e1",
                border: "none",
                borderBottom: "1px solid #1e293b",
                textAlign: "left",
                fontSize: "0.9rem",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.color = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#cbd5e1";
              }}
            >
              <span>👤</span>
              <span>Mi Perfil</span>
            </button>
            <button
              onClick={() => {
                handleSignOut();
                setMenuOpen(false);
              }}
              style={{
                width: "100%",
                padding: "0.875rem 1.25rem",
                background: "transparent",
                color: "#ef4444",
                border: "none",
                textAlign: "left",
                fontSize: "0.9rem",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "rgba(239, 68, 68, 0.1)";
                e.currentTarget.style.color = "#f87171";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#ef4444";
              }}
            >
              <span>🚪</span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

