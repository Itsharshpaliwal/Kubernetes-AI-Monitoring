"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type Diagnosis = {
  status: string;
  kubernetes?: {
    healthy: boolean;
    summary: {
      problematic_pods: number;
      warning_events: number;
      total_problems: number;
    };
    diagnosis: string;
    problems: Array<{
      type: string;
      namespace?: string;
      name?: string;
      object?: string;
      status?: string;
      ready?: string;
      reason?: string;
      message?: string;
      explanation?: string;
    }>;
    recommendations: string[];
  };
  ai?: {
    status: string;
    model: string;
    analysis: string;
  };
};

export default function Home() {
  const [health, setHealth] = useState("Checking...");
  const [clusters, setClusters] = useState<string[]>([]);
  const [nodes, setNodes] = useState<
  Array<{
    name: string;
    role: string;
    status: string;
    internal_ip: string | null;
    kubernetes_version: string | null;
    cpu: string | null;
    memory: string | null;
    cpu_capacity: string | null;
    memory_capacity: string | null;
}>
>([]);

  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHealth();
  }, []);

  async function loadHealth() {
    try {
      setError("");

      const healthResponse = await fetch(`${API_URL}/health`);

      if (!healthResponse.ok) {
        throw new Error("Backend health check failed");
      }

      setHealth("Healthy");

      const clusterResponse = await fetch(`${API_URL}/clusters`);

      if (!clusterResponse.ok) {
      throw new Error("Unable to fetch Kubernetes clusters");
      
}

      const clusterData = await clusterResponse.json();
      setClusters(clusterData.clusters || []);
 
      const nodesResponse = await fetch(`${API_URL}/nodes`);

      if (!nodesResponse.ok) {
         throw new Error("Unable to fetch Kubernetes nodes");
      }
 
      const nodesData = await nodesResponse.json();
      setNodes(nodesData.nodes || []);
    } catch (err) {
      setHealth("Unavailable");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function runDiagnosis() {
    try {
      setLoadingDiagnosis(true);
      setError("");

      const response = await fetch(`${API_URL}/investigate/ai-diagnose`);

      if (!response.ok) {
        throw new Error("AI diagnosis request failed");
      }

      const data = await response.json();
      setDiagnosis(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to run AI diagnosis"
      );
    } finally {
      setLoadingDiagnosis(false);
    }
  }

  const kubernetes = diagnosis?.kubernetes;
  const ai = diagnosis?.ai;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">

        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold tracking-wider text-blue-400">
            AI DEVOPS PLATFORM
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Kubernetes AI Troubleshooting Agent
          </h1>

          <p className="mt-3 max-w-3xl text-zinc-400">
            Automatically investigate Kubernetes health, warning events,
            failed pods and use AI to identify the root cause.
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-300">
            <div className="font-semibold">Error</div>
            <div className="mt-1 text-sm">{error}</div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">Backend API</p>

            <div className="mt-4 flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${
                  health === "Healthy"
                    ? "bg-green-500"
                    : health === "Unavailable"
                      ? "bg-red-500"
                      : "bg-yellow-500"
                }`}
              />

              <span className="text-2xl font-semibold">
                {health}
              </span>
            </div>

            <p className="mt-3 break-all text-sm text-zinc-500">
              {API_URL}
            </p>
          </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
  <p className="text-sm text-zinc-400">
    Kubernetes Contexts
  </p>

  <div className="mt-4 text-3xl font-semibold">
    {clusters.length}
  </div>

  {clusters.length > 0 && (
    <div className="mt-4 space-y-2">
      {clusters.map((cluster) => (
        <div
          key={cluster}
          className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300"
        >
          {cluster}
        </div>
      ))}
    </div>
  )}
</div>

<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-zinc-400">
        Kubernetes Nodes
      </p>

      <div className="mt-2 text-3xl font-semibold">
        {nodes.length}
      </div>
    </div>

    <div className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-400">
      Cluster Nodes
    </div>
  </div>

  {nodes.length > 0 && (
    <div className="mt-6 space-y-3">
      {nodes.map((node) => (
        <div
          key={node.name}
          className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">
                {node.name}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {node.role} • {node.internal_ip}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                node.status === "True"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {node.status === "True" ? "Ready" : "Not Ready"}
            </span>
          </div>

          <p className="mt-3 text-xs text-zinc-600">
            Kubernetes {node.kubernetes_version}
          </p>
         <div className="mt-4 grid grid-cols-2 gap-3">

  <div className="rounded-lg bg-zinc-900 p-3">
    <p className="text-xs text-zinc-500">
      CPU Usage
    </p>

    <p className="mt-1 text-lg font-semibold text-blue-400">
      {node.cpu ?? "N/A"}
    </p>
  </div>

  <div className="rounded-lg bg-zinc-900 p-3">
    <p className="text-xs text-zinc-500">
      Memory Usage
    </p>

    <p className="mt-1 text-lg font-semibold text-purple-400">
      {node.memory ?? "N/A"}
    </p>
  </div>

</div>
         <div className="mt-4 grid grid-cols-2 gap-3">
  <div className="rounded-lg bg-zinc-900 p-3">
    <p className="text-xs text-zinc-500">CPU</p>
    <p className="mt-1 text-sm font-medium text-zinc-200">
      {node.cpu || "N/A"}
    </p>
  </div>

  <div className="rounded-lg bg-zinc-900 p-3">
    <p className="text-xs text-zinc-500">Memory</p>
    <p className="mt-1 text-sm font-medium text-zinc-200">
      {node.memory || "N/A"}
    </p>
  </div>
</div>
        </div>
      ))}
    </div>
  )}
</div>
        </div>

        <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-semibold">
                AI Kubernetes Diagnosis
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Scan the cluster and let the AI troubleshooting agent
                identify Kubernetes problems.
              </p>
            </div>

            <button
              onClick={runDiagnosis}
              disabled={loadingDiagnosis}
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingDiagnosis
                ? "Analyzing..."
                : "Run AI Diagnosis"}
            </button>
          </div>

          {diagnosis && (
            <div className="mt-8 space-y-6">

              <div className="grid gap-4 md:grid-cols-3">

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                  <p className="text-sm text-zinc-500">
                    Cluster Status
                  </p>

                  <p
                    className={`mt-2 text-2xl font-bold ${
                      kubernetes?.healthy
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {kubernetes?.healthy ? "Healthy" : "Issues Found"}
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                  <p className="text-sm text-zinc-500">
                    Problematic Pods
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {kubernetes?.summary.problematic_pods ?? 0}
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                  <p className="text-sm text-zinc-500">
                    Warning Events
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {kubernetes?.summary.warning_events ?? 0}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-sm font-medium text-zinc-400">
                  Kubernetes Diagnosis
                </p>

                <p className="mt-3 text-lg">
                  {kubernetes?.diagnosis}
                </p>
              </div>

              {kubernetes && kubernetes.problems.length > 0 && (
                <div className="rounded-lg border border-red-900/60 bg-red-950/20 p-5">

                  <h3 className="font-semibold text-red-300">
                    Detected Problems
                  </h3>

                  <div className="mt-4 space-y-3">
                    {kubernetes.problems.map((problem, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                      >
                        <div className="flex flex-wrap gap-2 text-sm">
                          <span className="rounded bg-red-900/50 px-2 py-1 text-red-300">
                            {problem.type}
                          </span>

                          {problem.namespace && (
                            <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">
                              namespace: {problem.namespace}
                            </span>
                          )}

                          {problem.name && (
                            <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">
                              pod: {problem.name}
                            </span>
                          )}

                          {problem.reason && (
                            <span className="rounded bg-zinc-800 px-2 py-1 text-yellow-300">
                              {problem.reason}
                            </span>
                          )}
                        </div>

                        {problem.status && (
                          <p className="mt-3 text-sm">
                            Status:{" "}
                            <span className="font-semibold text-red-400">
                              {problem.status}
                            </span>
                          </p>
                        )}

                        {problem.message && (
                          <p className="mt-2 text-sm text-zinc-400">
                            {problem.message}
                          </p>
                        )}

                        {problem.explanation && (
                          <p className="mt-2 text-sm text-zinc-500">
                            {problem.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ai && (
                <div className="rounded-xl border border-blue-900/60 bg-blue-950/20 p-6">

                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <h3 className="text-xl font-semibold text-blue-300">
                        AI Root Cause Analysis
                      </h3>

                      <p className="mt-1 text-sm text-zinc-500">
                        Model: {ai.model}
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-900/60 px-3 py-1 text-sm text-blue-300">
                      AI Analysis Complete
                    </span>
                  </div>

                  <pre className="mt-5 overflow-x-auto rounded-lg bg-zinc-950 p-5 text-sm leading-6 text-zinc-300">
                    {ai.analysis}
                  </pre>
                </div>
              )}

              {kubernetes && kubernetes.recommendations.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">

                  <h3 className="font-semibold">
                    Recommended Actions
                  </h3>

                  <ul className="mt-4 space-y-2">
                    {kubernetes.recommendations.map(
                      (recommendation, index) => (
                        <li
                          key={index}
                          className="flex gap-3 text-sm text-zinc-400"
                        >
                          <span className="text-blue-400">
                            {index + 1}.
                          </span>
                          {recommendation}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-zinc-800 pt-6 text-sm text-zinc-600">
          AI Kubernetes Agent • FastAPI • Kubernetes • OpenRouter • Next.js
        </footer>

      </div>
    </main>
  );
}
