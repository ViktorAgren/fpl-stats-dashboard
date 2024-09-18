import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { EyeOff, Calculator, RefreshCw } from 'lucide-react';

export default function FPLPlayerStatsTable() {
  const [data, setData] = useState([]);
  const [allColumns, setAllColumns] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [filters, setFilters] = useState({});
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnFormula, setNewColumnFormula] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlayerData();
  }, []);

  const fetchPlayerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const bootstrapStaticResponse = await axios.get('http://localhost:3001/api/bootstrap-static');
      const allPlayers = bootstrapStaticResponse.data.elements;

      const processedData = await Promise.all(allPlayers.map(async (player) => {
        try {
          const playerResponse = await axios.get(`http://localhost:3001/api/element-summary/${player.id}`);
          const playerData = playerResponse.data;

          const totalStats = playerData.history.reduce((acc, gw) => {
            Object.keys(gw).forEach(key => {
              if (typeof gw[key] === 'number') {
                acc[key] = (acc[key] || 0) + gw[key];
              }
            });
            return acc;
          }, {});

          const team = bootstrapStaticResponse.data.teams.find(t => t.id === player.team);
          const position = bootstrapStaticResponse.data.element_types.find(et => et.id === player.element_type);

          return {
            player_name: `${player.first_name} ${player.second_name}`,
            ...player,
            team_name: team ? team.name : 'Unknown',
            position: position ? position.singular_name : 'Unknown',
            total_points: totalStats.total_points || 0,
            minutes: totalStats.minutes || 0,
            goals_scored: totalStats.goals_scored || 0,
            assists: totalStats.assists || 0,
            clean_sheets: totalStats.clean_sheets || 0,
            games_played: playerData.history.length,
            upcoming_fixtures: playerData.fixtures.length,
          };
        } catch (error) {
          console.error(`Error fetching data for player ${player.id}:`, error);
          return null;
        }
      }));

      const validData = processedData.filter(player => player !== null);
      setData(validData);

      if (validData.length > 0) {
        const columns = Object.keys(validData[0]);
        setAllColumns(columns);
        // Set initial visible columns: player_name and a few important stats
        setVisibleColumns(['player_name', 'team_name', 'position', 'total_points', 'minutes', 'goals_scored', 'assists', 'clean_sheets']);
      }
    } catch (error) {
      console.error('Error fetching player data:', error);
      setError('Failed to fetch player data. Please try again later.');
    }
    setLoading(false);
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleFilter = (column, value) => {
    setFilters({ ...filters, [column]: value });
  };

  const handleToggleColumn = (column) => {
    if (visibleColumns.includes(column)) {
      setVisibleColumns(visibleColumns.filter(col => col !== column));
    } else {
      setVisibleColumns([...visibleColumns, column]);
    }
  };

  const handleCreateColumn = () => {
    if (newColumnName && newColumnFormula && !allColumns.includes(newColumnName)) {
      try {
        const newData = data.map(row => {
          const result = new Function(...allColumns, `return ${newColumnFormula}`)(...allColumns.map(col => row[col]));
          return { ...row, [newColumnName]: result };
        });
        setData(newData);
        setAllColumns([...allColumns, newColumnName]);
        setVisibleColumns([...visibleColumns, newColumnName]);
        setNewColumnName('');
        setNewColumnFormula('');
      } catch (error) {
        console.error('Invalid formula:', error);
        alert('Invalid formula. Please check and try again.');
      }
    }
  };

  const filteredData = data.filter((row) => {
    return Object.keys(filters).every((column) => {
      const cellValue = row[column]?.toString().toLowerCase() ?? '';
      const filterValue = filters[column].toLowerCase();
      return cellValue.includes(filterValue);
    });
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) {
    return <div className="text-white text-center py-10">Loading player data...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-10">
        {error}
        <br />
        <button onClick={fetchPlayerData} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-900 text-gray-300">
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex-grow">
          <select
            onChange={(e) => handleToggleColumn(e.target.value)}
            value=""
            className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1"
          >
            <option value="" disabled>Show/Hide Columns</option>
            {allColumns.map(column => (
              <option key={column} value={column}>
                {visibleColumns.includes(column) ? `Hide ${column}` : `Show ${column}`}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            placeholder="New column name"
            className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1"
          />
          <input
            type="text"
            value={newColumnFormula}
            onChange={(e) => setNewColumnFormula(e.target.value)}
            placeholder="Column formula (e.g., goals_scored * 4)"
            className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1"
          />
          <button onClick={handleCreateColumn} className="bg-green-600 text-white px-2 py-1 rounded flex items-center">
            <Calculator size={16} className="mr-1" /> Create Column
          </button>
        </div>
        <button onClick={fetchPlayerData} className="bg-blue-600 text-white px-2 py-1 rounded flex items-center">
          <RefreshCw size={16} className="mr-1" /> Refresh Data
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer bg-gray-800 border-b border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <span onClick={() => handleSort(column)}>
                      {column}
                      {sortColumn === column && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </span>
                    <button onClick={() => handleToggleColumn(column)} className="text-gray-500 hover:text-gray-300">
                      <EyeOff size={16} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
            <tr>
              {visibleColumns.map((column) => (
                <th key={`filter-${column}`} className="px-6 py-2 bg-gray-800 border-b border-gray-700">
                  <input
                    type="text"
                    onChange={(e) => handleFilter(column, e.target.value)}
                    placeholder={`Filter ${column}`}
                    className="w-full bg-gray-700 text-gray-300 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIndex) => (
              <tr key={row.id} className={rowIndex % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                {visibleColumns.map((column) => (
                  <td key={`${row.id}-${column}`} className="px-6 py-4 whitespace-nowrap border-b border-gray-700">
                    {typeof row[column] === 'number' ? row[column].toLocaleString() : row[column]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}