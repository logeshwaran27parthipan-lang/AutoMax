import React from "react";

export default async function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white rounded shadow">Welcome to AutoMax</div>
        <div className="p-4 bg-white rounded shadow">Recent activity</div>
        <div className="p-4 bg-white rounded shadow">
          <a href="/dashboard/workflows" className="text-blue-600 font-medium">
            Create workflow →
          </a>
        </div>
      </div>
    </div>
  );
}