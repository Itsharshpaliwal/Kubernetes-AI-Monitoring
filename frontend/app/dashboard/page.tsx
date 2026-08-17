"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type Node = {
  name: string;
  role: string;
  status: string;
  internal_ip: string | null;
  kubernetes_version: string | null;
  cpu: string | null;
  memory: string | null;
  cpu_capacity: string | null;
  memory_capacity: string | null;
};

function formatMemory(value: string | null | undefined): string {
  if (!value) return "-";

  const match = value.match(/^([0-9.]+)([KMGTE]i?|)$/);

  if (!match) return value;

  const number = parseFloat(match[1]);
  const unit = match[2];

  let bytes = number;

  switch (unit) {
    case "Ki":
    case "K":
      bytes = number * 1024;
      break;

    case "Mi":
    case "M":
      bytes = number * 1024 ** 2;
      break;

    case "Gi":
    case "G":
      bytes = number * 1024 ** 3;
      break;

    case "Ti":
    case "T":
      bytes = number * 1024 ** 4;
      break;

    case "Ei":
    case "E":
      bytes = number * 1024 ** 5;
      break;

    default:
      bytes = number;
  }

  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(2)} GiB`;
  }

  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(2)} MiB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KiB`;
  }

  return `${bytes.toFixed(0)} B`;
}

type Pod = {
  namespace: string;
  name: string;
  phase: string;
  ready: string;
  node: string | null;
  restarts: number;
};

type EventItem = {
  namespace: string;
  reason: string;
  message: string;
  object: string;
  object_kind?: string;
  count?: number;
  timestamp?: string;
  explanation?: string;
};

type Diagnosis = {
  kubernetes?: {
    status?: string;
    healthy?: boolean;
    summary?: {
      problematic_pods?: number;
      warning_events?: number;
      total_problems?: number;
    };
    diagnosis?: string;
    problems?: Array<{
      type: string;
      namespace?: string;
      name?: string;
      object?: string;
      status?: string;
      ready?: string;
      reason?: string;
      message?: string;
      containers?: Array<{
        name: string;
        state?: string;
        reason?: string | null;
        exit_code?: number | null;
        signal?: number | null;
        restart_count?: number;
      }>;
    }>;
    recommendations?: string[];
  };
  ai?: {
    status?: string;
    model?: string;
    analysis?: string;
  };
};

type AIAnalysis = {
  severity: string;
  root_cause: string;
  explanation: string;
  suggested_fix: string;
  kubectl_commands: string[];
  confidence: number;
};

/*
 * Convert Kubernetes memory values into human-readable values.
 *
 * Examples:
 * 2333580Ki -> 2.23 GiB
 * 1647388Ki -> 1.57 GiB
 * 2048Mi   -> 2.00 GiB
 * 2Gi      -> 2.00 GiB
 */

