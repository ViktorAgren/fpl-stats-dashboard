import React from 'react';
import FPLPlayerStatsTable from './FPLPlayerStatsTable';

function App() {
  return (
    <div className="bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-100 p-4">Fantasy Premier League Player Stats</h1>
      <FPLPlayerStatsTable />
    </div>
  );
}

export default App;