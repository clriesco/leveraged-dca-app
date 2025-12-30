import React, { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuth } from "../../contexts/AuthContext";
import { createContribution, getPortfoliosByEmail } from "../../lib/api";
import DashboardSidebar from "../../components/DashboardSidebar";
import { invalidatePortfolioCache } from "../../lib/hooks/use-portfolio-data";

/**
 * Monthly contribution page - Registers the contribution amount
 */
export default function Contribution() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [amount, setAmount] = useState("1000");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Check if this is an extra contribution (from recommendations)
  const isExtraContribution = router.query.extra === "true";

  // Get portfolioId from URL or fetch from API
  useEffect(() => {
    async function loadPortfolio() {
      // Check URL first
      const urlPortfolioId = router.query.portfolioId as string;
      const urlAmount = router.query.amount as string;

      if (urlPortfolioId) {
        setPortfolioId(urlPortfolioId);
      }

      // Pre-fill amount from URL if provided (e.g., from recommendations)
      if (urlAmount) {
        setAmount(urlAmount);
        if (isExtraContribution) {
          setNote(`Extra contribution to reduce leverage - ${new Date().toLocaleDateString()}`);
        }
      }

      if (urlPortfolioId) {
        setIsLoading(false);
        return;
      }

      // Otherwise fetch from API
      if (user?.email) {
        try {
          const portfolios = await getPortfoliosByEmail(user.email);
          if (portfolios && portfolios.length > 0) {
            setPortfolioId(portfolios[0].id);
          } else {
            setError("No portfolio found");
          }
        } catch {
          setError("Failed to load portfolio");
        }
      }
      setIsLoading(false);
    }

    if (!loading && !user) {
      router.push("/");
    } else if (user) {
      loadPortfolio();
    }
  }, [user, loading, router, router.query.portfolioId, router.query.amount, isExtraContribution]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!portfolioId) {
      setError("No se ha seleccionado un portfolio");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      await createContribution({
        portfolioId,
        amount: parseFloat(amount),
        note: note || `Monthly contribution - ${new Date().toLocaleDateString()}`,
      });

      // Invalidate cache so dashboard shows updated data
      invalidatePortfolioCache(portfolioId, user?.email);

      setMessage("✅ ¡Aportación registrada correctamente!");

      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la aportación");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || isLoading) {
    return (
      <>
        <Head>
          <title>Cargando...</title>
        </Head>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
          <p style={{ color: "white", fontSize: "1.2rem" }}>Cargando...</p>
        </div>
      </>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Aportación Mensual - Leveraged DCA App</title>
      </Head>
      <DashboardSidebar portfolioId={portfolioId}>
        <div style={{ padding: "2rem" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* Header */}
            <div
              style={{
                marginBottom: "2rem",
                paddingBottom: "1.5rem",
                borderBottom: "1px solid #1e293b",
              }}
            >
              <h1
                style={{
                  fontSize: "1.875rem",
                  fontWeight: "700",
                  color: "#f1f5f9",
                  marginBottom: "0.25rem",
                  letterSpacing: "-0.025em",
                }}
              >
                {isExtraContribution ? "Aportación Extra" : "Aportación Mensual"}
              </h1>
              <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                {isExtraContribution 
                  ? "Registra una aportación extra para reducir tu leverage y llevarlo de vuelta al rango."
                  : "Registra tu aportación mensual. Después de esto, puedes rebalancear tu portfolio."}
              </p>
            </div>

          <form onSubmit={handleSubmit}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "16px",
                padding: "2rem",
                backdropFilter: "blur(10px)",
              }}
            >
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontWeight: "500", marginBottom: "0.5rem", color: "rgba(255, 255, 255, 0.9)" }}>
                  Cantidad de Aportación (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    border: "2px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    fontSize: "1.25rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontWeight: "500", marginBottom: "0.5rem", color: "rgba(255, 255, 255, 0.9)" }}>
                  Nota (opcional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., December 2025 DCA"
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    border: "2px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !portfolioId}
                style={{
                  width: "100%",
                  padding: "1rem",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  opacity: isSubmitting || !portfolioId ? 0.7 : 1,
                  cursor: isSubmitting || !portfolioId ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting ? "Guardando..." : "Registrar Aportación"}
              </button>
            </div>
          </form>

          {message && (
            <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(74, 222, 128, 0.2)", color: "#4ade80", borderRadius: "8px", border: "1px solid rgba(74, 222, 128, 0.3)" }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(248, 113, 113, 0.2)", color: "#f87171", borderRadius: "8px", border: "1px solid rgba(248, 113, 113, 0.3)" }}>
              {error}
            </div>
          )}
          </div>
        </div>
      </DashboardSidebar>
    </>
  );
}