export default function DashboardPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function apiFetch(path: string) {
    const response = await fetch(`${API_URL}${path}`);

    if (!response.ok) {
      throw new Error(`${path} request failed`);
    }

    return response.json();
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [
        nodesResponse,
        podsResponse,
        namespacesResponse,
        eventsResponse,
        diagnosisResponse,
      ] = await Promise.all([
        apiFetch("/nodes"),
        apiFetch("/pods"),
        apiFetch("/clusters"),
        apiFetch("/investigate/events"),
        apiFetch("/investigate/ai-diagnose"),
      ]);

      setNodes(nodesResponse.nodes || []);
      setPods(podsResponse.pods || []);
      setNamespaces(namespacesResponse.namespaces || []);
      setEvents(eventsResponse.events || []);
      setDiagnosis(diagnosisResponse);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  function parseAIAnalysis(
    data: Diagnosis | null
  ): AIAnalysis | null {
    if (!data?.ai?.analysis) {
      return null;
    }

    try {
      const cleaned = data.ai.analysis
        .replace(/^```json\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned);

      return {
        severity: parsed.severity || "UNKNOWN",
        root_cause: parsed.root_cause || "",
        explanation: parsed.explanation || "",
        suggested_fix: parsed.suggested_fix || "",
        kubectl_commands: Array.isArray(parsed.kubectl_commands)
          ? parsed.kubectl_commands
          : [],
        confidence:
          typeof parsed.confidence === "number"
            ? parsed.confidence
            : 0,
      };
    } catch {
      return {
        severity: "UNKNOWN",
        root_cause: data.ai.analysis,
        explanation: "",
        suggested_fix: "",
        kubectl_commands: [],
        confidence: 0,
      };
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const readyNodes = nodes.filter(
    (node) => node.status === "True"
  ).length;

  const runningPods = pods.filter(
    (pod) => pod.phase === "Running"
  ).length;

  const warningEvents =
    diagnosis?.kubernetes?.summary?.warning_events ??
    events.length;

  const aiData = parseAIAnalysis(diagnosis);


  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* HEADER */}

        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <p className="text-sm font-semibold tracking-wider text-blue-400">
              AI DEVOPS PLATFORM
            </p>

            <h1 className="mt-2 text-4xl font-bold">
              Kubernetes Monitoring
            </h1>

            <p className="mt-2 text-zinc-400">
              Monitor cluster health, nodes, pods, events and AI-powered
              infrastructure diagnosis.
            </p>
          </div>

          <div className="flex gap-3">
  <button
    onClick={loadDashboard}
    disabled={loading}
    className="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-semibold hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
  >
    ↻ Refresh
  </button>

  <button
    onClick={() => {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }}
    className="rounded-lg border border-red-800 bg-red-950/40 px-5 py-3 text-sm font-semibold text-red-400 hover:bg-red-900/50"
  >
    Logout
  </button>
</div>
        </header>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-800 bg-red-950/40 p-5 text-red-300">

            <p className="font-semibold">
              Dashboard Error
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>

          </div>
        )}

        {/* METRICS */}

        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

          <MetricCard
            title="Nodes"
            value={nodes.length}
            detail={`${readyNodes} Ready`}
          />

          <MetricCard
            title="Pods"
            value={pods.length}
            detail={`${runningPods} Running`}
          />

          <MetricCard
            title="Namespaces"
            value={namespaces.length}
            detail="Kubernetes namespaces"
          />

          <MetricCard
            title="Warning Events"
            value={warningEvents}
            detail={
              diagnosis?.kubernetes?.healthy
                ? "Cluster healthy"
                : "Issues detected"
            }
            warning={!diagnosis?.kubernetes?.healthy}
          />

        </section>

        {/* CLUSTER OVERVIEW */}

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-xl font-semibold">
                Cluster Overview
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Kubernetes cluster infrastructure status
              </p>
            </div>

            <div
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                diagnosis?.kubernetes?.healthy
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {diagnosis?.kubernetes?.healthy
                ? "● Healthy"
                : "● Issues Detected"}
            </div>

          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">

            <InfoBox
              label="Cluster"
              value="kubernetes"
            />

            <InfoBox
              label="API Context"
              value="in-cluster"
            />

            <InfoBox
              label="API Endpoint"
              value={API_URL}
            />

          </div>

        </section>

        {/* NODE MONITORING */}

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">

          <div className="mb-5">

            <h2 className="text-xl font-semibold">
              Node Monitoring
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              CPU, memory and Kubernetes node health
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="border-b border-zinc-800 text-zinc-500">

                <tr>

                  <th className="px-3 py-3">
                    Node
                  </th>

                  <th className="px-3 py-3">
                    Role
                  </th>

                  <th className="px-3 py-3">
                    Status
                  </th>

                  <th className="px-3 py-3">
                    IP
                  </th>

                  <th className="px-3 py-3">
                    CPU
                  </th>

                  <th className="px-3 py-3">
                    Memory
                  </th>

                  <th className="px-3 py-3">
                    Version
                  </th>

                </tr>

              </thead>

              <tbody>

                {nodes.map((node) => (

                  <tr
                    key={node.name}
                    className="border-b border-zinc-800/70 hover:bg-zinc-800/40"
                  >

                    <td className="px-3 py-4 font-semibold">
                      {node.name}
                    </td>

                    <td className="px-3 py-4 text-zinc-400">
                      {node.role}
                    </td>

                    <td className="px-3 py-4">

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          node.status === "True"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {node.status === "True"
                          ? "Ready"
                          : "NotReady"}
                      </span>

                    </td>

                    <td className="px-3 py-4 text-zinc-400">
                      {node.internal_ip || "-"}
                    </td>

                    <td className="px-3 py-4">
                      {node.cpu || "-"} / {node.cpu_capacity || "-"}
                    </td>

                    <td className="px-3 py-4">
                      <div className="font-medium text-zinc-200">
                        {formatMemory(node.memory)}
                      </div>

                      <div className="mt-1 text-xs text-zinc-500">
                        Capacity: {formatMemory(node.memory_capacity)}
                      </div>
                    </td>

                    <td className="px-3 py-4 text-zinc-400">
                      {node.kubernetes_version || "-"}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </section>

        {/* POD MONITORING */}

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">

          <div className="mb-5 flex items-center justify-between">

            <div>

              <h2 className="text-xl font-semibold">
                Pod Monitoring
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                All workloads across the cluster
              </p>

            </div>

            <span className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-400">
              {pods.length} Pods
            </span>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="border-b border-zinc-800 text-zinc-500">

                <tr>

                  <th className="px-3 py-3">
                    Pod
                  </th>

                  <th className="px-3 py-3">
                    Namespace
                  </th>

                  <th className="px-3 py-3">
                    Status
                  </th>

                  <th className="px-3 py-3">
                    Ready
                  </th>

                  <th className="px-3 py-3">
                    Restarts
                  </th>

                  <th className="px-3 py-3">
                    Node
                  </th>

                </tr>

              </thead>

              <tbody>

                {pods.map((pod) => (

                  <tr
                    key={`${pod.namespace}-${pod.name}`}
                    className="border-b border-zinc-800/70 hover:bg-zinc-800/40"
                  >

                    <td className="px-3 py-4 font-medium">
                      {pod.name}
                    </td>

                    <td className="px-3 py-4 text-zinc-400">
                      {pod.namespace}
                    </td>

                    <td className="px-3 py-4">

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          pod.phase === "Running"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {pod.phase}
                      </span>

                    </td>

                    <td className="px-3 py-4">
                      {pod.ready}
                    </td>

                    <td
                      className={`px-3 py-4 ${
                        pod.restarts > 0
                          ? "text-yellow-400"
                          : "text-zinc-300"
                      }`}
                    >
                      {pod.restarts}
                    </td>

                    <td className="px-3 py-4 text-zinc-400">
                      {pod.node || "-"}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </section>

        {/* EVENTS */}

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">

          <div className="mb-5">

            <h2 className="text-xl font-semibold">
              Kubernetes Warning Events
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Recent events detected by the monitoring agent
            </p>

          </div>

          <div className="space-y-3">

            {events.slice(0, 10).map((event, index) => (

              <div
                key={`${event.reason}-${index}`}
                className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
              >

                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

                  <div className="flex items-center gap-3">

                    <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                      WARNING
                    </span>

                    <span className="font-semibold">
                      {event.reason}
                    </span>

                  </div>

                  <span className="text-xs text-zinc-500">
                    {event.namespace}
                  </span>

                </div>

                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {event.message}
                </p>

                <p className="mt-2 text-xs text-zinc-600">
                  Object: {event.object}
                </p>

              </div>

            ))}

            {events.length === 0 && (

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-500">
                No Kubernetes warning events detected.
              </div>

            )}

          </div>

        </section>

        {/* AI ANALYSIS */}

        <section className="mt-6 rounded-xl border border-blue-900/50 bg-blue-950/10 p-6">

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-sm font-semibold tracking-wider text-blue-400">
                AI ANALYSIS
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Intelligent Kubernetes Diagnosis
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                AI-powered root cause analysis and remediation guidance
              </p>

            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                diagnosis?.ai?.status === "success"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {diagnosis?.ai?.status === "success"
                ? "● AI Active"
                : "● Unavailable"}
            </span>

          </div>

          {aiData && (

            <div className="mt-6 grid gap-4 md:grid-cols-3">

              <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-5">

                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Severity
                </p>

                <p className="mt-2 text-2xl font-bold text-red-400">
                  {aiData.severity}
                </p>

              </div>

              <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-5">

                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Confidence
                </p>

                <p className="mt-2 text-2xl font-bold text-blue-400">
                  {aiData.confidence}%
                </p>

              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">

                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  AI Model
                </p>

                <p className="mt-2 break-all text-sm font-semibold text-zinc-300">
                  {diagnosis?.ai?.model || "-"}
                </p>

              </div>

            </div>

          )}

          {/* ROOT CAUSE */}

          {aiData?.root_cause && (

            <div className="mt-5 rounded-xl border border-red-900/50 bg-red-950/20 p-5">

              <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
                Root Cause
              </p>

              <p className="mt-3 leading-7 text-zinc-300">
                {aiData.root_cause}
              </p>

            </div>

          )}

          {/* EXPLANATION */}

          {aiData?.explanation && (

            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-5">

              <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Explanation
              </p>

              <p className="mt-3 leading-7 text-zinc-400">
                {aiData.explanation}
              </p>

            </div>

          )}

          {/* SUGGESTED FIX */}

          {aiData?.suggested_fix && (

            <div className="mt-5 rounded-xl border border-green-900/50 bg-green-950/10 p-5">

              <p className="text-sm font-semibold uppercase tracking-wider text-green-400">
                Suggested Fix
              </p>

              <p className="mt-3 leading-7 text-zinc-300">
                {aiData.suggested_fix}
              </p>

            </div>

          )}

          {/* KUBECTL COMMANDS */}

          {aiData?.kubectl_commands &&
            aiData.kubectl_commands.length > 0 && (

              <div className="mt-6">

                <h3 className="font-semibold">
                  Recommended kubectl Commands
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  Commands suggested by the AI for further investigation
                </p>

                <div className="mt-3 space-y-2">

                  {aiData.kubectl_commands.map(
                    (command, index) => (

                      <div
                        key={`${command}-${index}`}
                        className="overflow-x-auto rounded-lg border border-zinc-800 bg-black p-3"
                      >

                        <code className="whitespace-nowrap text-sm text-green-400">
                          $ {command}
                        </code>

                      </div>

                    )
                  )}

                </div>

              </div>

            )}

          {/* KUBERNETES DIAGNOSIS */}

          {diagnosis?.kubernetes?.diagnosis && (

            <div className="mt-6 rounded-xl border border-yellow-900/50 bg-yellow-950/10 p-5">

              <p className="text-sm font-semibold uppercase tracking-wider text-yellow-400">
                Kubernetes Diagnosis
              </p>

              <p className="mt-3 leading-7 text-zinc-300">
                {diagnosis.kubernetes.diagnosis}
              </p>

            </div>

          )}

          {/* RECOMMENDATIONS */}

          {diagnosis?.kubernetes?.recommendations &&
            diagnosis.kubernetes.recommendations.length > 0 && (

              <div className="mt-6">

                <h3 className="font-semibold">
                  Kubernetes Recommendations
                </h3>

                <ul className="mt-3 space-y-2">

                  {diagnosis.kubernetes.recommendations.map(
                    (recommendation, index) => (

                      <li
                        key={index}
                        className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400"
                      >

                        <span className="mr-2 text-blue-400">
                          {index + 1}.
                        </span>

                        {recommendation}

                      </li>

                    )
                  )}

                </ul>

              </div>

            )}

          {/* DETECTED PROBLEMS */}

          {diagnosis?.kubernetes?.problems &&
            diagnosis.kubernetes.problems.length > 0 && (

              <div className="mt-6">

                <h3 className="font-semibold">
                  Detected Problems
                </h3>

                <div className="mt-3 space-y-3">

                  {diagnosis.kubernetes.problems
                    .slice(0, 8)
                    .map((problem, index) => (

                      <div
                        key={`${problem.type}-${index}`}
                        className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                      >

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                            {problem.type}
                          </span>

                          {problem.reason && (
                            <span className="text-sm font-semibold text-zinc-300">
                              {problem.reason}
                            </span>
                          )}

                        </div>

                        <div className="mt-2 text-sm text-zinc-500">

                          {problem.namespace && (
                            <span className="mr-4">
                              Namespace: {problem.namespace}
                            </span>
                          )}

                          {(problem.name || problem.object) && (
                            <span>
                              Object: {problem.name || problem.object}
                            </span>
                          )}

                        </div>

                        {problem.message && (
                          <p className="mt-3 text-sm leading-6 text-zinc-400">
                            {problem.message}
                          </p>
                        )}

                        {problem.status && (
                          <p className="mt-2 text-xs text-zinc-600">
                            Status: {problem.status}
                            {problem.ready
                              ? ` | Ready: ${problem.ready}`
                              : ""}
                          </p>
                        )}

                        {problem.containers &&
                          problem.containers.length > 0 && (

                            <div className="mt-3 space-y-2">

                              {problem.containers.map(
                                (container, containerIndex) => (

                                  <div
                                    key={`${container.name}-${containerIndex}`}
                                    className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs"
                                  >

                                    <div className="flex flex-wrap gap-4">

                                      <span className="text-zinc-300">
                                        Container: {container.name}
                                      </span>

                                      <span className="text-zinc-500">
                                        State: {container.state || "-"}
                                      </span>

                                      <span className="text-yellow-400">
                                        Restarts:{" "}
                                        {container.restart_count ?? 0}
                                      </span>

                                    </div>

                                  </div>

                                )
                              )}

                            </div>

                          )}

                      </div>

                    ))}

                </div>

              </div>

            )}

          {/* AI MODEL */}

          {diagnosis?.ai?.model && (

            <div className="mt-6 border-t border-zinc-800 pt-4 text-xs text-zinc-600">
              AI Model: {diagnosis.ai.model}
            </div>

          )}

        </section>

        {/* LOADING */}

        {loading && (

          <div className="fixed bottom-5 right-5 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-400 shadow-xl">
            Loading cluster data...
          </div>

        )}

      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  detail,
  warning = false,
}: {
  title: string;
  value: number;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="mt-3 text-4xl font-bold">
        {value}
      </p>

      <p
        className={`mt-2 text-sm ${
          warning
            ? "text-yellow-400"
            : "text-zinc-500"
        }`}
      >
        {detail}
      </p>

    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">

      <p className="text-xs uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p className="mt-2 break-all text-sm font-semibold text-zinc-300">
        {value}
      </p>

    </div>
  );
}
