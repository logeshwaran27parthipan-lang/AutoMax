"use client";
import React from "react";

export default function Navbar() {
  return (
    <header className="w-full bg-white shadow p-4 flex justify-between items-center">
      <div className="font-bold">YOUR APP NAME</div>
      <div>
        <a href="/dashboard/settings" className="text-sm text-gray-600">
          Settings
        </a>
      </div>
    </header>
  );
}
