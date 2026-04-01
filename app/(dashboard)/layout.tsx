import React from "react";

export const metadata = {
  title: "Dashboard - AutoMax",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 text-white p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-8 text-blue-400">AutoMax</h2>
        <nav className="flex-1">
          <ul className="space-y-2">
            <li>
              <a href="/dashboard" className="block px-3 py-2 rounded hover:bg-gray-700 transition">
                Dashboard
              </a>
            </li>
            <li>
              <a href="/dashboard/workflows" className="block px-3 py-2 rounded hover:bg-gray-700 transition">
                Workflows
              </a>
            </li>
            <li>
              <a href="/dashboard/ai" className="block px-3 py-2 rounded hover:bg-gray-700 transition">
                AI Assistant
              </a>
            </li>
            <li>
              <a href="/dashboard/email" className="block px-3 py-2 rounded hover:bg-gray-700 transition">
                Email
              </a>
            </li>
            <li>
              <a href="/dashboard/whatsapp" className="block px-3 py-2 rounded hover:bg-gray-700 transition">
                WhatsApp
              </a>
            </li>
            <li>
              <a href="/dashboard/settings" className="block px-3 py-2 rounded hover:bg-gray-700 transition">
                Settings
              </a>
            </li>
          </ul>
        </nav>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full px-3 py-2 text-left text-gray-400 hover:text-white hover:bg-gray-700 rounded transition"
          >
            Logout
          </button>
        </form>
      </aside>
      <main className="flex-1 p-6 bg-gray-100">{children}</main>
    </div>
  );
}