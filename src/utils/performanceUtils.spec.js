import {
  debounce,
  throttle,
  formatLargeNumber,
  validateFormula,
} from "./performanceUtils";

describe("performanceUtils", () => {
  describe("debounce", () => {
    test("delays function execution", (done) => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(mockFn).not.toHaveBeenCalled();

      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1);
        done();
      }, 150);
    });
  });

  describe("throttle", () => {
    test("limits function calls", (done) => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(mockFn).toHaveBeenCalledTimes(1);

      setTimeout(() => {
        throttledFn();
        expect(mockFn).toHaveBeenCalledTimes(2);
        done();
      }, 150);
    });
  });

  describe("formatLargeNumber", () => {
    test("formats numbers correctly", () => {
      expect(formatLargeNumber(1500000)).toBe("1.5M");
      expect(formatLargeNumber(2500)).toBe("2.5K");
      expect(formatLargeNumber(999)).toBe("999");
      expect(formatLargeNumber("not a number")).toBe("not a number");
    });
  });

  describe("validateFormula", () => {
    const columns = ["goals", "assists", "minutes"];

    test("validates correct formulas", () => {
      const result = validateFormula("goals + assists", columns);
      expect(result.isValid).toBe(true);
    });

    test("rejects empty formulas", () => {
      const result = validateFormula("  ", columns);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Formula cannot be empty");
    });

    test("rejects invalid tokens", () => {
      const result = validateFormula("goals + invalidColumn", columns);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid token: invalidColumn");
    });

    test("accepts math functions", () => {
      const result = validateFormula("Math.round(goals / minutes)", columns);
      expect(result.isValid).toBe(true);
    });
  });
});
