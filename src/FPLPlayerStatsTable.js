import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  EyeOff,
  Calculator,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Table,
  Download,
  Filter,
} from "lucide-react";
import {
  applyFilters,
  sortData,
  exportToCsv,
  getFormulaAutocomplete,
  createCustomColumn,
} from "./utils/dataUtils";
import {
  processPlayerData,
  getDefaultVisibleColumns,
} from "./utils/playerUtils";
import {
  debounce,
  formatLargeNumber,
  validateFormula,
} from "./utils/performanceUtils";

export default function FPLPlayerStatsTable() {
  const [data, setData] = useState([]);
  const [allColumns, setAllColumns] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [filters, setFilters] = useState({});
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnFormula, setNewColumnFormula] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [columnSearch, setColumnSearch] = useState("");
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [columnWidths, setColumnWidths] = useState({});
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showEmptyRows, setShowEmptyRows] = useState(true);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  // State declarations
  const dropdownRef = useRef(null);
  const autocompleteRef = useRef(null);
  const tableRef = useRef(null);
  const formulaInputRef = useRef(null);

  const handleSort = useCallback((column) => {
    setSortColumn((prev) => {
      if (prev === column) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
        return column;
      } else {
        setSortDirection("asc");
        return column;
      }
    });
  }, []);

  const debouncedFilter = useCallback(() => {
    return debounce((column, value) => {
      setFilters((prev) => ({ ...prev, [column]: value }));
    }, 300);
  }, []);

  const handleFilter = useCallback(
    (column, value) => {
      debouncedFilter()(column, value);
    },
    [debouncedFilter],
  );

  const handleToggleColumn = useCallback((column) => {
    setVisibleColumns((prev) =>
      prev.includes(column)
        ? prev.filter((col) => col !== column)
        : [...prev, column],
    );
  }, []);

  const sortedAndFilteredData = useCallback(() => {
    let filteredData = applyFilters(data, filters);

    // Filter out empty rows if option is disabled
    if (!showEmptyRows) {
      filteredData = filteredData.filter((row) => row.total_points > 0);
    }

    return sortData(filteredData, sortColumn, sortDirection);
  }, [data, filters, sortColumn, sortDirection, showEmptyRows]);

  const paginatedData = useCallback(() => {
    const allData = sortedAndFilteredData();
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return allData.slice(startIndex, endIndex);
  }, [sortedAndFilteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedAndFilteredData().length / pageSize);

  const toggleRowSelection = useCallback((rowId) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, []);

  const toggleAllRowSelection = useCallback(() => {
    const currentData = paginatedData();
    const allCurrentIds = new Set(currentData.map((row) => row.id));
    const allSelected = currentData.every((row) => selectedRows.has(row.id));

    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        // Deselect all current page items
        allCurrentIds.forEach((id) => newSet.delete(id));
      } else {
        // Select all current page items
        allCurrentIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  }, [paginatedData, selectedRows]);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const exportData = useCallback(() => {
    const dataToExport =
      selectedRows.size > 0
        ? sortedAndFilteredData().filter((row) => selectedRows.has(row.id))
        : sortedAndFilteredData();

    const filename =
      selectedRows.size > 0
        ? `player_analysis_selected_${selectedRows.size}.csv`
        : "player_analysis.csv";

    exportToCsv(dataToExport, visibleColumns, filename);
  }, [visibleColumns, sortedAndFilteredData, selectedRows]);

  const handleCreateColumn = useCallback(() => {
    if (
      newColumnName &&
      newColumnFormula &&
      !allColumns.includes(newColumnName)
    ) {
      const validation = validateFormula(newColumnFormula, allColumns);
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }

      try {
        const updatedData = createCustomColumn(
          data,
          newColumnName,
          newColumnFormula,
          allColumns,
        );
        setData(updatedData);
        setAllColumns((prev) => [...prev, newColumnName]);
        setVisibleColumns((prev) => [...prev, newColumnName]);
        setNewColumnName("");
        setNewColumnFormula("");
      } catch (error) {
        console.error("Invalid formula:", error);
        alert(error.message);
      }
    }
  }, [newColumnName, newColumnFormula, allColumns, data]);

  const getAutocompleteColumns = useCallback(
    (formula) => {
      return getFormulaAutocomplete(formula, allColumns);
    },
    [allColumns],
  );

  const handleFormulaChange = useCallback((e) => {
    const cursorPosition = e.target.selectionStart;
    setNewColumnFormula(e.target.value);
    setShowAutocomplete(true);
    setTimeout(() => {
      if (formulaInputRef.current) {
        formulaInputRef.current.setSelectionRange(
          cursorPosition,
          cursorPosition,
        );
      }
    }, 0);
  }, []);

  const insertColumnName = useCallback(
    (columnName) => {
      if (formulaInputRef.current) {
        const cursorPosition = formulaInputRef.current.selectionStart;
        const textBeforeCursor = newColumnFormula.slice(0, cursorPosition);
        const textAfterCursor = newColumnFormula.slice(cursorPosition);
        const updatedFormula = `${textBeforeCursor}${columnName}${textAfterCursor}`;
        setNewColumnFormula(updatedFormula);
        setShowAutocomplete(false);
        setTimeout(() => {
          const newCursorPosition = cursorPosition + columnName.length;
          formulaInputRef.current.setSelectionRange(
            newCursorPosition,
            newCursorPosition,
          );
          formulaInputRef.current.focus();
        }, 0);
      }
    },
    [newColumnFormula],
  );

  // Function declarations

  const filteredColumns = useCallback(() => {
    return allColumns.filter((column) =>
      column.toLowerCase().includes(columnSearch.toLowerCase()),
    );
  }, [allColumns, columnSearch]);

  const handleColumnResize = useCallback(
    (index, newWidth) => {
      setColumnWidths((prev) => ({
        ...prev,
        [visibleColumns[index]]: Math.max(newWidth, 50),
      }));
    },
    [visibleColumns],
  );

  const fetchPlayerData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bootstrapStaticResponse = await axios.get(
        "http://localhost:3001/api/bootstrap-static",
      );
      const allPlayers = bootstrapStaticResponse.data.elements;

      const processedData = await Promise.all(
        allPlayers.map(async (player) => {
          try {
            const playerResponse = await axios.get(
              `http://localhost:3001/api/element-summary/${player.id}`,
            );
            const playerData = playerResponse.data;

            const processedPlayer = processPlayerData(
              player,
              playerData.history,
              bootstrapStaticResponse.data.teams,
              bootstrapStaticResponse.data.element_types,
            );

            return {
              ...processedPlayer,
              upcoming_fixtures: playerData.fixtures.length,
            };
          } catch (error) {
            console.error(
              `Error fetching data for player ${player.id}:`,
              error,
            );
            return null;
          }
        }),
      );

      const validData = processedData.filter((player) => player !== null);
      setData(validData);

      if (validData.length > 0) {
        const columns = Object.keys(validData[0]);
        setAllColumns(columns);
        setVisibleColumns(getDefaultVisibleColumns());
      }
    } catch (error) {
      console.error("Error fetching player data:", error);
      setError("Failed to fetch player data. Please try again later.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlayerData();
  }, [fetchPlayerData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "a":
            e.preventDefault();
            toggleAllRowSelection();
            break;
          case "e":
            e.preventDefault();
            exportData();
            break;
          case "r":
            e.preventDefault();
            fetchPlayerData();
            break;
          default:
            break;
        }
      }
      if (e.key === "Escape") {
        clearSelection();
        setShowColumnDropdown(false);
        setShowAutocomplete(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleAllRowSelection, exportData, fetchPlayerData, clearSelection]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowColumnDropdown(false);
      }
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target)
      ) {
        setShowAutocomplete(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (tableRef.current) {
        const tableWidth = tableRef.current.offsetWidth;
        const totalColumnWidth = visibleColumns.reduce(
          (sum, col) => sum + (columnWidths[col] || 150),
          0,
        );
        if (totalColumnWidth < tableWidth) {
          const extraWidth = tableWidth - totalColumnWidth;
          const widthPerColumn = Math.floor(extraWidth / visibleColumns.length);
          setColumnWidths((prev) => {
            const newWidths = { ...prev };
            visibleColumns.forEach((col) => {
              newWidths[col] = (newWidths[col] || 150) + widthPerColumn;
            });
            return newWidths;
          });
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [visibleColumns, columnWidths]);

  if (loading) {
    return (
      <div className="text-slate-200 text-center py-10">
        <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
        <div>Loading player data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-10">
        {error}
        <br />
        <button
          onClick={fetchPlayerData}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
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
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="flex-grow relative" ref={dropdownRef}>
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 rounded-lg px-3 py-2 w-full text-left flex items-center justify-between transition-colors"
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
                    {filteredColumns().map((column) => (
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
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="New variable name"
                className="w-full sm:w-48 bg-slate-700 text-slate-200 border border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    {getAutocompleteColumns(newColumnFormula).map((column) => (
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
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center transition-colors"
              >
                <Calculator size={16} className="mr-2" /> Create Variable
              </button>
            </div>

            {/* Table Options */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-700 text-slate-200 border border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
                <option value={-1}>All rows</option>
              </select>

              <label className="flex items-center gap-2 bg-slate-700 text-slate-200 border border-slate-600 rounded-md px-3 py-2">
                <input
                  type="checkbox"
                  checked={showEmptyRows}
                  onChange={(e) => setShowEmptyRows(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Show 0-point players</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {selectedRows.size > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={clearSelection}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 rounded-md text-sm transition-colors"
                  >
                    Clear ({selectedRows.size})
                  </button>
                </div>
              )}
              <button
                onClick={exportData}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center justify-center transition-colors"
                title="Ctrl+E"
              >
                <Download size={16} className="mr-2" />
                Export{" "}
                {selectedRows.size > 0
                  ? `Selected (${selectedRows.size})`
                  : "CSV"}
              </button>
              <button
                onClick={fetchPlayerData}
                className="w-full sm:w-auto bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-md flex items-center justify-center transition-colors"
                title="Ctrl+R"
              >
                <RefreshCw size={16} className="mr-2" /> Refresh
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div
            className="overflow-x-auto rounded-lg border border-slate-700"
            ref={tableRef}
          >
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider bg-slate-800 border-b border-slate-700 w-12">
                    <input
                      type="checkbox"
                      checked={
                        paginatedData().length > 0 &&
                        paginatedData().every((row) => selectedRows.has(row.id))
                      }
                      onChange={toggleAllRowSelection}
                      className="rounded"
                      title="Select all on this page (Ctrl+A)"
                    />
                  </th>
                  {visibleColumns.map((column, index) => (
                    <th
                      key={column}
                      className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer bg-slate-800 border-b border-slate-700 relative"
                      style={{
                        minWidth: "100px",
                        width: columnWidths[column] || 150,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          onClick={() => handleSort(column)}
                          className="flex items-center"
                        >
                          {column}
                          {sortColumn === column &&
                            (sortDirection === "asc" ? (
                              <ChevronUp size={16} data-testid="sort-asc" />
                            ) : (
                              <ChevronDown size={16} data-testid="sort-desc" />
                            ))}
                        </span>
                        <button
                          onClick={() => handleToggleColumn(column)}
                          className="text-slate-500 hover:text-slate-300"
                        >
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
                            const newWidth =
                              startWidth + mouseMoveEvent.pageX - startX;
                            handleColumnResize(index, Math.max(newWidth, 50));
                          };
                          const handleMouseUp = () => {
                            document.removeEventListener(
                              "mousemove",
                              handleMouseMove,
                            );
                            document.removeEventListener(
                              "mouseup",
                              handleMouseUp,
                            );
                          };
                          document.addEventListener(
                            "mousemove",
                            handleMouseMove,
                          );
                          document.addEventListener("mouseup", handleMouseUp);
                        }}
                      />
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="px-6 py-2 bg-slate-800 border-b border-slate-700 w-12"></th>
                  {visibleColumns.map((column) => (
                    <th
                      key={`filter-${column}`}
                      className="px-6 py-2 bg-slate-800 border-b border-slate-700"
                    >
                      <div className="relative">
                        <Filter
                          size={16}
                          className="absolute left-3 top-2.5 text-slate-400"
                        />
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
                {(pageSize === -1
                  ? sortedAndFilteredData()
                  : paginatedData()
                ).map((row, rowIndex) => (
                  <tr
                    key={row.id}
                    className={`
                      ${rowIndex % 2 === 0 ? "bg-slate-800" : "bg-slate-750"} 
                      ${selectedRows.has(row.id) ? "bg-blue-900/50" : ""}
                      hover:bg-slate-700 transition-colors cursor-pointer
                    `}
                    onClick={() => toggleRowSelection(row.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap border-b border-slate-700 w-12">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => {}} // Handled by row click
                        className="rounded"
                      />
                    </td>
                    {visibleColumns.map((column) => (
                      <td
                        key={`${row.id}-${column}`}
                        className="px-6 py-4 whitespace-nowrap border-b border-slate-700 text-slate-300"
                        style={{
                          minWidth: "100px",
                          width: columnWidths[column] || 150,
                        }}
                      >
                        {typeof row[column] === "number"
                          ? formatLargeNumber(row[column])
                          : row[column]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex items-center justify-between bg-slate-800 px-6 py-3 rounded-lg border border-slate-700 mt-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(
                    currentPage * pageSize,
                    sortedAndFilteredData().length,
                  )}{" "}
                  of {sortedAndFilteredData().length} results
                </span>
                {selectedRows.size > 0 && (
                  <span className="text-blue-400">
                    ({selectedRows.size} selected)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-200 rounded transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-200 rounded transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-200 rounded transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-200 rounded transition-colors"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
