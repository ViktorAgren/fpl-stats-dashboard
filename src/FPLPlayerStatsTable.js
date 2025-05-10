import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { EyeOff, Calculator, RefreshCw, ChevronDown, ChevronUp, Table, Download, Filter } from 'lucide-react';

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
  const [columnWidths, setColumnWidths] = useState({});
  // State declarations
  const dropdownRef = useRef(null);
  const autocompleteRef = useRef(null);
  const tableRef = useRef(null);
  const formulaInputRef = useRef(null);

  const handleSort = useCallback((column) => {
    setSortColumn(prev => {
      if (prev === column) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        return column;
      } else {
        setSortDirection('asc');
        return column;
      }
    });
  }, []);

  const handleFilter = useCallback((column, value) => {
    setFilters(prev => ({ ...prev, [column]: value }));
  }, []);

  const handleToggleColumn = useCallback((column) => {
    setVisibleColumns(prev => 
      prev.includes(column) 
        ? prev.filter(col => col !== column)
        : [...prev, column]
    );
  }, []);

  const applyFilters = useCallback((dataToFilter) => {
    return dataToFilter.filter(row => {
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
          return cellValue === target;
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
  
        const isNumeric = (value) => {
          if (typeof value === 'number') return true;
          if (typeof value !== 'string') return false;
          return !isNaN(parseFloat(value)) && isFinite(value);
        };
  
        const aNum = isNumeric(aValue) ? parseFloat(aValue) : aValue;
        const bNum = isNumeric(bValue) ? parseFloat(bValue) : bValue;
  
        if (isNumeric(aNum) && isNumeric(bNum)) {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        } else {
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

  const exportData = useCallback(() => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + visibleColumns.join(",") + "\n"
      + sortedAndFilteredData().map(row => 
          visibleColumns.map(col => `"${row[col]}"`).join(",")
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "player_analysis.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [visibleColumns, sortedAndFilteredData]);

  const handleCreateColumn = useCallback(() => {
    if (newColumnName && newColumnFormula && !allColumns.includes(newColumnName)) {
      try {
        // Using eval indirectly via Function constructor is necessary for the custom formula feature
        // eslint-disable-next-line no-new-func
        setData(prevData => {
          return prevData.map(row => {
            // eslint-disable-next-line no-new-func
            const result = new Function(...allColumns, `return ${newColumnFormula}`)(...allColumns.map(col => row[col]));
            return { ...row, [newColumnName]: result };
          });
        });
        
        setAllColumns(prev => [...prev, newColumnName]);
        setVisibleColumns(prev => [...prev, newColumnName]);
        setNewColumnName('');
        setNewColumnFormula('');
      } catch (error) {
        console.error('Invalid formula:', error);
        alert('Invalid formula. Please check and try again.');
      }
    }
  }, [newColumnName, newColumnFormula, allColumns]);

  const getFormulaAutocomplete = useCallback((formula) => {
    const lastWord = formula.split(/[\s+\-*/()]+/).pop();
    return allColumns.filter(column => column.toLowerCase().startsWith(lastWord.toLowerCase()));
  }, [allColumns]);

  const handleFormulaChange = useCallback((e) => {
    const cursorPosition = e.target.selectionStart;
    setNewColumnFormula(e.target.value);
    setShowAutocomplete(true);
    setTimeout(() => {
      if (formulaInputRef.current) {
        formulaInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  }, []);

  const insertColumnName = useCallback((columnName) => {
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
  }, [newColumnFormula]);

  // Function declarations

  const filteredColumns = useCallback(() => {
    return allColumns.filter(column => 
      column.toLowerCase().includes(columnSearch.toLowerCase())
    );
  }, [allColumns, columnSearch]);

  const handleColumnResize = useCallback((index, newWidth) => {
    setColumnWidths(prev => ({ ...prev, [visibleColumns[index]]: Math.max(newWidth, 50) }));
  }, [visibleColumns]);

  const fetchPlayerData = useCallback(async () => {
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
        setVisibleColumns(['first_name', 'second_name', 'team_name', 'position', 'total_points', 'minutes', 'goals_scored', 'assists', 'clean_sheets']);
      }
    } catch (error) {
      console.error('Error fetching player data:', error);
      setError('Failed to fetch player data. Please try again later.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlayerData();
  }, [fetchPlayerData]);

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
    return <div className="text-slate-200 text-center py-10">Loading player data...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-10">
        {error}
        <br />
        <button onClick={fetchPlayerData} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl">
      <div className="p-6">
        <div className="space-y-4">
          {/* Control Panel */}
          <div className="flex flex-wrap gap-4 items-center bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="flex-grow relative" ref={dropdownRef}>
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 rounded-md px-3 py-2 w-full text-left flex items-center justify-between transition-colors"
              >
                <span className="flex items-center">
                  <Table size={16} className="mr-2" />
                  Variables Selection
                </span>
                <ChevronDown size={16} />
              </button>
              {showColumnDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                  <div className="p-2 border-b border-slate-700">
                    <input
                      type="text"
                      value={columnSearch}
                      onChange={(e) => setColumnSearch(e.target.value)}
                      placeholder="Search variables..."
                      className="w-full bg-slate-700 text-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {filteredColumns().map(column => (
                      <div
                        key={column}
                        className="px-3 py-2 hover:bg-slate-700 cursor-pointer flex items-center"
                        onClick={() => handleToggleColumn(column)}
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(column)}
                          onChange={() => {}}
                          className="mr-2"
                        />
                        <span className="text-slate-200">{column}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Formula Creation */}
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="New variable name"
                className="bg-slate-700 text-slate-200 border border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="relative flex-grow" ref={autocompleteRef}>
                <input
                  ref={formulaInputRef}
                  type="text"
                  value={newColumnFormula}
                  onChange={handleFormulaChange}
                  onFocus={() => setShowAutocomplete(true)}
                  placeholder="Formula (e.g., goals_scored / minutes * 90)"
                  className="w-full bg-slate-700 text-slate-200 border border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showAutocomplete && (
                  <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {getFormulaAutocomplete(newColumnFormula).map(column => (
                      <div
                        key={column}
                        className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-slate-200"
                        onClick={() => insertColumnName(column)}
                      >
                        {column}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button 
                onClick={handleCreateColumn} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center transition-colors"
              >
                <Calculator size={16} className="mr-2" /> Create Variable
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button 
                onClick={exportData} 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center transition-colors"
              >
                <Download size={16} className="mr-2" /> Export CSV
              </button>
              <button 
                onClick={fetchPlayerData} 
                className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-md flex items-center transition-colors"
              >
                <RefreshCw size={16} className="mr-2" /> Refresh
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-700" ref={tableRef}>
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  {visibleColumns.map((column, index) => (
                    <th
                      key={column}
                      className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer bg-slate-800 border-b border-slate-700 relative"
                      style={{ minWidth: '100px', width: columnWidths[column] || 150 }}
                    >
                      <div className="flex items-center justify-between">
                        <span onClick={() => handleSort(column)} className="flex items-center">
                          {column}
                          {sortColumn === column && (
                            sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                          )}
                        </span>
                        <button onClick={() => handleToggleColumn(column)} className="text-slate-500 hover:text-slate-300">
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
                    <th key={`filter-${column}`} className="px-6 py-2 bg-slate-800 border-b border-slate-700">
                      <div className="relative">
                        <Filter size={16} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          onChange={(e) => handleFilter(column, e.target.value)}
                          placeholder="Filter... (>, <, =)"
                          className="w-full bg-slate-700 text-slate-300 border border-slate-600 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredData().map((row, rowIndex) => (
                  <tr 
                    key={row.id} 
                    className={`
                      ${rowIndex % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'} 
                      hover:bg-slate-700 transition-colors
                    `}
                  >
                    {visibleColumns.map((column) => (
                      <td
                        key={`${row.id}-${column}`}
                        className="px-6 py-4 whitespace-nowrap border-b border-slate-700 text-slate-300"
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
      </div>
    </div>
  );
}