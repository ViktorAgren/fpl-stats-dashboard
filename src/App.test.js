import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("axios", () => ({
  get: jest.fn(),
}));

test("renders Fantasy Premier League header", () => {
  render(<App />);
  const headerElement = screen.getByText(
    /Fantasy Premier League Player Stats/i,
  );
  expect(headerElement).toBeInTheDocument();
});
