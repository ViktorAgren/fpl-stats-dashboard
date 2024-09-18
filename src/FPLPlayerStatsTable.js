import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { EyeOff, Calculator, RefreshCw } from 'lucide-react';

const API_BASE_URL = 'https://fantasy.premierleague.com/api';

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
  const [debugInfo, setDebugInfo] = useState('');
  const [customProxyUrl, setCustomProxyUrl] = useState('');

  useEffect(() => {
    fetchPlayerData();
  }, []);

  const fetchPlayerData = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo('');
    try {
      const baseUrl = customProxyUrl ? `${customProxyUrl}${API_BASE_URL}` : API_BASE_URL;
      setDebugInfo(prevInfo => prevInfo + `Fetching data from: ${baseUrl}\n`);

      const bootstrapStaticResponse = await axios.get(`${baseUrl}/bootstrap-static/`);
      setDebugInfo(prevInfo => prevInfo + `Bootstrap static data fetched successfully.\n`);

      const allPlayers = bootstrapStaticResponse.data.elements;
      setDebugInfo(prevInfo => prevInfo + `Total players: ${allPlayers.length}\n`);

      // Fetch data for first 5 players only (for quicker testing)
      const processedData = await Promise.all(allPlayers.slice(0, 5).map(async (player) => {
        try {
          const playerResponse = await axios.get(`${baseUrl}/element-summary/${player.id}/`);
          setDebugInfo(prevInfo => prevInfo + `Fetched data for player ${player.id}\n`);

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
            id: player.id,
            team_name: team ? team.name : 'Unknown',
            position: position ? position.singular_name : 'Unknown',
            total_points: totalStats.total_points || 0,
            minutes: totalStats.minutes || 0,
            goals_scored: totalStats.goals_scored || 0,
            assists: totalStats.assists || 0,
            clean_sheets: totalStats.clean_sheets || 0,
            games_played: playerData.history.length,
            upcoming_fixtures: playerData.fixtures.length,
            form: parseFloat(player.form) || 0,
            price: player.now_cost / 10,
          };
        } catch (error) {
          setDebugInfo(prevInfo => prevInfo + `Error fetching data for player ${player.id}: ${error.message}\n`);
          return null;
        }
      }));

      const validData = processedData.filter(player => player !== null);
      setData(validData);
      setDebugInfo(prevInfo => prevInfo + `Processed ${validData.length} players successfully.\n`);

      if (validData.length > 0) {
        const columns = Object.keys(validData[0]);
        setAllColumns(columns);
        setVisibleColumns(['player_name', 'team_name', 'position', 'total_points', 'price', 'form']);
      }
    } catch (error) {
      console.error('Error fetching player data:', error);
      setDebugInfo(prevInfo => prevInfo + `Error: ${error.message}\nStack: ${error.stack}\n`);
      if (error.response) {
        setDebugInfo(prevInfo => prevInfo + `Response data: ${JSON.stringify(error.response.data)}\n`);
        setDebugInfo(prevInfo => prevInfo + `Response status: ${error.response.status}\n`);
        setDebugInfo(prevInfo => prevInfo + `Response headers: ${JSON.stringify(error.response.headers)}\n`);
      }
      setError('Failed to fetch player data. Please check the debug information and try again.');
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
        <p>{error}</p>
        <div className="mt-4">
          <p className="text-white mb-2">To access the data, you can:</p>
          <ol className="text-white text-left list-decimal list-inside mb-4">
            <li>Use a CORS browser extension (for development only)</li>
            <li>Set up a local proxy server</li>
            <li>Deploy this app with a backend that handles the API requests</li>
          </ol>
          <input
            type="text"
            value={customProxyUrl}
            onChange={(e) => setCustomProxyUrl(e.target.value)}
            placeholder="Enter custom proxy URL (optional)"
            className="w-full bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 mb-2"
          />
          <button onClick={fetchPlayerData} className="bg-green-600 text-white px-4 py-2 rounded">
            Retry
          </button>
        </div>
        <div className="mt-4 text-left bg-gray-800 p-4 rounded">
          <h3 className="text-white font-bold mb-2">Debug Information:</h3>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap">{debugInfo}</pre>
        </div>
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