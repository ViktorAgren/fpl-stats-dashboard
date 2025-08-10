import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FPLPlayerStatsTable from "./FPLPlayerStatsTable";

// Mock axios
jest.mock("axios", () => ({
  get: jest.fn(),
}));

import axios from "axios";
const mockAxios = axios;

const mockBootstrapData = {
  elements: [
    {
      id: 1,
      first_name: "Mohamed",
      second_name: "Salah",
      team: 12,
      element_type: 3,
    },
    {
      id: 2,
      first_name: "Harry",
      second_name: "Kane",
      team: 6,
      element_type: 4,
    },
  ],
  teams: [
    { id: 12, name: "Liverpool" },
    { id: 6, name: "Tottenham" },
  ],
  element_types: [
    { id: 3, singular_name: "Midfielder" },
    { id: 4, singular_name: "Forward" },
  ],
};

const mockPlayerData = {
  history: [
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
  ],
  fixtures: [{ id: 1 }, { id: 2 }],
};

describe("FPLPlayerStatsTable Integration Tests", () => {
  beforeEach(() => {
    mockAxios.get.mockClear();
  });

  test("loads and displays player data correctly", async () => {
    mockAxios.get
      .mockResolvedValueOnce({ data: mockBootstrapData })
      .mockResolvedValue({ data: mockPlayerData });

    render(<FPLPlayerStatsTable />);

    expect(screen.getByText("Loading player data...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Mohamed")).toBeInTheDocument();
    });
  });

  test("displays error state when API fails", async () => {
    mockAxios.get.mockRejectedValue(new Error("API Error"));

    render(<FPLPlayerStatsTable />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to fetch player data/),
      ).toBeInTheDocument();
    });
  });

  test("sorts data when column header clicked", async () => {
    mockAxios.get
      .mockResolvedValueOnce({ data: mockBootstrapData })
      .mockResolvedValue({ data: mockPlayerData });

    render(<FPLPlayerStatsTable />);

    await waitFor(() => {
      expect(screen.getByText("Mohamed")).toBeInTheDocument();
    });

    const firstNameHeader = screen.getByText("first_name");
    fireEvent.click(firstNameHeader);

    expect(screen.getByTestId("sort-asc")).toBeInTheDocument();
  });

  test("opens column management dropdown", async () => {
    mockAxios.get
      .mockResolvedValueOnce({ data: mockBootstrapData })
      .mockResolvedValue({ data: mockPlayerData });

    render(<FPLPlayerStatsTable />);

    await waitFor(() => {
      expect(screen.getByText("Mohamed")).toBeInTheDocument();
    });

    const columnButton = screen.getByText("Variables Selection");
    fireEvent.click(columnButton);

    expect(
      screen.getByPlaceholderText("Search variables..."),
    ).toBeInTheDocument();
  });

  test("creates custom formula column", async () => {
    mockAxios.get
      .mockResolvedValueOnce({ data: mockBootstrapData })
      .mockResolvedValue({ data: mockPlayerData });

    render(<FPLPlayerStatsTable />);

    await waitFor(() => {
      expect(screen.getByText("Mohamed")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const nameInput = screen.getByPlaceholderText("New variable name");
    const formulaInput = screen.getByPlaceholderText(/Formula/);
    const createButton = screen.getByText("Create Variable");

    await user.type(nameInput, "test_column");
    await user.type(formulaInput, "goals_scored + assists");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getAllByText("test_column")).toHaveLength(2); // Once in dropdown, once in header
    });
  });

  test("exports data to CSV", async () => {
    mockAxios.get
      .mockResolvedValueOnce({ data: mockBootstrapData })
      .mockResolvedValue({ data: mockPlayerData });

    render(<FPLPlayerStatsTable />);

    await waitFor(() => {
      expect(screen.getByText("Mohamed")).toBeInTheDocument();
    });

    const createElementSpy = jest.spyOn(document, "createElement");
    const exportButton = screen.getByText("Export CSV");

    fireEvent.click(exportButton);

    expect(createElementSpy).toHaveBeenCalledWith("a");
  });
});
