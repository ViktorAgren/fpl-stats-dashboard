import React from "react";
import FPLPlayerStatsTable from "./FPLPlayerStatsTable";

function App() {
  return (
    <div className="bg-gray-900 min-h-screen">
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-2xl font-bold">
          Fantasy Premier League Player Stats
        </h1>
      </header>
      <main className="p-4">
        <FPLPlayerStatsTable />
      </main>
    </div>
  );
}

export default App;
