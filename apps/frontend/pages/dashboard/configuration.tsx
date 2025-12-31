import React, { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuth } from "../../contexts/AuthContext";
import {
  getPortfoliosByEmail,
  getPortfolioConfiguration,
  updatePortfolioConfiguration,
  PortfolioConfiguration,
  TargetWeight,
} from "../../lib/api";
import DashboardSidebar from "../../components/DashboardSidebar";
import { invalidatePortfolioCache } from "../../lib/hooks/use-portfolio-data";
import {
  DollarSign,
  BarChart,
  TrendingUp,
  Settings,
  Scale,
  Edit,
  Shield,
  Bell,
} from "lucide-react";
import { NumberInput } from "../../components/NumberInput";
import { formatNumberES, formatPercentES } from "../../lib/number-format";

/**
 * Portfolio Configuration Page
 * Allows users to customize strategy parameters, leverage range, and target weights
 */
export default function Configuration() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [_config, setConfig] = useState<PortfolioConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Form state for editable fields
  const [formData, setFormData] = useState({
    monthlyContribution: 0,
    contributionFrequency: "monthly" as
      | "weekly"
      | "biweekly"
      | "monthly"
      | "quarterly",
    contributionDayOfMonth: 1,
    contributionEnabled: true,
    leverageMin: 2.5,
    leverageMax: 4.0,
    leverageTarget: 3.0,
    useDynamicSharpeRebalance: true,
    meanReturnShrinkage: 0.6,
    riskFreeRate: 0.02,
    maintenanceMarginRatio: 0.05,
    safeMarginRatio: 0.15,
    criticalMarginRatio: 0.1,
    maxWeight: 0.4,
    minWeight: 0.05,
  });

  const [targetWeights, setTargetWeights] = useState<TargetWeight[]>([]);

  // Load portfolio and configuration
  useEffect(() => {
    async function loadConfig() {
      const urlPortfolioId = router.query.portfolioId as string;
      let pId = urlPortfolioId;

      if (!pId && user?.email) {
        try {
          const portfolios = await getPortfoliosByEmail(user.email);
          if (portfolios && portfolios.length > 0) {
            pId = portfolios[0].id;
          }
        } catch {
          setError("Failed to load portfolio");
          setIsLoading(false);
          return;
        }
      }

      if (pId) {
        setPortfolioId(pId);
        try {
          const configData = await getPortfolioConfiguration(pId);
          setConfig(configData);
          setFormData({
            monthlyContribution: configData.monthlyContribution || 0,
            contributionFrequency:
              configData.contributionFrequency || "monthly",
            contributionDayOfMonth: configData.contributionDayOfMonth || 1,
            contributionEnabled: configData.contributionEnabled ?? true,
            leverageMin: configData.leverageMin || 2.5,
            leverageMax: configData.leverageMax || 4.0,
            leverageTarget: configData.leverageTarget || 3.0,
            useDynamicSharpeRebalance:
              configData.useDynamicSharpeRebalance ?? true,
            meanReturnShrinkage: configData.meanReturnShrinkage || 0.6,
            riskFreeRate: configData.riskFreeRate || 0.02,
            maintenanceMarginRatio: configData.maintenanceMarginRatio || 0.05,
            safeMarginRatio: configData.safeMarginRatio || 0.15,
            criticalMarginRatio: configData.criticalMarginRatio || 0.1,
            maxWeight: configData.maxWeight || 0.4,
            minWeight: configData.minWeight || 0.05,
          });
          setTargetWeights(configData.targetWeights || []);
        } catch {
          setError("Failed to load configuration");
        }
      }
      setIsLoading(false);
    }

    if (!loading && !user) {
      router.push("/");
    } else if (user) {
      loadConfig();
    }
  }, [user, loading, router, router.query.portfolioId]);

  const handleInputChange = (
    field: string,
    value: number | boolean | string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleWeightChange = (index: number, weight: number) => {
    setTargetWeights((prev) =>
      prev.map((tw, i) => (i === index ? { ...tw, weight } : tw))
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!portfolioId) return;

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      // Validate weights sum to ~100%
      const totalWeight = targetWeights.reduce((sum, tw) => sum + tw.weight, 0);
      if (Math.abs(totalWeight - 1) > 0.01) {
        setError(
          `Los pesos objetivo deben sumar 100%. Actualmente: ${formatNumberES(
            totalWeight * 100,
            {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }
          )}%`
        );
        setIsSaving(false);
        return;
      }

      await updatePortfolioConfiguration(portfolioId, {
        ...formData,
        targetWeights,
      });

      // Invalidate cache, especially recommendations which depend on configuration
      invalidatePortfolioCache(portfolioId, user?.email);

      setMessage("✅ Configuración guardada correctamente");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar configuración"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <>
        <Head>
          <title>Cargando...</title>
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

  if (!user) return null;

  const totalWeight = targetWeights.reduce((sum, tw) => sum + tw.weight, 0);
  const weightsValid = Math.abs(totalWeight - 1) <= 0.01;

  return (
    <>
      <Head>
        <title>Configuración - Leveraged DCA App</title>
        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 768px) {
            .config-wrapper {
              padding: 1rem !important;
              padding-top: 4rem !important;
            }
            .config-grid {
              grid-template-columns: 1fr !important;
              gap: 1rem !important;
            }
            .config-actions {
              flex-direction: column-reverse !important;
            }
            .config-actions button {
              width: 100% !important;
            }
          }
          @media (max-width: 480px) {
            .config-wrapper {
              padding: 0.75rem !important;
              padding-top: 4rem !important;
            }
          }
        `}} />
      </Head>
      <DashboardSidebar portfolioId={portfolioId}>
        <div
          style={{
            padding: "2rem",
            paddingTop: "4rem",
          }}
          className="config-wrapper"
        >
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Settings size={24} />
                  Configuración del Portfolio
                </div>
              </h1>
              <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                Personaliza los parámetros de la estrategia DCA apalancada
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Contribution Settings */}
              <ConfigSection
                title={
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <DollarSign size={18} />
                    Aportación Periódica
                  </div>
                }
              >
                <div style={gridStyle} className="config-grid">
                  <InputField
                    label="Monto de Aportación (USD)"
                    value={formData.monthlyContribution}
                    onChange={(v) =>
                      handleInputChange("monthlyContribution", v)
                    }
                    type="number"
                    min={0}
                    step={100}
                  />
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontWeight: "500",
                        marginBottom: "0.5rem",
                        color: "#cbd5e1",
                        fontSize: "0.875rem",
                      }}
                    >
                      Frecuencia
                    </label>
                    <select
                      value={formData.contributionFrequency}
                      onChange={(e) =>
                        handleInputChange(
                          "contributionFrequency",
                          e.target.value as
                            | "weekly"
                            | "biweekly"
                            | "monthly"
                            | "quarterly"
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "0.625rem 0.875rem",
                        background: "rgba(255,255,255,0.05)",
                        color: "white",
                        border: "1px solid #334155",
                        borderRadius: "6px",
                        fontSize: "0.95rem",
                      }}
                    >
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Bisemanal</option>
                      <option value="monthly">Mensual</option>
                      <option value="quarterly">Trimestral</option>
                    </select>
                  </div>
                  {formData.contributionFrequency === "weekly" ||
                  formData.contributionFrequency === "biweekly" ? (
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontWeight: "500",
                          marginBottom: "0.5rem",
                          color: "#cbd5e1",
                          fontSize: "0.875rem",
                        }}
                      >
                        Día de la Semana
                      </label>
                      <select
                        value={formData.contributionDayOfMonth}
                        onChange={(e) =>
                          handleInputChange(
                            "contributionDayOfMonth",
                            parseInt(e.target.value)
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "0.625rem 0.875rem",
                          background: "rgba(255,255,255,0.05)",
                          color: "white",
                          border: "1px solid #334155",
                          borderRadius: "6px",
                          fontSize: "0.95rem",
                        }}
                      >
                        <option value={0}>Domingo</option>
                        <option value={1}>Lunes</option>
                        <option value={2}>Martes</option>
                        <option value={3}>Miércoles</option>
                        <option value={4}>Jueves</option>
                        <option value={5}>Viernes</option>
                        <option value={6}>Sábado</option>
                      </select>
                    </div>
                  ) : (
                    <InputField
                      label={
                        formData.contributionFrequency === "monthly"
                          ? "Día del Mes"
                          : "Día del Mes (Ene, Abr, Jul, Oct)"
                      }
                      value={formData.contributionDayOfMonth}
                      onChange={(v) =>
                        handleInputChange("contributionDayOfMonth", v)
                      }
                      type="number"
                      min={1}
                      max={31}
                    />
                  )}
                  <CheckboxField
                    label="Aportaciones Habilitadas"
                    checked={formData.contributionEnabled}
                    onChange={(v) =>
                      handleInputChange("contributionEnabled", v)
                    }
                  />
                </div>
              </ConfigSection>

              {/* Leverage Settings */}
              <ConfigSection
                title={
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <BarChart size={18} />
                    Rango de Leverage
                  </div>
                }
              >
                <div style={gridStyle}>
                  <InputField
                    label="Leverage Mínimo"
                    value={formData.leverageMin}
                    onChange={(v) => handleInputChange("leverageMin", v)}
                    type="number"
                    min={1}
                    max={10}
                    step={0.1}
                    suffix="x"
                  />
                  <InputField
                    label="Leverage Máximo"
                    value={formData.leverageMax}
                    onChange={(v) => handleInputChange("leverageMax", v)}
                    type="number"
                    min={1}
                    max={10}
                    step={0.1}
                    suffix="x"
                  />
                  <InputField
                    label="Leverage Objetivo"
                    value={formData.leverageTarget}
                    onChange={(v) => handleInputChange("leverageTarget", v)}
                    type="number"
                    min={1}
                    max={10}
                    step={0.1}
                    suffix="x"
                  />
                </div>
                <p style={helpTextStyle}>
                  El sistema recomendará reborrow cuando el leverage baje del
                  mínimo, y aporte extra cuando suba del máximo.
                </p>
              </ConfigSection>

              {/* Target Weights */}
              <ConfigSection
                title={
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Scale size={18} />
                    Asignación de Pesos
                  </div>
                }
              >
                {/* Weight allocation method selector */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: "500",
                      marginBottom: "0.75rem",
                      color: "#cbd5e1",
                      fontSize: "0.875rem",
                    }}
                  >
                    Método de Asignación
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "center",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        padding: "0.75rem 1rem",
                        background: formData.useDynamicSharpeRebalance
                          ? "rgba(59, 130, 246, 0.2)"
                          : "rgba(255,255,255,0.05)",
                        border: formData.useDynamicSharpeRebalance
                          ? "1px solid #3b82f6"
                          : "1px solid #334155",
                        borderRadius: "8px",
                        flex: 1,
                      }}
                    >
                      <input
                        type="radio"
                        name="weightMethod"
                        checked={formData.useDynamicSharpeRebalance}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            useDynamicSharpeRebalance: true,
                          })
                        }
                        style={{ accentColor: "#3b82f6" }}
                      />
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            color: "#f1f5f9",
                            fontWeight: "600",
                          }}
                        >
                          <TrendingUp size={16} />
                          Optimización Sharpe
                        </div>
                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: "0.75rem",
                            marginTop: "0.25rem",
                          }}
                        >
                          Los pesos se calculan automáticamente para maximizar
                          el ratio Sharpe
                        </div>
                      </div>
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        padding: "0.75rem 1rem",
                        background: !formData.useDynamicSharpeRebalance
                          ? "rgba(59, 130, 246, 0.2)"
                          : "rgba(255,255,255,0.05)",
                        border: !formData.useDynamicSharpeRebalance
                          ? "1px solid #3b82f6"
                          : "1px solid #334155",
                        borderRadius: "8px",
                        flex: 1,
                      }}
                    >
                      <input
                        type="radio"
                        name="weightMethod"
                        checked={!formData.useDynamicSharpeRebalance}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            useDynamicSharpeRebalance: false,
                          })
                        }
                        style={{ accentColor: "#3b82f6" }}
                      />
                      <div>
                        <div style={{ color: "#f1f5f9", fontWeight: "600" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <Edit size={16} />
                            Asignación Manual
                          </div>
                        </div>
                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: "0.75rem",
                            marginTop: "0.25rem",
                          }}
                        >
                          Define manualmente los pesos objetivo de cada activo
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Show target weights sliders only if manual allocation is selected */}
                {!formData.useDynamicSharpeRebalance &&
                targetWeights.length > 0 ? (
                  <>
                    <div style={{ marginBottom: "1rem" }}>
                      {targetWeights.map((tw, idx) => (
                        <div
                          key={tw.symbol}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            marginBottom: "0.75rem",
                            padding: "0.75rem",
                            background: "rgba(255,255,255,0.03)",
                            borderRadius: "8px",
                          }}
                        >
                          <span
                            style={{
                              color: "#f1f5f9",
                              fontWeight: "600",
                              minWidth: "100px",
                            }}
                          >
                            {tw.symbol}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={tw.weight * 100}
                            onChange={(e) =>
                              handleWeightChange(
                                idx,
                                parseFloat(e.target.value) / 100
                              )
                            }
                            style={{
                              flex: 1,
                              accentColor: "#3b82f6",
                            }}
                          />
                          <NumberInput
                            value={tw.weight * 100}
                            onChange={(val) =>
                              handleWeightChange(
                                idx,
                                isNaN(val) ? 0 : val / 100
                              )
                            }
                            min={0}
                            max={100}
                            step={1}
                            decimals={1}
                            style={{
                              width: "70px",
                              padding: "0.5rem",
                              background: "rgba(255,255,255,0.1)",
                              color: "white",
                              border: "1px solid #334155",
                              borderRadius: "4px",
                              fontSize: "0.9rem",
                              textAlign: "right",
                            }}
                          />
                          <span style={{ color: "#94a3b8" }}>%</span>
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem 1rem",
                        background: weightsValid
                          ? "rgba(34, 197, 94, 0.1)"
                          : "rgba(239, 68, 68, 0.1)",
                        borderRadius: "8px",
                        border: `1px solid ${
                          weightsValid
                            ? "rgba(34, 197, 94, 0.3)"
                            : "rgba(239, 68, 68, 0.3)"
                        }`,
                      }}
                    >
                      <span
                        style={{
                          color: weightsValid ? "#22c55e" : "#ef4444",
                          fontWeight: "600",
                        }}
                      >
                        Total:{" "}
                        {formatNumberES(totalWeight * 100, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                        %
                      </span>
                      {!weightsValid && (
                        <span
                          style={{ color: "#f87171", fontSize: "0.875rem" }}
                        >
                          Los pesos deben sumar 100%
                        </span>
                      )}
                    </div>
                  </>
                ) : formData.useDynamicSharpeRebalance ? (
                  <div
                    style={{
                      padding: "1rem",
                      background: "rgba(59, 130, 246, 0.1)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      borderRadius: "8px",
                      color: "#cbd5e1",
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      Los pesos se calcularán automáticamente mediante
                      optimización Sharpe cuando realices un rebalance.
                    </p>
                  </div>
                ) : (
                  <p style={{ color: "#94a3b8", fontStyle: "italic" }}>
                    No hay activos configurados. Actualiza las posiciones del
                    portfolio primero.
                  </p>
                )}

                {/* Weight Limits - Only visible when Sharpe optimization is selected */}
                {formData.useDynamicSharpeRebalance && (
                  <div style={{ marginTop: "1.5rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1rem",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          color: "#f1f5f9",
                          margin: 0,
                        }}
                      >
                        📏 Límites de Peso
                      </h3>
                    </div>
                    <div style={gridStyle}>
                      <InputField
                        label="Peso Máximo por Activo"
                        value={formData.maxWeight * 100}
                        onChange={(v) =>
                          handleInputChange("maxWeight", v / 100)
                        }
                        type="number"
                        min={10}
                        max={100}
                        step={5}
                        suffix="%"
                        help="Peso máximo permitido para cualquier activo individual"
                      />
                      <InputField
                        label="Peso Mínimo por Activo"
                        value={formData.minWeight * 100}
                        onChange={(v) =>
                          handleInputChange("minWeight", v / 100)
                        }
                        type="number"
                        min={1}
                        max={50}
                        step={1}
                        suffix="%"
                        help="Peso mínimo permitido para cualquier activo individual"
                      />
                    </div>
                  </div>
                )}
              </ConfigSection>

              {/* Sharpe Optimization - Only visible when Sharpe optimization is selected */}
              {formData.useDynamicSharpeRebalance && (
                <ConfigSection
                  title={
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <TrendingUp size={18} />
                      Optimización Sharpe
                    </div>
                  }
                >
                  <div style={gridStyle}>
                    <InputField
                      label="Shrinkage Retornos"
                      value={formData.meanReturnShrinkage}
                      onChange={(v) =>
                        handleInputChange("meanReturnShrinkage", v)
                      }
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      help="Factor de contracción hacia media global (0-1). Reduce el sobreajuste en la estimación de retornos medios. Valores más altos (cerca de 1) usan más los retornos históricos, valores más bajos (cerca de 0) contraen más hacia cero."
                    />
                    <InputField
                      label="Tasa Libre de Riesgo"
                      value={formData.riskFreeRate * 100}
                      onChange={(v) =>
                        handleInputChange("riskFreeRate", v / 100)
                      }
                      type="number"
                      min={0}
                      max={10}
                      step={0.5}
                      suffix="%"
                      help="Tasa de interés libre de riesgo anual (ej: bonos del tesoro). Se usa para calcular el Sharpe Ratio: (Retorno - Tasa Libre de Riesgo) / Volatilidad. Valores típicos: 2-3%."
                    />
                  </div>
                </ConfigSection>
              )}

              {/* Margin Settings */}
              <ConfigSection
                title={
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Shield size={18} />
                    Márgenes de Seguridad
                  </div>
                }
              >
                <div style={gridStyle}>
                  <InputField
                    label="Margen de Mantenimiento"
                    value={formData.maintenanceMarginRatio * 100}
                    onChange={(v) =>
                      handleInputChange("maintenanceMarginRatio", v / 100)
                    }
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    suffix="%"
                    help="Margen mínimo requerido por el broker (5% típico)"
                  />
                  <InputField
                    label="Margen Seguro"
                    value={(formData.safeMarginRatio || 0.15) * 100}
                    onChange={(v) =>
                      handleInputChange("safeMarginRatio", v / 100)
                    }
                    type="number"
                    min={5}
                    max={50}
                    step={1}
                    suffix="%"
                    help="Nivel de margen cómodo para operar"
                  />
                  <InputField
                    label="Margen Crítico"
                    value={(formData.criticalMarginRatio || 0.1) * 100}
                    onChange={(v) =>
                      handleInputChange("criticalMarginRatio", v / 100)
                    }
                    type="number"
                    min={1}
                    max={30}
                    step={1}
                    suffix="%"
                    help="Alerta urgente si el margen baja de este nivel"
                  />
                </div>
              </ConfigSection>

              {/* Submit button */}
              <div
                style={{
                  marginTop: "2rem",
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
                className="config-actions"
              >
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  style={{
                    padding: "0.875rem 1.5rem",
                    background: "#1e293b",
                    color: "#cbd5e1",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    fontSize: "0.95rem",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !weightsValid}
                  style={{
                    padding: "0.875rem 2rem",
                    background:
                      isSaving || !weightsValid
                        ? "#475569"
                        : "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.95rem",
                    fontWeight: "600",
                    cursor:
                      isSaving || !weightsValid ? "not-allowed" : "pointer",
                    opacity: isSaving || !weightsValid ? 0.7 : 1,
                  }}
                >
                  {isSaving ? "Guardando..." : "💾 Guardar Configuración"}
                </button>
              </div>
            </form>

            {/* Messages */}
            {message && (
              <div
                style={{
                  marginTop: "1.5rem",
                  padding: "1rem",
                  background: "rgba(34, 197, 94, 0.1)",
                  color: "#22c55e",
                  borderRadius: "8px",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                }}
              >
                {message}
              </div>
            )}

            {error && (
              <div
                style={{
                  marginTop: "1.5rem",
                  padding: "1rem",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  borderRadius: "8px",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>
      </DashboardSidebar>
    </>
  );
}

// Styles
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "1.25rem",
};

const helpTextStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "0.8125rem",
  marginTop: "0.75rem",
  fontStyle: "italic",
};

// Components
function ConfigSection({
  title,
  children,
}: {
  title: string | React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#131b2e",
        border: "1px solid #1e293b",
        borderRadius: "8px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
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
        {title}
      </h2>
      {children}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "number",
  min,
  max,
  step,
  suffix,
  help,
  decimals,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  type?: "number" | "text";
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  help?: string;
  decimals?: number;
}) {
  // Determine decimals based on step if not provided
  const decimalPlaces =
    decimals !== undefined
      ? decimals
      : step && step < 1
      ? step.toString().split(".")[1]?.length || 2
      : step === 0.1
      ? 1
      : 0;

  return (
    <div>
      <label
        style={{
          display: "block",
          fontWeight: "500",
          marginBottom: "0.5rem",
          color: "#cbd5e1",
          fontSize: "0.875rem",
        }}
      >
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {type === "number" ? (
          <NumberInput
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            decimals={decimalPlaces}
            style={{
              flex: 1,
              padding: "0.625rem 0.875rem",
              background: "rgba(255,255,255,0.05)",
              color: "white",
              border: "1px solid #334155",
              borderRadius: "6px",
              fontSize: "0.95rem",
            }}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            style={{
              flex: 1,
              padding: "0.625rem 0.875rem",
              background: "rgba(255,255,255,0.05)",
              color: "white",
              border: "1px solid #334155",
              borderRadius: "6px",
              fontSize: "0.95rem",
            }}
          />
        )}
        {suffix && (
          <span
            style={{ color: "#94a3b8", fontSize: "0.9rem", minWidth: "30px" }}
          >
            {suffix}
          </span>
        )}
      </div>
      {help && (
        <p
          style={{
            color: "#64748b",
            fontSize: "0.75rem",
            marginTop: "0.35rem",
          }}
        >
          {help}
        </p>
      )}
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 0",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          width: "20px",
          height: "20px",
          accentColor: "#3b82f6",
          cursor: "pointer",
        }}
      />
      <label
        style={{
          color: "#cbd5e1",
          fontSize: "0.9rem",
          cursor: "pointer",
        }}
        onClick={() => onChange(!checked)}
      >
        {label}
      </label>
    </div>
  );
}
