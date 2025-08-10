import { processPlayerData, getDefaultVisibleColumns } from "./playerUtils";

describe("playerUtils", () => {
  describe("processPlayerData", () => {
    const mockPlayer = {
      id: 1,
      first_name: "Mohamed",
      second_name: "Salah",
      team: 12,
      element_type: 3,
    };

    const mockHistory = [
      {
        total_points: 12,
        minutes: 90,
        goals_scored: 1,
        assists: 1,
        clean_sheets: 0,
      },
      {
        total_points: 8,
        minutes: 85,
        goals_scored: 0,
        assists: 2,
        clean_sheets: 0,
      },
      {
        total_points: 15,
        minutes: 90,
        goals_scored: 2,
        assists: 0,
        clean_sheets: 0,
      },
    ];

    const mockTeams = [{ id: 12, name: "Liverpool" }];

    const mockPositions = [{ id: 3, singular_name: "Midfielder" }];

    test("processes player data correctly", () => {
      const result = processPlayerData(
        mockPlayer,
        mockHistory,
        mockTeams,
        mockPositions,
      );

      expect(result).toEqual({
        id: 1,
        first_name: "Mohamed",
        second_name: "Salah",
        team: 12,
        element_type: 3,
        player_name: "Mohamed Salah",
        team_name: "Liverpool",
        position: "Midfielder",
        total_points: 35,
        minutes: 265,
        goals_scored: 3,
        assists: 3,
        clean_sheets: 0,
        games_played: 3,
      });
    });

    test("handles missing team data", () => {
      const result = processPlayerData(
        mockPlayer,
        mockHistory,
        [],
        mockPositions,
      );
      expect(result.team_name).toBe("Unknown");
    });

    test("handles missing position data", () => {
      const result = processPlayerData(mockPlayer, mockHistory, mockTeams, []);
      expect(result.position).toBe("Unknown");
    });

    test("handles empty history", () => {
      const result = processPlayerData(
        mockPlayer,
        [],
        mockTeams,
        mockPositions,
      );
      expect(result).toEqual({
        id: 1,
        first_name: "Mohamed",
        second_name: "Salah",
        team: 12,
        element_type: 3,
        player_name: "Mohamed Salah",
        team_name: "Liverpool",
        position: "Midfielder",
        total_points: 0,
        minutes: 0,
        goals_scored: 0,
        assists: 0,
        clean_sheets: 0,
        games_played: 0,
      });
    });
  });

  describe("getDefaultVisibleColumns", () => {
    test("returns expected default columns", () => {
      const result = getDefaultVisibleColumns();
      expect(result).toEqual([
        "first_name",
        "second_name",
        "team_name",
        "position",
        "total_points",
        "minutes",
        "goals_scored",
        "assists",
        "clean_sheets",
      ]);
    });
  });
});
