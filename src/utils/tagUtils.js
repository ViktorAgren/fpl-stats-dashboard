// Tag-based filtering utilities for FPL Player Stats

export const createTag = (name, filter, color = "blue") => ({
  id: Math.random().toString(36).substr(2, 9),
  name,
  filter,
  color,
  active: false,
});

export const predefinedTags = [
  createTag("Top Scorers", (player) => player.total_points >= 100, "green"),
  createTag(
    "Value Players",
    (player) => player.total_points / player.now_cost > 2,
    "yellow",
  ),
  createTag("Consistent", (player) => player.minutes >= 1000, "blue"),
  createTag("Goal Threats", (player) => player.goals_scored >= 5, "red"),
  createTag("Assist Kings", (player) => player.assists >= 5, "purple"),
  createTag("Budget Options", (player) => player.now_cost <= 60, "gray"),
  createTag("Premium", (player) => player.now_cost >= 100, "orange"),
  createTag("Clean Sheet Bonus", (player) => player.clean_sheets >= 5, "cyan"),
  createTag("Bonus Point Magnets", (player) => player.bonus >= 10, "pink"),
  createTag("Injury Prone", (player) => player.minutes < 500, "red"),
];

export const applyTagFilters = (data, activeTags) => {
  if (activeTags.length === 0) return data;

  return data.filter((player) => {
    return activeTags.every((tag) => tag.filter(player));
  });
};

export const getTagColor = (color) => {
  const colors = {
    blue: "bg-blue-600 hover:bg-blue-700 text-white",
    green: "bg-green-600 hover:bg-green-700 text-white",
    yellow: "bg-yellow-600 hover:bg-yellow-700 text-white",
    red: "bg-red-600 hover:bg-red-700 text-white",
    purple: "bg-purple-600 hover:bg-purple-700 text-white",
    gray: "bg-gray-600 hover:bg-gray-700 text-white",
    orange: "bg-orange-600 hover:bg-orange-700 text-white",
    cyan: "bg-cyan-600 hover:bg-cyan-700 text-white",
    pink: "bg-pink-600 hover:bg-pink-700 text-white",
  };
  return colors[color] || colors.blue;
};

export const getTagColorInactive = (color) => {
  const colors = {
    blue: "bg-blue-200 hover:bg-blue-300 text-blue-800",
    green: "bg-green-200 hover:bg-green-300 text-green-800",
    yellow: "bg-yellow-200 hover:bg-yellow-300 text-yellow-800",
    red: "bg-red-200 hover:bg-red-300 text-red-800",
    purple: "bg-purple-200 hover:bg-purple-300 text-purple-800",
    gray: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    orange: "bg-orange-200 hover:bg-orange-300 text-orange-800",
    cyan: "bg-cyan-200 hover:bg-cyan-300 text-cyan-800",
    pink: "bg-pink-200 hover:bg-pink-300 text-pink-800",
  };
  return colors[color] || colors.blue;
};
