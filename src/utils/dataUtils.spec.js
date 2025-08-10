import {
  applyFilters,
  sortData,
  getFormulaAutocomplete,
  createCustomColumn,
} from "./dataUtils";

describe("dataUtils", () => {
  describe("applyFilters", () => {
    const testData = [
      { name: "Player A", points: 100, team: "Arsenal" },
      { name: "Player B", points: 50, team: "Chelsea" },
      { name: "Player C", points: 75, team: "Arsenal" },
    ];

    test("returns all data when no filters applied", () => {
      expect(applyFilters(testData, {})).toEqual(testData);
    });

    test("filters by greater than numeric value", () => {
      const result = applyFilters(testData, { points: ">60" });
      expect(result).toEqual([
        { name: "Player A", points: 100, team: "Arsenal" },
        { name: "Player C", points: 75, team: "Arsenal" },
      ]);
    });

    test("filters by less than numeric value", () => {
      const result = applyFilters(testData, { points: "<60" });
      expect(result).toEqual([
        { name: "Player B", points: 50, team: "Chelsea" },
      ]);
    });

    test("filters by exact string match", () => {
      const result = applyFilters(testData, { team: "=Arsenal" });
      expect(result).toEqual([
        { name: "Player A", points: 100, team: "Arsenal" },
        { name: "Player C", points: 75, team: "Arsenal" },
      ]);
    });

    test("filters by partial string match", () => {
      const result = applyFilters(testData, { name: "Player A" });
      expect(result).toEqual([
        { name: "Player A", points: 100, team: "Arsenal" },
      ]);
    });

    test("applies multiple filters", () => {
      const result = applyFilters(testData, { team: "Arsenal", points: ">80" });
      expect(result).toEqual([
        { name: "Player A", points: 100, team: "Arsenal" },
      ]);
    });
  });

  describe("sortData", () => {
    const testData = [
      { name: "Charlie", points: 50 },
      { name: "Alice", points: 100 },
      { name: "Bob", points: 75 },
    ];

    test("returns original data when no sort column specified", () => {
      expect(sortData(testData, null, "asc")).toEqual(testData);
    });

    test("sorts numeric values ascending", () => {
      const result = sortData(testData, "points", "asc");
      expect(result).toEqual([
        { name: "Charlie", points: 50 },
        { name: "Bob", points: 75 },
        { name: "Alice", points: 100 },
      ]);
    });

    test("sorts numeric values descending", () => {
      const result = sortData(testData, "points", "desc");
      expect(result).toEqual([
        { name: "Alice", points: 100 },
        { name: "Bob", points: 75 },
        { name: "Charlie", points: 50 },
      ]);
    });

    test("sorts string values ascending", () => {
      const result = sortData(testData, "name", "asc");
      expect(result).toEqual([
        { name: "Alice", points: 100 },
        { name: "Bob", points: 75 },
        { name: "Charlie", points: 50 },
      ]);
    });
  });

  describe("getFormulaAutocomplete", () => {
    const columns = ["goals_scored", "goals_conceded", "assists", "points"];

    test("returns matching columns for partial input", () => {
      const result = getFormulaAutocomplete("goa", columns);
      expect(result).toEqual(["goals_scored", "goals_conceded"]);
    });

    test("returns empty array for no matches", () => {
      const result = getFormulaAutocomplete("xyz", columns);
      expect(result).toEqual([]);
    });

    test("handles formula with operators", () => {
      const result = getFormulaAutocomplete("points + goa", columns);
      expect(result).toEqual(["goals_scored", "goals_conceded"]);
    });
  });

  describe("createCustomColumn", () => {
    const testData = [
      { goals: 5, assists: 3 },
      { goals: 2, assists: 1 },
    ];
    const columns = ["goals", "assists"];

    test("creates new column with simple formula", () => {
      const result = createCustomColumn(
        testData,
        "total_contributions",
        "goals + assists",
        columns,
      );
      expect(result).toEqual([
        { goals: 5, assists: 3, total_contributions: 8 },
        { goals: 2, assists: 1, total_contributions: 3 },
      ]);
    });

    test("throws error for missing column name", () => {
      expect(() => {
        createCustomColumn(testData, "", "goals + assists", columns);
      }).toThrow("Column name and formula are required");
    });

    test("throws error for invalid formula", () => {
      expect(() => {
        createCustomColumn(testData, "invalid", "invalid_syntax(", columns);
      }).toThrow("Invalid formula:");
    });
  });
});
