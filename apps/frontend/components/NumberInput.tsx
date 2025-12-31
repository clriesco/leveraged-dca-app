import React, { useState, useEffect } from "react";
import { parseNumberES, formatForInput } from "../lib/number-format";

/**
 * Number input component that:
 * - Uses comma as decimal separator
 * - Allows completely empty input (no min constraint blocking deletion)
 * - Converts comma to point internally for numeric operations
 */
interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  decimals = 2,
  placeholder,
  disabled,
  style,
  className,
}: NumberInputProps) {
  const [displayValue, setDisplayValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState(false);

  // Update display value when prop value changes (but not while user is typing)
  useEffect(() => {
    if (!isFocused) {
      if (value === null || value === undefined || isNaN(value)) {
        setDisplayValue("");
      } else {
        // Format the value, removing trailing zeros
        const formatted = formatForInput(value, decimals);
        setDisplayValue(formatted);
      }
    }
  }, [value, decimals, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty input
    if (inputValue === "" || inputValue === "-") {
      setDisplayValue(inputValue);
      onChange(NaN);
      return;
    }

    // Parse the value (handles comma as decimal separator)
    const numValue = parseNumberES(inputValue);

    // If valid number, update both display and numeric value
    if (!isNaN(numValue)) {
      setDisplayValue(inputValue);
      
      // Apply min/max constraints
      let constrainedValue = numValue;
      if (min !== undefined && constrainedValue < min) {
        constrainedValue = min;
      }
      if (max !== undefined && constrainedValue > max) {
        constrainedValue = max;
      }

      onChange(constrainedValue);
    } else {
      // Invalid input, but keep it in display for user to correct
      setDisplayValue(inputValue);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // On blur, ensure the display value matches the numeric value
    if (value !== null && value !== undefined && !isNaN(value)) {
      setDisplayValue(formatForInput(value, decimals));
    } else {
      setDisplayValue("");
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      style={style}
      className={className}
    />
  );
}

