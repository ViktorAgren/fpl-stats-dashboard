export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const formatLargeNumber = (num) => {
  if (typeof num !== "number") return num;

  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
};

export const validateFormula = (formula, availableColumns) => {
  if (!formula.trim()) {
    return { isValid: false, error: "Formula cannot be empty" };
  }

  const allowedTokens = [
    ...availableColumns,
    "+",
    "-",
    "*",
    "/",
    "(",
    ")",
    "Math.",
    "parseInt",
    "parseFloat",
    "abs",
    "min",
    "max",
    "round",
    "floor",
    "ceil",
  ];

  const tokens = formula
    .split(/[\s+\-*/()]+/)
    .filter((token) => token.length > 0);

  for (const token of tokens) {
    if (
      !/^\d*\.?\d+$/.test(token) &&
      !allowedTokens.some((allowed) => token.includes(allowed))
    ) {
      return {
        isValid: false,
        error: `Invalid token: ${token}. Only column names, numbers, and basic math operations are allowed.`,
      };
    }
  }

  return { isValid: true };
};
