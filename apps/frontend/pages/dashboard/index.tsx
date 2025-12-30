import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuth } from "../../contexts/AuthContext";
import DashboardSidebar from "../../components/DashboardSidebar";
import { Recommendation, RecommendationPriority } from "../../lib/api";
import {
  usePortfolios,
  usePortfolioSummary,
  usePortfolioMetrics,
  usePortfolioRecommendations,
} from "../../lib/hooks/use-portfolio-data";

interface Position {
  id: string;
  quantity: number;
  avgPrice: number;
  exposureUsd: number;
  weight: number;
  asset: {
    id: string;
    symbol: string;
    name: string;
  };
}

interface PortfolioSummary {
  portfolio: {
    id: string;
    name: string;
    leverageMin: number;
    leverageMax: number;
  };
  metrics: {
    equity: number;
    exposure: number;
    leverage: number;
    totalContributions: number;
    absoluteReturn: number;
    percentReturn: number;
    startDate: string;
    lastUpdate: string;
  };
  positions: Position[];
  analytics: AnalyticsStats;
}

interface AnalyticsStats {
  capitalFinal: number;
  totalInvested: number;
  absoluteReturn: number;
  totalReturnPercent: number;
  cagr: number;
  volatility: number;
  sharpe: number;
  maxDrawdownEquity: number;
  maxDrawdownExposure: number;
  underwaterDays: number;
  bestDay: { date: string; return: number } | null;
  worstDay: { date: string; return: number } | null;
}

interface MetricsPoint {
  date: string;
  equity: number;
  exposure: number;
  leverage: number;
  drawdown?: number;
  contribution?: number;
  pnl?: number;
  pnlPercent?: number;
  metadata?: {
    composition?: Array<{
      symbol: string;
      weight: number;
      value?: number;
      quantity?: number;
    }>;
  } | null;
}

/**
 * Dashboard page with real portfolio data
 */
