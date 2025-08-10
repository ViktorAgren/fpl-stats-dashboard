export const processPlayerData = (player, playerHistory, teams, positions) => {
  const totalStats = playerHistory.reduce((acc, gw) => {
    Object.keys(gw).forEach((key) => {
      if (typeof gw[key] === "number") {
        acc[key] = (acc[key] || 0) + gw[key];
      }
    });
    return acc;
  }, {});

  const team = teams.find((t) => t.id === player.team);
  const position = positions.find((et) => et.id === player.element_type);

  return {
    player_name: `${player.first_name} ${player.second_name}`,
    ...player,
    team_name: team ? team.name : "Unknown",
    position: position ? position.singular_name : "Unknown",
    total_points: totalStats.total_points || 0,
    minutes: totalStats.minutes || 0,
    goals_scored: totalStats.goals_scored || 0,
    assists: totalStats.assists || 0,
    clean_sheets: totalStats.clean_sheets || 0,
    games_played: playerHistory.length,
  };
};

export const getDefaultVisibleColumns = () => [
  "first_name",
  "second_name",
  "team_name",
  "position",
  "total_points",
  "minutes",
  "goals_scored",
  "assists",
  "clean_sheets",
];
