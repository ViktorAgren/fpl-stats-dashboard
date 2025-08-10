import {
  createTag,
  predefinedTags,
  applyTagFilters,
  getTagColor,
  getTagColorInactive,
} from "./tagUtils";

describe("tagUtils", () => {
  describe("createTag", () => {
    test("creates tag with default color", () => {
      const tag = createTag("Test Tag", () => true);

      expect(tag).toEqual({
        id: expect.any(String),
        name: "Test Tag",
        filter: expect.any(Function),
        color: "blue",
        active: false,
      });
    });

    test("creates tag with custom color", () => {
      const tag = createTag("Test Tag", () => true, "red");

      expect(tag.color).toBe("red");
    });
  });

  describe("predefinedTags", () => {
    test("contains expected number of predefined tags", () => {
      expect(predefinedTags).toHaveLength(10);
    });

    test("all predefined tags have required properties", () => {
      predefinedTags.forEach((tag) => {
        expect(tag).toHaveProperty("id");
        expect(tag).toHaveProperty("name");
        expect(tag).toHaveProperty("filter");
        expect(tag).toHaveProperty("color");
        expect(tag).toHaveProperty("active");
        expect(typeof tag.filter).toBe("function");
      });
    });

    test("Top Scorers filter works correctly", () => {
      const topScorersTag = predefinedTags.find(
        (tag) => tag.name === "Top Scorers",
      );
      const highScorer = { total_points: 150 };
      const lowScorer = { total_points: 50 };

      expect(topScorersTag.filter(highScorer)).toBe(true);
      expect(topScorersTag.filter(lowScorer)).toBe(false);
    });

    test("Budget Options filter works correctly", () => {
      const budgetTag = predefinedTags.find(
        (tag) => tag.name === "Budget Options",
      );
      const budgetPlayer = { now_cost: 45 };
      const expensivePlayer = { now_cost: 120 };

      expect(budgetTag.filter(budgetPlayer)).toBe(true);
      expect(budgetTag.filter(expensivePlayer)).toBe(false);
    });
  });

  describe("applyTagFilters", () => {
    const testData = [
      { id: 1, total_points: 150, now_cost: 120 },
      { id: 2, total_points: 80, now_cost: 50 },
      { id: 3, total_points: 120, now_cost: 90 },
    ];

    test("returns all data when no active tags", () => {
      const result = applyTagFilters(testData, []);
      expect(result).toEqual(testData);
    });

    test("filters data with single active tag", () => {
      const topScorersTag = {
        ...predefinedTags.find((tag) => tag.name === "Top Scorers"),
        active: true,
      };

      const result = applyTagFilters(testData, [topScorersTag]);
      expect(result).toHaveLength(2);
      expect(result.every((player) => player.total_points >= 100)).toBe(true);
    });

    test("filters data with multiple active tags (AND logic)", () => {
      const topScorersTag = {
        ...predefinedTags.find((tag) => tag.name === "Top Scorers"),
        active: true,
      };
      const premiumTag = {
        ...predefinedTags.find((tag) => tag.name === "Premium"),
        active: true,
      };

      const result = applyTagFilters(testData, [topScorersTag, premiumTag]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe("getTagColor", () => {
    test("returns correct color classes for known colors", () => {
      expect(getTagColor("blue")).toBe(
        "bg-blue-600 hover:bg-blue-700 text-white",
      );
      expect(getTagColor("green")).toBe(
        "bg-green-600 hover:bg-green-700 text-white",
      );
      expect(getTagColor("red")).toBe("bg-red-600 hover:bg-red-700 text-white");
    });

    test("returns default blue for unknown colors", () => {
      expect(getTagColor("unknown")).toBe(
        "bg-blue-600 hover:bg-blue-700 text-white",
      );
    });
  });

  describe("getTagColorInactive", () => {
    test("returns correct inactive color classes", () => {
      expect(getTagColorInactive("blue")).toBe(
        "bg-blue-200 hover:bg-blue-300 text-blue-800",
      );
      expect(getTagColorInactive("green")).toBe(
        "bg-green-200 hover:bg-green-300 text-green-800",
      );
    });

    test("returns default blue for unknown colors", () => {
      expect(getTagColorInactive("unknown")).toBe(
        "bg-blue-200 hover:bg-blue-300 text-blue-800",
      );
    });
  });
});
