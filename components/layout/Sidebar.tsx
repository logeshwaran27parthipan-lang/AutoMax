"use client";
import React from "react";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-800 text-white p-4">
      <h2 className="text-xl font-bold mb-6">YOUR APP NAME</h2>
      <nav>
        <ul>
          <li className="mb-2">
            <a href="/dashboard" className="hover:underline">
              Dashboard
            </a>
          </li>
          <li>
            <a href="/dashboard/ai" className="block px-3 py-2 rounded hover:bg-gray-700 transition">
              AI Assistant
            </a>
          </li>
          <li className="mb-2">
            <a href="/dashboard/workflows" className="hover:underline">
              Workflows
            </a>
          </li>
          <li className="mb-2">
            <a href="/dashboard/settings" className="hover:underline">
              Settings
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
