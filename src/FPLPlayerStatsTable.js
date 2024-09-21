import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { EyeOff, Calculator, RefreshCw, Search, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [columnSearch, setColumnSearch] = useState('');
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const dropdownRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [columnWidths, setColumnWidths] = useState({});
  const [advancedFilters, setAdvancedFilters] = useState({});
  const tableRef = useRef(null);
  const formulaInputRef = useRef(null);

  useEffect(() => {
    fetchPlayerData();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowColumnDropdown(false);
      }
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowAutocomplete(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
        setVisibleColumns(['first_name', "second_name", 'team_name', 'position', 'total_points', 'minutes', 'goals_scored', 'assists', 'clean_sheets']);
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
    setFilters(prev => ({ ...prev, [column]: value }));
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

  const getFormulaAutocomplete = (formula) => {
    const lastWord = formula.split(/[\s+\-*/()]+/).pop();
    return allColumns.filter(column => column.toLowerCase().startsWith(lastWord.toLowerCase()));
  };

  const filteredData = data.filter((row) => {
    return Object.keys(filters).every((column) => {
      const cellValue = row[column]?.toString().toLowerCase() ?? '';
      const filterValue = filters[column].toLowerCase();
      return cellValue.includes(filterValue);
    });
  });

  const handleFormulaChange = (e) => {
    const cursorPosition = e.target.selectionStart;
    setNewColumnFormula(e.target.value);
    setShowAutocomplete(true);
    setTimeout(() => {
      if (formulaInputRef.current) {
        formulaInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  const insertColumnName = (columnName) => {
    if (formulaInputRef.current) {
      const cursorPosition = formulaInputRef.current.selectionStart;
      const textBeforeCursor = newColumnFormula.slice(0, cursorPosition);
      const textAfterCursor = newColumnFormula.slice(cursorPosition);
      const updatedFormula = `${textBeforeCursor}${columnName}${textAfterCursor}`;
      setNewColumnFormula(updatedFormula);
      setShowAutocomplete(false);
      setTimeout(() => {
        const newCursorPosition = cursorPosition + columnName.length;
        formulaInputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        formulaInputRef.current.focus();
      }, 0);
    }
  };
  
  const handleAdvancedFilter = (column, type, value) => {
    setAdvancedFilters(prev => ({
      ...prev,
      [column]: { ...prev[column], [type]: value }
    }));
  };

  const applyFilters = useCallback((data) => {
    return data.filter(row => {
      return Object.entries(filters).every(([column, filterValue]) => {
        if (!filterValue) return true;
        
        const cellValue = row[column];
        const numericValue = parseFloat(cellValue);
  
        if (filterValue.startsWith('>')) {
          const threshold = parseFloat(filterValue.slice(1));
          return !isNaN(numericValue) && numericValue > threshold;
        } else if (filterValue.startsWith('<')) {
          const threshold = parseFloat(filterValue.slice(1));
          return !isNaN(numericValue) && numericValue < threshold;
        } else if (filterValue.startsWith('=')) {
          const target = filterValue.slice(1);
          return cellValue == target; // Using == for loose equality
        } else {
          return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
        }
      });
    });
  }, [filters]);

  const sortedAndFilteredData = useCallback(() => {
    let result = applyFilters(data);
    if (sortColumn) {
      result.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
  
        // Helper function to check if a value is a valid number (including decimals)
        const isNumeric = (value) => {
          if (typeof value === 'number') return true;
          if (typeof value !== 'string') return false;
          return !isNaN(parseFloat(value)) && isFinite(value);
        };
  
        // Convert to numbers if possible
        const aNum = isNumeric(aValue) ? parseFloat(aValue) : aValue;
        const bNum = isNumeric(bValue) ? parseFloat(bValue) : bValue;
  
        if (isNumeric(aNum) && isNumeric(bNum)) {
          // If both values are numeric, compare them as numbers
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        } else {
          // If either value is not numeric, compare as strings
          const aStr = String(aValue).toLowerCase();
          const bStr = String(bValue).toLowerCase();
          return sortDirection === 'asc' 
            ? aStr.localeCompare(bStr, undefined, {numeric: true, sensitivity: 'base'})
            : bStr.localeCompare(aStr, undefined, {numeric: true, sensitivity: 'base'});
        }
      });
    }
    return result;
  }, [data, sortColumn, sortDirection, applyFilters]);

  const filteredColumns = allColumns.filter(column => 
    column.toLowerCase().includes(columnSearch.toLowerCase())
  );

  const handleColumnResize = useCallback((index, newWidth) => {
    setColumnWidths(prev => ({ ...prev, [visibleColumns[index]]: Math.max(newWidth, 50) }));
  }, [visibleColumns]);
  

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    // Helper function to check if a value is a valid number (including decimals)
    const isNumeric = (value) => {
      if (typeof value === 'number') return true;
      if (typeof value !== 'string') return false;
      return !isNaN(parseFloat(value)) && isFinite(value);
    };

    // Convert to numbers if possible
    const aNum = isNumeric(aValue) ? parseFloat(aValue) : aValue;
    const bNum = isNumeric(bValue) ? parseFloat(bValue) : bValue;

    if (isNumeric(aNum) && isNumeric(bNum)) {
      // If both values are numeric, compare them as numbers
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    } else {
      // If either value is not numeric, compare as strings
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return sortDirection === 'asc' 
        ? aStr.localeCompare(bStr, undefined, {numeric: true, sensitivity: 'base'})
        : bStr.localeCompare(aStr, undefined, {numeric: true, sensitivity: 'base'});
    }
  });

  useEffect(() => {
    const handleResize = () => {
      if (tableRef.current) {
        const tableWidth = tableRef.current.offsetWidth;
        const totalColumnWidth = visibleColumns.reduce((sum, col) => sum + (columnWidths[col] || 150), 0);
        if (totalColumnWidth < tableWidth) {
          const extraWidth = tableWidth - totalColumnWidth;
          const widthPerColumn = Math.floor(extraWidth / visibleColumns.length);
          setColumnWidths(prev => {
            const newWidths = { ...prev };
            visibleColumns.forEach(col => {
              newWidths[col] = (newWidths[col] || 150) + widthPerColumn;
            });
            return newWidths;
          });
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [visibleColumns, columnWidths]);

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
        <div className="flex-grow relative" ref={dropdownRef}>
          <button
            onClick={() => setShowColumnDropdown(!showColumnDropdown)}
            className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1 w-full text-left flex items-center justify-between"
          >
            <span>Show/Hide Columns</span>
            <Search size={16} />
          </button>
          {showColumnDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded shadow-lg">
              <input
                type="text"
                value={columnSearch}
                onChange={(e) => setColumnSearch(e.target.value)}
                placeholder="Search columns..."
                className="w-full bg-gray-700 text-gray-300 border-b border-gray-600 rounded-t px-2 py-1"
              />
              <div className="max-h-60 overflow-y-auto">
                {filteredColumns.map(column => (
                  <div
                    key={column}
                    className="px-2 py-1 hover:bg-gray-700 cursor-pointer flex items-center"
                    onClick={() => handleToggleColumn(column)}
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column)}
                      onChange={() => {}}
                      className="mr-2"
                    />
                    {column}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            placeholder="New column name"
            className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1"
          />
          <div className="relative" ref={autocompleteRef}>
            <input
              ref={formulaInputRef}
              type="text"
              value={newColumnFormula}
              onChange={handleFormulaChange}
              onFocus={() => setShowAutocomplete(true)}
              placeholder="Column formula (e.g., goals_scored * 4)"
              className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1"
            />
            {showAutocomplete && (
              <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded shadow-lg max-h-40 overflow-y-auto">
                {getFormulaAutocomplete(newColumnFormula).map(column => (
                  <div
                    key={column}
                    className="px-2 py-1 hover:bg-gray-700 cursor-pointer"
                    onClick={() => insertColumnName(column)}
                  >
                    {column}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleCreateColumn} className="bg-green-600 text-white px-2 py-1 rounded flex items-center">
            <Calculator size={16} className="mr-1" /> Create Column
          </button>
        </div>
        <button onClick={fetchPlayerData} className="bg-blue-600 text-white px-2 py-1 rounded flex items-center">
          <RefreshCw size={16} className="mr-1" /> Refresh Data
        </button>
      </div>
      <div className="overflow-x-auto" ref={tableRef}>
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {visibleColumns.map((column, index) => (
                <th
                  key={column}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer bg-gray-800 border-b border-gray-700 relative"
                  style={{ minWidth: '100px', width: columnWidths[column] || 150 }}
                >
                  <div className="flex items-center justify-between">
                    <span onClick={() => handleSort(column)} className="flex items-center">
                      {column}
                      {sortColumn === column && (
                        sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </span>
                    <button onClick={() => handleToggleColumn(column)} className="text-gray-500 hover:text-gray-300">
                      <EyeOff size={16} />
                    </button>
                  </div>
                  <div
                    className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.pageX;
                      const startWidth = e.target.parentElement.offsetWidth;
                      const handleMouseMove = (mouseMoveEvent) => {
                        const newWidth = startWidth + mouseMoveEvent.pageX - startX;
                        handleColumnResize(index, Math.max(newWidth, 50));
                      };
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                </th>
              ))}
            </tr>
            <tr>
              {visibleColumns.map((column) => (
                <th key={`filter-${column}`} className="px-6 py-2 bg-gray-800 border-b border-gray-700">
                  <input
                    type="text"
                    onChange={(e) => handleFilter(column, e.target.value)}
                    placeholder={`Filter ${column} (>, <, =)`}
                    className="w-full bg-gray-700 text-gray-300 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
  {sortedAndFilteredData().map((row, rowIndex) => (
    <tr key={row.id} className={rowIndex % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
      {visibleColumns.map((column) => (
        <td
          key={`${row.id}-${column}`}
          className="px-6 py-4 whitespace-nowrap border-b border-gray-700 overflow-hidden text-ellipsis"
          style={{ minWidth: '100px', width: columnWidths[column] || 150 }}
        >
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