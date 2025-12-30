import React, { useState, useEffect, FormEvent, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuth } from "../../contexts/AuthContext";
import {
  updatePositions,
  getPortfoliosByEmail,
  getPortfolioSummary,
  searchSymbols,
  SymbolSearchResult,
} from "../../lib/api";
import DashboardSidebar from "../../components/DashboardSidebar";
import { invalidatePortfolioCache } from "../../lib/hooks/use-portfolio-data";

interface Asset {
  id: string;
  symbol: string;
  name: string;
}

interface PositionInput {
  assetId: string;
  assetSymbol: string;
  assetName: string;
  quantity: string;
  currentQuantity: number;
}

/**
 * Manual portfolio update page
 * Used to register the actual current state of the portfolio
 */
export default function ManualUpdate() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [equity, setEquity] = useState("");
  const [positions, setPositions] = useState<PositionInput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  
  // Symbol search state
  const [searchResults, setSearchResults] = useState<Record<number, SymbolSearchResult[]>>({});
  const [showDropdown, setShowDropdown] = useState<Record<number, boolean>>({});
  const [searchTimeout, setSearchTimeout] = useState<Record<number, NodeJS.Timeout>>({});
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});

  /**
   * Get appropriate decimal places and step for an asset
   * Crypto assets (BTC, ETH) need more precision (8 decimals)
   * Stocks/ETFs need less precision (2-4 decimals)
   */
  const getAssetPrecision = (symbol: string): { decimals: number; step: string } => {
    const cryptoAssets = ['BTC', 'ETH', 'BTC-USD', 'ETH-USD'];
    const isCrypto = cryptoAssets.some(c => symbol.toUpperCase().includes(c));
    
    if (isCrypto) {
      return { decimals: 8, step: '0.00000001' };
    }
    // For stocks/ETFs, use 4 decimals (allows for fractional shares)
    return { decimals: 4, step: '0.0001' };
  };

  /**
   * Format quantity to appropriate precision
   */
  const formatQuantity = (quantity: number, symbol: string): string => {
    const { decimals } = getAssetPrecision(symbol);
    // Round to appropriate decimals and remove trailing zeros
    const rounded = Number(quantity.toFixed(decimals));
    return rounded.toString();
  };

  // Load portfolio and current positions
  useEffect(() => {
    async function loadPortfolio() {
      if (!user?.email) return;

      setIsLoading(true);
      setError("");

      try {
        // Get portfolioId from URL or fetch
        let pId = router.query.portfolioId as string;

        if (!pId) {
          const portfolios = await getPortfoliosByEmail(user.email);
          if (portfolios && portfolios.length > 0) {
            pId = portfolios[0].id;
          } else {
            setError("No se encontró portfolio");
            setIsLoading(false);
            return;
          }
        }

        setPortfolioId(pId);

        // Get current portfolio state
        const summary = await getPortfolioSummary(pId);

        // Set current equity
        setEquity(summary.metrics.equity.toFixed(2));

        // Set positions from current holdings
        // Format quantities to appropriate precision to avoid too many decimals
        const positionInputs: PositionInput[] = summary.positions.map((pos: { asset: Asset; quantity: number }) => {
          const { decimals } = getAssetPrecision(pos.asset.symbol);
          const formattedQuantity = formatQuantity(pos.quantity, pos.asset.symbol);
          
          return {
            assetId: pos.asset.id,
            assetSymbol: pos.asset.symbol,
            assetName: pos.asset.name,
            quantity: formattedQuantity,
            currentQuantity: pos.quantity,
          };
        });

        setPositions(positionInputs);
      } catch (err) {
        console.error("Error loading portfolio:", err);
        setError(err instanceof Error ? err.message : "Error al cargar el portfolio");
      } finally {
        setIsLoading(false);
      }
    }

    if (!loading && !user) {
      router.push("/");
    } else if (user) {
      loadPortfolio();
    }
  }, [user, loading, router, router.query.portfolioId]);

  const handlePositionChange = (index: number, value: string) => {
    const updated = [...positions];
    updated[index] = { ...updated[index], quantity: value };
    setPositions(updated);
  };

  const handleAddNewPosition = () => {
    const newPosition: PositionInput = {
      assetId: "", // Will be created by backend
      assetSymbol: "",
      assetName: "",
      quantity: "0",
      currentQuantity: 0,
      // Add a unique temporary ID for new positions
      tempId: `new-${Date.now()}-${Math.random()}`,
    };
    setPositions([...positions, newPosition]);
  };


  const handleRemovePosition = (index: number) => {
    const position = positions[index];
    
    // If it's an existing position, mark it for deletion by setting quantity to 0
    if (position.assetId) {
      const updated = [...positions];
      updated[index] = {
        ...updated[index],
        quantity: "0", // Mark for deletion
      };
      setPositions(updated);
    } else {
      // If it's a new position, just remove it
      const updated = positions.filter((_, i) => i !== index);
      setPositions(updated);
    }
  };

  const handlePositionSymbolChange = (index: number, symbol: string) => {
    const updated = [...positions];
    updated[index] = {
      ...updated[index],
      assetSymbol: symbol,
      assetName: symbol, // Will be updated when selected
    };
    setPositions(updated);

    // Clear previous timeout
    if (searchTimeout[index]) {
      clearTimeout(searchTimeout[index]);
    }

    // Debounce search
    if (symbol.length >= 2) {
      const timeout = setTimeout(async () => {
        try {
          const results = await searchSymbols(symbol);
          setSearchResults((prev) => ({ ...prev, [index]: results }));
          setShowDropdown((prev) => ({ ...prev, [index]: true }));
        } catch (error) {
          console.error("Error searching symbols:", error);
        }
      }, 300);
      setSearchTimeout((prev) => ({ ...prev, [index]: timeout }));
    } else {
      setSearchResults((prev => ({ ...prev, [index]: [] })));
      setShowDropdown((prev => ({ ...prev, [index]: false })));
    }
  };

  const handleSelectSymbol = (index: number, result: SymbolSearchResult) => {
    const updated = [...positions];
    updated[index] = {
      ...updated[index],
      assetSymbol: result.symbol,
      assetName: result.name,
    };
    setPositions(updated);
    setShowDropdown((prev => ({ ...prev, [index]: false })));
    setSearchResults((prev => ({ ...prev, [index]: [] })));
  };

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
      // Build positions array with current quantities
      // Include all positions (even with quantity 0 to delete existing ones)
      // Round quantities to appropriate precision before sending
      console.log("[ManualUpdate] Starting submit, positions:", positions);
      
      const validPositions = positions
        .filter((p) => {
          // Keep all positions that have a symbol (including those marked for deletion with quantity 0)
          const hasSymbol = !!p.assetSymbol;
          if (!hasSymbol) {
            console.log("[ManualUpdate] Filtering out position without symbol:", p);
          }
          return hasSymbol;
        })
        .map((p) => {
          const { decimals } = getAssetPrecision(p.assetSymbol);
          const quantity = parseFloat(p.quantity);
          // Round to appropriate precision to avoid precision issues
          const roundedQuantity = Number(quantity.toFixed(decimals));
          
          const positionData = {
            symbol: p.assetSymbol,
            quantity: roundedQuantity,
            avgPrice: 0, // Will be fetched from latest prices
            source: "manual", // Required by backend DTO
          };
          
          console.log(`[ManualUpdate] Preparing position: ${p.assetSymbol}, quantity: ${roundedQuantity}, isNew: ${!p.assetId}`);
          return positionData;
        });

      console.log("[ManualUpdate] Valid positions to send:", validPositions);
      console.log("[ManualUpdate] New assets count:", positions.filter((p) => !p.assetId && p.assetSymbol).length);

      if (validPositions.length === 0) {
        throw new Error("Por favor, introduce al menos una posición");
      }

      // Include equity if provided
      const updateData: any = {
        portfolioId,
        positions: validPositions,
      };

      // Add equity if user provided a value
      if (equity && parseFloat(equity) > 0) {
        updateData.equity = parseFloat(equity);
      }

      console.log("[ManualUpdate] Sending update request:", {
        portfolioId,
        positionsCount: validPositions.length,
        hasEquity: !!updateData.equity,
        newAssets: validPositions.filter(p => !positions.find(pos => pos.assetSymbol === p.symbol && pos.assetId)).length
      });

      const response = await updatePositions(updateData);
      console.log("[ManualUpdate] Update response received:", response);

      // Invalidate cache so dashboard shows updated data
      invalidatePortfolioCache(portfolioId, user?.email);

      const newAssetsCount = positions.filter((p) => !p.assetId && p.assetSymbol).length;
      if (newAssetsCount > 0) {
        setMessage(
          `✅ ${newAssetsCount} activo(s) añadido(s) correctamente. Los tickers fueron validados y el histórico descargado. Puedes asignar los pesos objetivo en Configuración.`
        );
      } else {
        setMessage("✅ ¡Portfolio actualizado correctamente!");
      }

      setTimeout(() => {
        setMessage("");
        router.push(`/dashboard?portfolioId=${portfolioId}`);
      }, newAssetsCount > 0 ? 4000 : 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el portfolio");
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
        <title>Actualización Manual - Leveraged DCA App</title>
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
                Actualización Manual del Portfolio
              </h1>
              <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                Registra el estado real actual de tu portfolio (desde tu broker).
              </p>
            </div>

          <form onSubmit={handleSubmit}>
            {/* Equity */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "16px",
                padding: "2rem",
                backdropFilter: "blur(10px)",
                marginBottom: "1.5rem",
              }}
            >
              <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", marginBottom: "1rem" }}>
                Equity Actual
              </h2>
              <input
                type="number"
                step="0.01"
                min="0"
                value={equity}
                onChange={(e) => setEquity(e.target.value)}
                placeholder="e.g., 72500"
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
              <p style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                Tu equity actual en USD (valor total menos cantidad prestada)
              </p>
            </div>

            {/* Positions */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "16px",
                padding: "2rem",
                backdropFilter: "blur(10px)",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", margin: 0 }}>
                  Posiciones Actuales
                </h2>
                <button
                  type="button"
                  onClick={handleAddNewPosition}
                  disabled={isSubmitting}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "rgba(59, 130, 246, 0.2)",
                    color: "#3b82f6",
                    border: "1px solid rgba(59, 130, 246, 0.4)",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    opacity: isSubmitting ? 0.5 : 1,
                  }}
                >
                  + Añadir Activo
                </button>
              </div>

              {positions.length === 0 ? (
                <p style={{ color: "rgba(255, 255, 255, 0.5)" }}>No hay posiciones. Haz clic en "Añadir Activo" para comenzar.</p>
              ) : (
                // Sort positions: new assets (without assetId) first, then existing ones
                // Create a map to find original index for each position
                (() => {
                  const sortedPositions = [...positions].sort((a, b) => {
                    // New assets (no assetId) come first
                    if (!a.assetId && b.assetId) return -1;
                    if (a.assetId && !b.assetId) return 1;
                    return 0;
                  });
                  
                  return sortedPositions.map((pos, sortedIdx) => {
                    // Find the original index in the positions array
                    const originalIdx = positions.findIndex(p => {
                      if (pos.assetId) {
                        // For existing assets, match by assetId
                        return p.assetId === pos.assetId;
                      } else {
                        // For new assets, match by tempId or by reference
                        return (p.tempId && pos.tempId && p.tempId === pos.tempId) || p === pos;
                      }
                    });
                    
                    return (
                      <div
                        key={pos.assetId || `new-${originalIdx}`}
                        style={{
                          marginBottom: sortedIdx < sortedPositions.length - 1 ? "1.5rem" : "0",
                          paddingBottom: sortedIdx < sortedPositions.length - 1 ? "1.5rem" : "0",
                          borderBottom: sortedIdx < sortedPositions.length - 1 ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <label style={{ display: "block", fontWeight: "500", color: "rgba(255, 255, 255, 0.9)" }}>
                            {pos.assetId ? `${pos.assetName} (${pos.assetSymbol})` : "Nuevo Activo"}
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemovePosition(originalIdx)}
                            disabled={isSubmitting}
                            style={{
                              padding: "0.25rem 0.5rem",
                              background: "rgba(239, 68, 68, 0.2)",
                              color: "#ef4444",
                              border: "1px solid rgba(239, 68, 68, 0.4)",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              cursor: isSubmitting ? "not-allowed" : "pointer",
                            }}
                          >
                            {pos.assetId ? "Eliminar" : "Eliminar"}
                          </button>
                        </div>
                        
                        {!pos.assetId && (
                          <div style={{ position: "relative", marginBottom: "0.75rem" }}>
                            <input
                              type="text"
                              value={pos.assetSymbol}
                              onChange={(e) => handlePositionSymbolChange(originalIdx, e.target.value)}
                              onFocus={() => {
                                if (searchResults[originalIdx]?.length > 0) {
                                  setShowDropdown((prev => ({ ...prev, [originalIdx]: true })));
                                }
                              }}
                              onBlur={() => {
                                // Delay to allow click on dropdown item
                                setTimeout(() => {
                                  setShowDropdown((prev => ({ ...prev, [originalIdx]: false })));
                                }, 200);
                              }}
                              placeholder="Buscar símbolo (ej: BTC-USD, SPY, GLD)"
                              disabled={isSubmitting}
                              style={{
                                width: "100%",
                                padding: "0.75rem 1rem",
                                background: "rgba(255, 255, 255, 0.1)",
                                color: "white",
                                border: "2px solid rgba(59, 130, 246, 0.4)",
                                borderRadius: "8px",
                                fontSize: "1rem",
                                boxSizing: "border-box",
                              }}
                            />
                            {showDropdown[originalIdx] && searchResults[originalIdx] && searchResults[originalIdx].length > 0 && (
                              <div
                                ref={(el) => (dropdownRefs.current[originalIdx] = el)}
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  left: 0,
                                  right: 0,
                                  background: "#1e293b",
                                  border: "1px solid #334155",
                                  borderRadius: "8px",
                                  marginTop: "0.25rem",
                                  maxHeight: "300px",
                                  overflowY: "auto",
                                  zIndex: 1000,
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                                }}
                              >
                                {searchResults[originalIdx].map((result, resultIdx) => (
                                  <div
                                    key={`${result.symbol}-${resultIdx}`}
                                    onClick={() => handleSelectSymbol(originalIdx, result)}
                                    onMouseDown={(e) => e.preventDefault()} // Prevent blur
                                    style={{
                                      padding: "0.75rem 1rem",
                                      cursor: "pointer",
                                      borderBottom:
                                        resultIdx < searchResults[originalIdx].length - 1
                                          ? "1px solid #334155"
                                          : "none",
                                      background: "transparent",
                                      transition: "background 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "transparent";
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                      }}
                                    >
                                      <div>
                                        <div
                                          style={{
                                            color: "#f1f5f9",
                                            fontWeight: "600",
                                            fontSize: "0.95rem",
                                          }}
                                        >
                                          {result.symbol}
                                        </div>
                                        <div
                                          style={{
                                            color: "#94a3b8",
                                            fontSize: "0.875rem",
                                            marginTop: "0.25rem",
                                          }}
                                        >
                                          {result.name}
                                        </div>
                                        {result.exchange && (
                                          <div
                                            style={{
                                              color: "#64748b",
                                              fontSize: "0.75rem",
                                              marginTop: "0.125rem",
                                            }}
                                          >
                                            {result.exchange}
                                          </div>
                                        )}
                                      </div>
                                      {result.price !== null && (
                                        <div
                                          style={{
                                            color: "#22c55e",
                                            fontWeight: "600",
                                            fontSize: "0.95rem",
                                          }}
                                        >
                                          ${result.price.toFixed(2)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <input
                          type="number"
                          step={pos.assetSymbol ? getAssetPrecision(pos.assetSymbol).step : "0.0001"}
                          min="0"
                          value={pos.quantity}
                          onChange={(e) => handlePositionChange(originalIdx, e.target.value)}
                      placeholder="Cantidad"
                      disabled={isSubmitting || (pos.assetId && parseFloat(pos.quantity) === 0)}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        background: pos.assetId && parseFloat(pos.quantity) === 0 
                          ? "rgba(239, 68, 68, 0.1)" 
                          : "rgba(255, 255, 255, 0.1)",
                        color: pos.assetId && parseFloat(pos.quantity) === 0 
                          ? "rgba(255, 255, 255, 0.5)" 
                          : "white",
                        border: pos.assetId && parseFloat(pos.quantity) === 0
                          ? "2px solid rgba(239, 68, 68, 0.4)"
                          : "2px solid rgba(255, 255, 255, 0.2)",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        boxSizing: "border-box",
                        marginBottom: "0.75rem",
                        textDecoration: pos.assetId && parseFloat(pos.quantity) === 0 ? "line-through" : "none",
                      }}
                    />
                    {pos.assetId && parseFloat(pos.quantity) === 0 && (
                      <p style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "0.25rem", fontWeight: "500" }}>
                        ⚠️ Este activo se eliminará al guardar
                      </p>
                    )}

                    {/* Info message for new assets */}
                    {!pos.assetId && pos.assetSymbol && (
                      <div style={{
                        padding: "0.75rem 1rem",
                        background: "rgba(59, 130, 246, 0.1)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: "8px",
                        marginTop: "0.5rem",
                      }}>
                        <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.875rem", margin: 0 }}>
                          ℹ️ El sistema validará el ticker y descargará el histórico de precios automáticamente. 
                          Puedes asignar el peso objetivo en la página de Configuración.
                        </p>
                      </div>
                    )}
                    {pos.currentQuantity > 0 && (
                      <p style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                        Actual: {formatQuantity(pos.currentQuantity, pos.assetSymbol)}
                      </p>
                    )}
                      </div>
                    );
                  });
                })()
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !portfolioId}
              style={{
                width: "100%",
                padding: "1rem",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "600",
                opacity: isSubmitting || !portfolioId ? 0.7 : 1,
                cursor: isSubmitting || !portfolioId ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting ? "Guardando..." : "Guardar Estado Actual"}
            </button>
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
