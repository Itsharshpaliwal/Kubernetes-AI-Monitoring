"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function DashboardPage() {
  const [status, setStatus] = useState("Checking...");
  const [diagnosis, setDiagnosis] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch(
          `${API_URL}/investigate/ai-diagnose`
        );

        if (!response.ok) {
          throw new Error("AI diagnosis request failed");
        }

        const data = await response.json();

        setStatus(
          data.kubernetes?.healthy ? "Healthy" : "Issues Found"
        );

        setDiagnosis(
          data.kubernetes?.diagnosis ||
            data.ai?.root_cause ||
            "No diagnosis available."
        );
      } catch (err) {
        setStatus("Unavailable");
        setError(
          err instanceof Error
            ? err.message
            : "Failed to connect to backend"
        );
      }
    }

    loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">

        <p className="text-sm font-semibold text-blue-400">
          AI DEVOPS PLATFORM
        </p>

        <h1 className="mt-2 text-4xl font-bold">
          Kubernetes AI Dashboard
        </h1>

        <p className="mt-3 text-zinc-400">
          Monitor Kubernetes health and investigate infrastructure
          problems using AI.
        </p>

        {error && (
          <div className="mt-8 rounded-xl border border-red-800 bg-red-950/40 p-5">
            <p className="font-semibold text-red-300">
              Backend Error
            </p>
            <p className="mt-2 text-red-400">
              {error}
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-3">

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">
              Kubernetes Status
            </p>

            <p className="mt-4 text-2xl font-bold">
              {status}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">
              Backend API
            </p>

            <p className="mt-4 text-sm text-zinc-300">
              {API_URL}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">
              AI Agent
            </p>

            <p className="mt-4 text-2xl font-bold text-green-400">
              Active
            </p>
          </div>

        </div>

        <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">

          <h2 className="text-xl font-semibold">
            Kubernetes Diagnosis
          </h2>

          <p className="mt-4 leading-7 text-zinc-300">
            {diagnosis || "Running investigation..."}
          </p>

        </section>

      </div>
    </main>
  );
}
