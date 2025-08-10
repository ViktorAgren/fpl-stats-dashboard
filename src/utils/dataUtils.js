export const applyFilters = (data, filters) => {
  return data.filter((row) => {
    return Object.entries(filters).every(([column, filterValue]) => {
      if (!filterValue) return true;

      const cellValue = row[column];
      const numericValue = parseFloat(cellValue);

      if (filterValue.startsWith(">")) {
        const threshold = parseFloat(filterValue.slice(1));
        return !isNaN(numericValue) && numericValue > threshold;
      } else if (filterValue.startsWith("<")) {
        const threshold = parseFloat(filterValue.slice(1));
        return !isNaN(numericValue) && numericValue < threshold;
      } else if (filterValue.startsWith("=")) {
        const target = filterValue.slice(1);
        return cellValue === target;
      } else {
        return String(cellValue)
          .toLowerCase()
          .includes(filterValue.toLowerCase());
      }
    });
  });
};

export const sortData = (data, sortColumn, sortDirection) => {
  if (!sortColumn) return data;

  return [...data].sort((a, b) => {
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    const isNumeric = (value) => {
      if (typeof value === "number") return true;
      if (typeof value !== "string") return false;
      return !isNaN(parseFloat(value)) && isFinite(value);
    };

    const aNum = isNumeric(aValue) ? parseFloat(aValue) : aValue;
    const bNum = isNumeric(bValue) ? parseFloat(bValue) : bValue;

    if (isNumeric(aNum) && isNumeric(bNum)) {
      return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
    } else {
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return sortDirection === "asc"
        ? aStr.localeCompare(bStr, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        : bStr.localeCompare(aStr, undefined, {
            numeric: true,
            sensitivity: "base",
          });
    }
  });
};

export const exportToCsv = (
  data,
  columns,
  filename = "player_analysis.csv",
) => {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    columns.join(",") +
    "\n" +
    data
      .map((row) => columns.map((col) => `"${row[col]}"`).join(","))
      .join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const getFormulaAutocomplete = (formula, availableColumns) => {
  const lastWord = formula.split(/[\s+\-*/()]+/).pop();
  return availableColumns.filter((column) =>
    column.toLowerCase().startsWith(lastWord.toLowerCase()),
  );
};

export const createCustomColumn = (
  data,
  columnName,
  formula,
  availableColumns,
) => {
  if (!columnName || !formula) {
    throw new Error("Column name and formula are required");
  }

  try {
    return data.map((row) => {
      // Using Function constructor is necessary for dynamic formula evaluation
      // eslint-disable-next-line no-new-func
      const result = new Function(...availableColumns, `return ${formula}`)(
        ...availableColumns.map((col) => row[col]),
      );
      return { ...row, [columnName]: result };
    });
  } catch (error) {
    throw new Error(`Invalid formula: ${error.message}`);
  }
};