function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Use SWR hooks for cached data
  const {
    portfolios,
    isLoading: portfoliosLoading,
    error: portfoliosError,
  } = usePortfolios();
  const portfolioId = portfolios.length > 0 ? portfolios[0].id : null;

  const {
    summary,
    isLoading: summaryLoading,
    mutate: refreshSummary,
  } = usePortfolioSummary(portfolioId);
  const {
    metrics: metricsHistory,
    isLoading: metricsLoading,
    mutate: refreshMetrics,
  } = usePortfolioMetrics(portfolioId);
  const {
    recommendations,
    isLoading: recommendationsLoading,
    mutate: refreshRecommendations,
  } = usePortfolioRecommendations(portfolioId);

  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 24;

  // Combined loading state
  const dataLoading =
    portfoliosLoading ||
    summaryLoading ||
    metricsLoading ||
    recommendationsLoading;
  const error = portfoliosError
    ? portfoliosError instanceof Error
      ? portfoliosError.message
      : String(portfoliosError)
    : null;

  const historyForTable = useMemo(() => {
    // Sort by date descending (most recent first)
    const sorted = [...metricsHistory]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((point) => ({
        ...point,
        composition: point.metadata?.composition ?? [],
      }));
    return sorted;
  }, [metricsHistory]);

  // Calculate pagination
  const totalPages = Math.ceil(historyForTable.length / itemsPerPage);
  const startIndex = (historyPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHistory = historyForTable.slice(startIndex, endIndex);

  const analyticsStats = summary?.analytics ?? null;

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // Check if portfolio exists
  useEffect(() => {
    if (!portfoliosLoading && portfolios.length === 0 && user) {
      // Portfolio will be handled by error state below
    }
  }, [portfoliosLoading, portfolios.length, user]);

  if (loading) {
    return (
      <>
        <Head>
          <title>Cargando... - Dashboard</title>
        </Head>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
          }}
        >
          <p style={{ color: "#94a3b8", fontSize: "1rem" }}>Cargando...</p>
        </div>
      </>
    );
  }

  if (!user) {
    return null;
  }

  // Show error if no portfolio found
  if (!portfoliosLoading && portfolios.length === 0) {
    return (
      <>
        <Head>
          <title>Error - Dashboard</title>
        </Head>
        <DashboardSidebar portfolioId={null}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "100vh",
              flexDirection: "column",
              gap: "1rem",
              padding: "2rem",
            }}
          >
            <p style={{ color: "#ef4444", fontSize: "1rem" }}>
              No se encontró portfolio. Por favor, contacta con soporte.
            </p>
          </div>
        </DashboardSidebar>
      </>
    );
  }

  // Function to manually refresh all data
  const handleRefresh = () => {
    refreshSummary();
    refreshMetrics();
    refreshRecommendations();
  };

  return (
    <React.Fragment>
      <Head>
        <title>Dashboard - Leveraged DCA App</title>
      </Head>
      <DashboardSidebar portfolioId={portfolioId}>
        <div style={{ padding: "2rem" }}>
          <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
            {/* Header */}
            <div
              style={{
                marginBottom: "2rem",
                paddingBottom: "1.5rem",
                borderBottom: "1px solid #1e293b",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: "1.875rem",
                    fontWeight: "700",
                    color: "#f1f5f9",
                    marginBottom: "0.25rem",
                    letterSpacing: "-0.025em",
                  }}
                >
                  Dashboard del Portfolio
                </h1>
                <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                  {user.email}
                </p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={dataLoading}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  color: "#e2e8f0",
                  fontSize: "0.875rem",
                  cursor: dataLoading ? "not-allowed" : "pointer",
                  opacity: dataLoading ? 0.5 : 1,
                }}
                title="Actualizar datos"
              >
                {dataLoading ? "Actualizando..." : "🔄 Actualizar"}
              </button>
            </div>

            {/* Loading State - Skeletons */}
            {dataLoading && (
              <>
                {/* Summary Metrics Skeletons */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                    marginBottom: "2rem",
                  }}
                >
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      style={{
                        background: "#131b2e",
                        border: "1px solid #1e293b",
                        borderRadius: "8px",
                        padding: "1.5rem",
                      }}
                    >
                      <div
                        style={{
                          height: "0.875rem",
                          background: "rgba(255, 255, 255, 0.1)",
                          borderRadius: "4px",
                          marginBottom: "0.75rem",
                          width: "60%",
                          animation: "pulse 1.5s ease-in-out infinite",
                        }}
                      />
                      <div
                        style={{
                          height: "1.75rem",
                          background: "rgba(255, 255, 255, 0.1)",
                          borderRadius: "4px",
                          width: "80%",
                          animation: "pulse 1.5s ease-in-out infinite",
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Recommendations Skeleton */}
                <div
                  style={{
                    background: "#131b2e",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "2rem",
                  }}
                >
                  <div
                    style={{
                      height: "1.25rem",
                      background: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "4px",
                      marginBottom: "1rem",
                      width: "40%",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                  <div
                    style={{
                      height: "4rem",
                      background: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "8px",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                </div>

                {/* Chart Skeleton */}
                <div
                  style={{
                    background: "#131b2e",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "2rem",
                  }}
                >
                  <div
                    style={{
                      height: "1.25rem",
                      background: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "4px",
                      marginBottom: "1rem",
                      width: "30%",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                  <div
                    style={{
                      height: "220px",
                      background: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "8px",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                </div>

                {/* Analytics Skeleton */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "1rem",
                    marginBottom: "2rem",
                  }}
                >
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      style={{
                        background: "#131b2e",
                        border: "1px solid #1e293b",
                        borderRadius: "8px",
                        padding: "1rem",
                      }}
                    >
                      <div
                        style={{
                          height: "0.75rem",
                          background: "rgba(255, 255, 255, 0.1)",
                          borderRadius: "4px",
                          marginBottom: "0.5rem",
                          width: "70%",
                          animation: "pulse 1.5s ease-in-out infinite",
                        }}
                      />
                      <div
                        style={{
                          height: "1.5rem",
                          background: "rgba(255, 255, 255, 0.1)",
                          borderRadius: "4px",
                          width: "50%",
                          animation: "pulse 1.5s ease-in-out infinite",
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* History Table Skeleton */}
                <div
                  style={{
                    background: "#131b2e",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "2rem",
                  }}
                >
                  <div
                    style={{
                      height: "1.25rem",
                      background: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "4px",
                      marginBottom: "1rem",
                      width: "25%",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr>
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <th
                              key={i}
                              style={{
                                padding: "0.875rem 1rem",
                                textAlign: "left",
                              }}
                            >
                              <div
                                style={{
                                  height: "0.875rem",
                                  background: "rgba(255, 255, 255, 0.1)",
                                  borderRadius: "4px",
                                  animation: "pulse 1.5s ease-in-out infinite",
                                }}
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <tr key={i}>
                            {[1, 2, 3, 4, 5, 6].map((j) => (
                              <td
                                key={j}
                                style={{
                                  padding: "1rem",
                                }}
                              >
                                <div
                                  style={{
                                    height: "1rem",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    borderRadius: "4px",
                                    animation:
                                      "pulse 1.5s ease-in-out infinite",
                                  }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Positions Table Skeleton */}
                <div
                  style={{
                    background: "#131b2e",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "2rem",
                  }}
                >
                  <div
                    style={{
                      height: "1.25rem",
                      background: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "4px",
                      marginBottom: "1rem",
                      width: "25%",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr>
                          {[1, 2, 3, 4].map((i) => (
                            <th
                              key={i}
                              style={{
                                padding: "0.875rem 1rem",
                                textAlign: "left",
                              }}
                            >
                              <div
                                style={{
                                  height: "0.875rem",
                                  background: "rgba(255, 255, 255, 0.1)",
                                  borderRadius: "4px",
                                  animation: "pulse 1.5s ease-in-out infinite",
                                }}
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3].map((i) => (
                          <tr key={i}>
                            {[1, 2, 3, 4].map((j) => (
                              <td
                                key={j}
                                style={{
                                  padding: "1rem",
                                }}
                              >
                                <div
                                  style={{
                                    height: "1rem",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    borderRadius: "4px",
                                    animation:
                                      "pulse 1.5s ease-in-out infinite",
                                  }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CSS Animation for pulse effect */}
                <style jsx>{`
                  @keyframes pulse {
                    0%,
                    100% {
                      opacity: 1;
                    }
                    50% {
                      opacity: 0.5;
                    }
                  }
                `}</style>
              </>
            )}

            {/* Error State */}
            {error && (
              <div
                style={{
                  padding: "1.5rem",
                  background: "rgba(248, 113, 113, 0.1)",
                  border: "1px solid rgba(248, 113, 113, 0.3)",
                  borderRadius: "8px",
                  marginBottom: "2rem",
                }}
              >
                <p style={{ color: "#f87171" }}>{error}</p>
              </div>
            )}

            {/* Dashboard Content */}
            {!dataLoading && summary && (
              <>
                {/* Metrics Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "1.5rem",
                    marginBottom: "2rem",
                  }}
                >
                  <MetricCard
                    title="Equity"
                    value={`$${summary.metrics.equity.toLocaleString(
                      undefined,
                      {
                        maximumFractionDigits: 0,
                      }
                    )}`}
                    subtitle="Valor del portfolio"
                  />
                  <MetricCard
                    title="Exposición"
                    value={`$${summary.metrics.exposure.toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 }
                    )}`}
                    subtitle="Total de posiciones"
                  />
                  <MetricCard
                    title="Leverage"
                    value={`${summary.metrics.leverage.toFixed(1)}x`}
                    subtitle="Ratio actual"
                  />
                  <MetricCard
                    title="Retornos"
                    value={`${
                      summary.metrics.percentReturn >= 0 ? "+" : ""
                    }${summary.metrics.percentReturn.toFixed(2)}%`}
                    subtitle={`$${summary.metrics.absoluteReturn.toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 }
                    )} total`}
                    positive={summary.metrics.percentReturn >= 0}
                  />
                </div>

                {/* Recommendations Section */}
                {recommendations &&
                  recommendations.recommendations.length > 0 && (
                    <div
                      style={{
                        background: "#131b2e",
                        border: "1px solid #1e293b",
                        borderRadius: "8px",
                        padding: "1.5rem",
                        marginBottom: "2rem",
                      }}
                    >
                      <h2
                        style={{
                          fontSize: "1.125rem",
                          fontWeight: "600",
                          color: "#f1f5f9",
                          marginBottom: "1.25rem",
                        }}
                      >
                        🎯 Recomendaciones
                      </h2>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "1rem",
                        }}
                      >
                        {recommendations.recommendations.map((rec, idx) => (
                          <DashboardRecommendationCard
                            key={`${rec.type}-${idx}`}
                            recommendation={rec}
                            router={router}
                            portfolioId={portfolioId}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                {/* Analytics Grid */}
                {analyticsStats && (
                  <div
                    style={{
                      background: "#131b2e",
                      border: "1px solid #1e293b",
                      borderRadius: "8px",
                      padding: "1.5rem",
                      marginBottom: "2rem",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        color: "#f1f5f9",
                        marginBottom: "1rem",
                      }}
                    >
                      📈 Métricas
                    </h2>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "1rem",
                      }}
                    >
                      {[
                        {
                          label: "Capital final",
                          value: formatCurrency(analyticsStats.capitalFinal),
                          description:
                            "Valor total del equity al final del período analizado.",
                        },
                        {
                          label: "Total invertido",
                          value: formatCurrency(analyticsStats.totalInvested),
                          description:
                            "Suma del capital inicial más todas las aportaciones realizadas durante el período.",
                        },
                        {
                          label: "Retorno absoluto",
                          value: formatCurrency(analyticsStats.absoluteReturn),
                          description:
                            "Diferencia entre el capital final y el total invertido. Mide la ganancia o pérdida en términos absolutos.",
                        },
                        {
                          label: "Retorno total",
                          value: formatPercent(
                            analyticsStats.totalReturnPercent / 100
                          ),
                          description:
                            "Retorno porcentual sobre el total invertido. Calculado como (Capital Final - Total Invertido) / Total Invertido.",
                        },
                        {
                          label: "CAGR",
                          value: formatPercent(analyticsStats.cagr),
                          description:
                            "Tasa de crecimiento anual compuesta. Mide el retorno anualizado del portfolio desde el inicio.",
                        },
                        {
                          label: "Volatilidad anual",
                          value: formatPercent(analyticsStats.volatility),
                          description:
                            "Desviación estándar anualizada de los retornos diarios. Mide la variabilidad del portfolio.",
                        },
                        {
                          label: "Sharpe Ratio",
                          value: analyticsStats.sharpe.toFixed(2),
                          description:
                            "Relación entre el retorno excedente (sobre la tasa libre de riesgo) y la volatilidad. Valores más altos indican mejor relación riesgo-retorno.",
                        },
                        {
                          label: "Máximo Drawdown Equity",
                          value: formatPercent(
                            Math.abs(analyticsStats.maxDrawdownEquity)
                          ),
                          description:
                            "Máxima caída porcentual del capital (equity) desde su pico histórico. Mide el peor retroceso experimentado.",
                        },
                        {
                          label: "Máximo Drawdown Exposure",
                          value: formatPercent(
                            Math.abs(analyticsStats.maxDrawdownExposure)
                          ),
                          description:
                            "Máxima caída porcentual de la exposición total desde su pico histórico. Indica la reducción máxima en el valor de las posiciones.",
                        },
                        {
                          label: "Días bajo el agua",
                          value: analyticsStats.underwaterDays.toString(),
                          description:
                            "Número total de días donde el equity está por debajo del capital total invertido acumulado (inversión inicial + aportaciones).",
                        },
                        {
                          label: "Mejor día",
                          value: analyticsStats.bestDay
                            ? `${new Date(
                                analyticsStats.bestDay.date
                              ).toLocaleDateString()} (${formatPercent(
                                analyticsStats.bestDay.return
                              )})`
                            : "-",
                          description:
                            "Fecha y retorno del día con mayor ganancia porcentual, excluyendo aportaciones.",
                        },
                        {
                          label: "Peor día",
                          value: analyticsStats.worstDay
                            ? `${new Date(
                                analyticsStats.worstDay.date
                              ).toLocaleDateString()} (${formatPercent(
                                analyticsStats.worstDay.return
                              )})`
                            : "-",
                          description:
                            "Fecha y retorno del día con mayor pérdida porcentual, excluyendo aportaciones.",
                        },
                      ].map((stat) => (
                        <AnalyticsCard
                          key={stat.label}
                          label={stat.label}
                          value={stat.value}
                          description={stat.description}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Equity Chart */}
                {metricsHistory.length > 0 && (
                  <div
                    style={{
                      background: "#131b2e",
                      border: "1px solid #1e293b",
                      borderRadius: "8px",
                      padding: "1.5rem",
                      marginBottom: "2rem",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        color: "#f1f5f9",
                        marginBottom: "1rem",
                      }}
                    >
                      Historial de Equity
                    </h2>
                    <EquityChart data={metricsHistory} />
                  </div>
                )}

                {/* Summary Info */}
                <div
                  style={{
                    background: "#131b2e",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "2rem",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: "600",
                      color: "#f1f5f9",
                      marginBottom: "1rem",
                    }}
                  >
                    Resumen
                  </h2>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          color: "#64748b",
                          fontSize: "0.8rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Aportaciones Totales
                      </p>
                      <p
                        style={{
                          color: "#f1f5f9",
                          fontSize: "1.1rem",
                          fontWeight: "600",
                        }}
                      >
                        $
                        {summary.metrics.totalContributions.toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits: 0,
                          }
                        )}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          color: "#64748b",
                          fontSize: "0.8rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Fecha de Inicio
                      </p>
                      <p
                        style={{
                          color: "#f1f5f9",
                          fontSize: "1.1rem",
                          fontWeight: "600",
                        }}
                      >
                        {summary.metrics.startDate
                          ? new Date(
                              summary.metrics.startDate
                            ).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          color: "#64748b",
                          fontSize: "0.8rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Última Actualización
                      </p>
                      <p
                        style={{
                          color: "#f1f5f9",
                          fontSize: "1.1rem",
                          fontWeight: "600",
                        }}
                      >
                        {summary.metrics.lastUpdate
                          ? new Date(
                              summary.metrics.lastUpdate
                            ).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Historical Records */}
                <div
                  style={{
                    background: "#131b2e",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "2rem",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: "600",
                      color: "#f1f5f9",
                      marginBottom: "1rem",
                    }}
                  >
                    Historial Mensual
                  </h2>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr style={{ borderBottom: "1px solid #1e293b" }}>
                          <th style={tableHeaderStyle}>Fecha</th>
                          <th style={tableHeaderStyle}>Equity</th>
                          <th style={tableHeaderStyle}>Exposición</th>
                          <th style={tableHeaderStyle}>Leverage</th>
                          <th style={tableHeaderStyle}>Composición</th>
                          <th style={tableHeaderStyle}>PnL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedHistory.map((point, idx) => (
                          <tr
                            key={`${point.date}-${idx}`}
                            style={{
                              borderBottom:
                                idx < paginatedHistory.length - 1
                                  ? "1px solid #0f172a"
                                  : "none",
                            }}
                          >
                            <td style={tableCellStyle}>
                              {new Date(point.date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </td>
                            <td style={tableCellStyle}>
                              ${Math.round(point.equity).toLocaleString()}
                            </td>
                            <td style={tableCellStyle}>
                              ${Math.round(point.exposure).toLocaleString()}
                            </td>
                            <td style={tableCellStyle}>
                              {point.leverage.toFixed(2)}x
                            </td>
                            <td style={tableCellStyle}>
                              {point.composition.length > 0 ? (
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "0.35rem",
                                  }}
                                >
                                  {point.composition.map((asset) => (
                                    <span
                                      key={`${asset.symbol}-${asset.weight}`}
                                      style={{
                                        border:
                                          "1px solid rgba(255,255,255,0.2)",
                                        borderRadius: "999px",
                                        padding: "0.2rem 0.55rem",
                                        fontSize: "0.75rem",
                                        color: "#cbd5e1",
                                      }}
                                    >
                                      {asset.symbol}{" "}
                                      {(asset.weight * 100).toFixed(1)}%
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span
                                  style={{
                                    color: "#94a3b8",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  –
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                ...tableCellStyle,
                                color:
                                  (point.pnl ?? 0) >= 0 ? "#22c55e" : "#f87171",
                              }}
                            >
                              $
                              {(point.pnl ?? 0).toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "1.5rem",
                        paddingTop: "1.5rem",
                        borderTop: "1px solid #1e293b",
                      }}
                    >
                      <button
                        onClick={() =>
                          setHistoryPage((p) => Math.max(1, p - 1))
                        }
                        disabled={historyPage === 1}
                        style={{
                          padding: "0.5rem 1rem",
                          background:
                            historyPage === 1
                              ? "rgba(255, 255, 255, 0.05)"
                              : "#131b2e",
                          color: historyPage === 1 ? "#64748b" : "#cbd5e1",
                          border: "1px solid #334155",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                          cursor: historyPage === 1 ? "not-allowed" : "pointer",
                          opacity: historyPage === 1 ? 0.5 : 1,
                        }}
                      >
                        ← Anterior
                      </button>
                      <span
                        style={{
                          color: "#94a3b8",
                          fontSize: "0.875rem",
                        }}
                      >
                        Página {historyPage} de {totalPages} (
                        {historyForTable.length} registros)
                      </span>
                      <button
                        onClick={() =>
                          setHistoryPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={historyPage === totalPages}
                        style={{
                          padding: "0.5rem 1rem",
                          background:
                            historyPage === totalPages
                              ? "rgba(255, 255, 255, 0.05)"
                              : "#131b2e",
                          color:
                            historyPage === totalPages ? "#64748b" : "#cbd5e1",
                          border: "1px solid #334155",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                          cursor:
                            historyPage === totalPages
                              ? "not-allowed"
                              : "pointer",
                          opacity: historyPage === totalPages ? 0.5 : 1,
                        }}
                      >
                        Siguiente →
                      </button>
                    </div>
                  )}
                </div>

                {/* Positions Table */}
                <div
                  style={{
                    background: "#131b2e",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "2rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        color: "#f1f5f9",
                        margin: 0,
                      }}
                    >
                      Posiciones Actuales
                    </h2>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <button
                        onClick={() =>
                          router.push(
                            `/dashboard/manual-update?portfolioId=${portfolioId}`
                          )
                        }
                        style={{
                          padding: "0.5rem 1rem",
                          background: "rgba(59, 130, 246, 0.1)",
                          color: "#60a5fa",
                          border: "1px solid rgba(59, 130, 246, 0.3)",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(59, 130, 246, 0.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "rgba(59, 130, 246, 0.1)";
                        }}
                      >
                        <span>✏️</span>
                        <span>Actualización Manual</span>
                      </button>
                      <button
                        onClick={() =>
                          router.push(
                            `/dashboard/rebalance?portfolioId=${portfolioId}`
                          )
                        }
                        style={{
                          padding: "0.5rem 1rem",
                          background: "rgba(139, 92, 246, 0.1)",
                          color: "#a78bfa",
                          border: "1px solid rgba(139, 92, 246, 0.3)",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(139, 92, 246, 0.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "rgba(139, 92, 246, 0.1)";
                        }}
                      >
                        <span>⚖️</span>
                        <span>Rebalancear Portfolio</span>
                      </button>
                    </div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr style={{ borderBottom: "1px solid #1e293b" }}>
                          <th style={tableHeaderStyle}>Activo</th>
                          <th style={tableHeaderStyle}>Peso</th>
                          <th style={tableHeaderStyle}>Cantidad</th>
                          <th style={tableHeaderStyle}>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.positions.map((pos: Position, idx: number) => (
                          <tr
                            key={pos.id}
                            style={{
                              borderBottom:
                                idx < summary.positions.length - 1
                                  ? "1px solid #0f172a"
                                  : "none",
                            }}
                          >
                            <td style={tableCellStyle}>
                              <div style={{ fontWeight: "600" }}>
                                {pos.asset.name}
                              </div>
                              <div
                                style={{ color: "#64748b", fontSize: "0.8rem" }}
                              >
                                {pos.asset.symbol}
                              </div>
                            </td>
                            <td style={tableCellStyle}>
                              {pos.weight.toFixed(1)}%
                            </td>
                            <td style={tableCellStyle}>
                              {pos.quantity.toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                              })}
                            </td>
                            <td style={tableCellStyle}>
                              $
                              {pos.exposureUsd.toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DashboardSidebar>
    </React.Fragment>
  );
}

/**
 * Simple equity chart using SVG
 */
function EquityChart({ data }: { data: MetricsPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [_containerRef, setContainerRef] = useState<HTMLDivElement | null>(
    null
  );

  if (data.length === 0) return null;

  const width = 1200; // Increased from 900 to use more horizontal space
  const height = 220;
  const padding = 40;
  const firstEquity = data[0]?.equity || 0;
  const lastEquity = data[data.length - 1]?.equity || 0;
  const isPositive = lastEquity >= firstEquity;
  const equities = data.map((d) => d.equity);
  const minEquity = Math.min(...equities) * 0.95;
  const maxEquity = Math.max(...equities) * 1.05;
  const range = Math.max(maxEquity - minEquity, 1);

  const coords = data.map((point, index) => {
    const stepCount = Math.max(data.length - 1, 1);
    const x = padding + (index / stepCount) * (width - 2 * padding);
    const y =
      height -
      padding -
      ((point.equity - minEquity) / range) * (height - 2 * padding);
    return { x, y, point };
  });

  const polylinePoints = coords
    .map((coord) => `${coord.x},${coord.y}`)
    .join(" ");

  const handleMouseMove = (event: React.MouseEvent<SVGElement>) => {
    // Get the SVG element's bounding box (already scaled by viewBox)
    const svgRect = event.currentTarget.getBoundingClientRect();
    if (svgRect.width === 0) {
      setHoverIndex(null);
      return;
    }

    // Calculate mouse position relative to the SVG element
    const relativeMouseX = event.clientX - svgRect.left;
    // Convert to viewBox coordinates (the SVG viewBox handles scaling automatically)
    // The SVG scales proportionally, so we can directly map the mouse position to viewBox coordinates
    const svgX = (relativeMouseX / svgRect.width) * width;

    // Check if mouse is within the chart area (accounting for padding)
    if (svgX < padding || svgX > width - padding) {
      setHoverIndex(null);
      return;
    }

    // Find the closest point by calculating distance to each point's X coordinate
    let closestIndex = 0;
    let minDistance = Math.abs(coords[0].x - svgX);

    for (let i = 1; i < coords.length; i++) {
      const distance = Math.abs(coords[i].x - svgX);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    setHoverIndex(closestIndex);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const tickIndices = Array.from(
    new Set(
      [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
        Math.max(
          0,
          Math.min(data.length - 1, Math.round(ratio * (data.length - 1)))
        )
      )
    )
  );

  const tooltip = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div
      ref={setContainerRef}
      style={{ position: "relative", width: "100%", height: `${height}px` }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <line
            key={i}
            x1={padding}
            y1={height - padding - pct * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - pct * (height - 2 * padding)}
            stroke="#1e293b"
            strokeWidth="1"
          />
        ))}

        {[0, 0.5, 1].map((pct, i) => (
          <text
            key={i}
            x={padding - 5}
            y={height - padding - pct * (height - 2 * padding)}
            fill="#64748b"
            fontSize="10"
            textAnchor="end"
            alignmentBaseline="middle"
          >
            ${((minEquity + pct * range) / 1000).toFixed(0)}k
          </text>
        ))}

        <polyline
          fill="none"
          stroke={isPositive ? "#22c55e" : "#ef4444"}
          strokeWidth="2.5"
          points={polylinePoints}
        />

        <polygon
          fill={
            isPositive ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)"
          }
          points={`${padding},${height - padding} ${polylinePoints} ${
            width - padding
          },${height - padding}`}
        />

        {tickIndices.map((idx) => (
          <text
            key={`tick-${idx}`}
            x={coords[idx].x}
            y={height - 10}
            fill="#64748b"
            fontSize="10"
            textAnchor={
              idx === 0 ? "start" : idx === data.length - 1 ? "end" : "middle"
            }
          >
            {new Date(data[idx].date).toLocaleDateString("en-US", {
              month: "short",
              year: "2-digit",
            })}
          </text>
        ))}

        {tooltip && (
          <>
            <line
              x1={tooltip.x}
              x2={tooltip.x}
              y1={padding / 2}
              y2={height - padding / 2}
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="4 4"
            />
            <circle
              cx={tooltip.x}
              cy={tooltip.y}
              r={5}
              fill={isPositive ? "#22c55e" : "#ef4444"}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: `${(tooltip.x / width) * 100}%`,
            top: `${(tooltip.y / height) * 100}%`,
            transform: "translate(-50%, -120%)",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            borderRadius: "8px",
            padding: "0.75rem",
            pointerEvents: "none",
            color: "white",
            minWidth: "150px",
            fontSize: "0.85rem",
            zIndex: 10,
          }}
        >
          <p style={{ margin: 0, fontWeight: "600" }}>
            {new Date(tooltip.point.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p style={{ margin: "0.25rem 0 0", color: "#a5b4fc" }}>
            Equity: $
            {tooltip.point.equity.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
      )}
    </div>
  );
}

function AnalyticsCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        borderRadius: "12px",
        padding: "1rem",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.25rem",
        }}
      >
        <p
          style={{
            color: "#94a3b8",
            fontSize: "0.75rem",
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </p>
        {description && (
          <div
            style={{ position: "relative", display: "inline-block" }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                color: "#64748b",
                cursor: "help",
                flexShrink: 0,
              }}
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            {showTooltip && (
              <div
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginBottom: "0.5rem",
                  background: "rgba(15, 23, 42, 0.98)",
                  border: "1px solid rgba(148, 163, 184, 0.3)",
                  borderRadius: "8px",
                  padding: "0.75rem",
                  color: "#cbd5e1",
                  fontSize: "0.8125rem",
                  width: "280px",
                  zIndex: 1000,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                  pointerEvents: "none",
                }}
              >
                {description}
                <div
                  style={{
                    position: "absolute",
                    bottom: "-6px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: "6px solid transparent",
                    borderRight: "6px solid transparent",
                    borderTop: "6px solid rgba(148, 163, 184, 0.3)",
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
      <p
        style={{
          color: "#f1f5f9",
          fontSize: "1.1rem",
          fontWeight: "600",
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `$${Math.round(value).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

/**
 * Metric card component
 */
function MetricCard({
  title,
  value,
  subtitle,
  positive,
}: {
  title: string;
  value: string;
  subtitle: string;
  positive?: boolean;
}) {
  return (
    <div
      style={{
        background: "#131b2e",
        border: "1px solid #1e293b",
        borderRadius: "8px",
        padding: "1.25rem",
      }}
    >
      <p
        style={{
          color: "#94a3b8",
          fontSize: "0.8125rem",
          marginBottom: "0.5rem",
          fontWeight: "500",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: "1.75rem",
          fontWeight: "700",
          color:
            positive !== undefined
              ? positive
                ? "#22c55e"
                : "#ef4444"
              : "#f1f5f9",
          marginBottom: "0.25rem",
        }}
      >
        {value}
      </p>
      <p style={{ color: "#64748b", fontSize: "0.75rem" }}>{subtitle}</p>
    </div>
  );
}

const tableHeaderStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontWeight: "600",
  textAlign: "left",
  padding: "0.875rem 1rem",
  fontSize: "0.8125rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tableCellStyle: React.CSSProperties = {
  color: "#cbd5e1",
  padding: "1rem",
  fontSize: "0.9375rem",
};

/**
 * Priority colors and labels for recommendations
 */
const PRIORITY_CONFIG: Record<
  RecommendationPriority,
  { color: string; bg: string; border: string; label: string }
> = {
  urgent: {
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.1)",
    border: "rgba(239, 68, 68, 0.4)",
    label: "URGENTE",
  },
  high: {
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.1)",
    border: "rgba(245, 158, 11, 0.4)",
    label: "ALTA",
  },
  medium: {
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.1)",
    border: "rgba(59, 130, 246, 0.4)",
    label: "MEDIA",
  },
  low: {
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.1)",
    border: "rgba(34, 197, 94, 0.4)",
    label: "BAJA",
  },
};

/**
 * Type icons for recommendations
 */
const TYPE_ICONS: Record<string, string> = {
  contribution_due: "📅",
  leverage_low: "📉",
  leverage_high: "📈",
  deploy_signal: "🚀",
  rebalance_needed: "⚖️",
  in_range: "✅",
};

/**
 * Simplified recommendation card for dashboard
 */
function DashboardRecommendationCard({
  recommendation,
  router,
  portfolioId,
}: {
  recommendation: Recommendation;
  router: ReturnType<typeof useRouter>;
  portfolioId: string | null;
}) {
  const priorityConfig = PRIORITY_CONFIG[recommendation.priority];
  const icon = TYPE_ICONS[recommendation.type] || "📌";

  return (
    <div
      style={{
        background: priorityConfig.bg,
        border: `1px solid ${priorityConfig.border}`,
        borderRadius: "12px",
        padding: "1.25rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.5rem" }}>{icon}</span>
          <div>
            <h3
              style={{
                color: "#f1f5f9",
                fontSize: "1.1rem",
                fontWeight: "600",
                margin: 0,
              }}
            >
              {recommendation.title}
            </h3>
          </div>
        </div>
        <span
          style={{
            background: priorityConfig.color,
            color: "white",
            fontSize: "0.7rem",
            fontWeight: "700",
            padding: "0.25rem 0.75rem",
            borderRadius: "4px",
          }}
        >
          {priorityConfig.label}
        </span>
      </div>

      {/* Description */}
      <p style={{ color: "#cbd5e1", marginBottom: "1rem", lineHeight: "1.5" }}>
        {recommendation.description}
      </p>

      {/* Actions - Purchases (simplified) */}
      {recommendation.actions?.purchases &&
        recommendation.actions.purchases.length > 0 && (
          <div
            style={{
              background: "rgba(0,0,0,0.2)",
              borderRadius: "8px",
              padding: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <p
              style={{
                color: "#94a3b8",
                fontSize: "0.8rem",
                marginBottom: "0.5rem",
                fontWeight: "600",
              }}
            >
              Compras Recomendadas: {recommendation.actions.purchases.length}{" "}
              activos
            </p>
            <p
              style={{
                color: "#f1f5f9",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Total: $
              {recommendation.actions.totalPurchaseValue?.toLocaleString(
                undefined,
                {
                  maximumFractionDigits: 0,
                }
              ) || 0}
            </p>
          </div>
        )}

      {/* Actions - Extra Contribution */}
      {recommendation.actions?.extraContribution && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            padding: "0.75rem",
            marginBottom: "0.5rem",
          }}
        >
          <p
            style={{
              color: "#f87171",
              fontWeight: "600",
              marginBottom: "0.25rem",
            }}
          >
            💸 Aporte Extra Necesario
          </p>
          <p
            style={{
              color: "#f1f5f9",
              fontSize: "1.25rem",
              fontWeight: "700",
            }}
          >
            $
            {Math.ceil(
              recommendation.actions.extraContribution.amount
            ).toLocaleString()}
          </p>
        </div>
      )}

      {/* Actions - Contribution Reminder */}
      {recommendation.actions?.contributionReminder && (
        <div
          style={{
            background: "rgba(59, 130, 246, 0.15)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "8px",
            padding: "0.75rem",
            marginBottom: "0.5rem",
          }}
        >
          <p style={{ color: "#60a5fa", fontWeight: "600" }}>
            💰 Aportación Sugerida
          </p>
          <p
            style={{
              color: "#f1f5f9",
              fontSize: "1.25rem",
              fontWeight: "700",
            }}
          >
            $
            {recommendation.actions.contributionReminder.suggestedAmount.toLocaleString()}
          </p>
        </div>
      )}

      {/* Action Button */}
      {recommendation.actionUrl && (
        <div style={{ marginTop: "1rem", textAlign: "right" }}>
          <button
            onClick={() => {
              let url = recommendation.actionUrl!;
              if (!url.includes("portfolioId") && portfolioId) {
                url += url.includes("?")
                  ? `&portfolioId=${portfolioId}`
                  : `?portfolioId=${portfolioId}`;
              }
              router.push(url);
            }}
            style={{
              padding: "0.625rem 1.25rem",
              background: priorityConfig.color,
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Ir a la acción →
          </button>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
