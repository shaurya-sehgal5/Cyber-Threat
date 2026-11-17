import { useState } from "react";
import axios from "axios";
import {
  Shield, UploadCloud, FileJson, FileSpreadsheet, Activity,
  AlertTriangle, CheckCircle2, XCircle, RefreshCw,
  Globe, Clock, Search, ShieldAlert, FileText, ArrowLeft
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart,
  Bar
} from "recharts";

const API = "http://localhost:5000/api";
const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");

  async function loadResults(uploadResult) {
    const [stats, alerts, logs, activity, ips, history] = await Promise.all([
      axios.get(`${API}/dashboard/stats`),
      axios.get(`${API}/alerts`),
      axios.get(`${API}/logs?limit=100`),
      axios.get(`${API}/analytics/activity?hours=24`),
      axios.get(`${API}/analytics/top-ips`),
      axios.get(`${API}/detections/history`)
    ]);

    setResult(uploadResult);
    setData({
      stats: stats.data.data,
      alerts: alerts.data.data,
      logs: logs.data.data,
      activity: activity.data.data,
      ips: ips.data.data,
      history: history.data.data
    });
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select a CSV or JSON file first.");
      return;
    }

    const extension = file.name.split(".").pop().toLowerCase();

    if (!["csv", "json"].includes(extension)) {
      setError("Only CSV and JSON files are supported.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        `${API}/logs/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      await loadResults(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Upload failed. Check whether the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshResults() {
    setLoading(true);
    setError("");

    try {
      await loadResults(result);
    } catch (err) {
      setError("Unable to refresh results.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setData(null);
    setError("");
    setSearch("");
  }

  const filteredAlerts = data?.alerts.filter(alert =>
    `${alert.title} ${alert.source_ip || ""} ${alert.username || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  ) || [];

  const severityData = data ? [
    { name: "Critical", value: data.stats.severity.critical },
    { name: "High", value: data.stats.severity.high },
    { name: "Medium", value: data.stats.severity.medium },
    { name: "Low", value: data.stats.severity.low }
  ].filter(x => x.value > 0) : [];

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-200">

      <header className="flex h-[76px] items-center justify-between border-b border-slate-800 bg-[#0d1422] px-5 md:px-10">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-500 p-2.5 text-white">
            <Shield size={25}/>
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-white">
              Cyber Threat Trace
            </h1>
            <p className="text-[10px] tracking-[3px] text-orange-400">
              SECURITY MONITORING PLATFORM
            </p>
          </div>
        </div>

        {data && (
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft size={16}/> New Upload
          </button>
        )}
      </header>

      {!data ? (
        <main className="mx-auto max-w-4xl px-5 py-16 md:py-24">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10">
              <ShieldAlert size={32} className="text-orange-400"/>
            </div>

            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Authentication Threat Analysis
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400">
              Upload your authentication logs to identify suspicious login
              activity, detect cyber threats and generate security reports.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#101827] p-5 md:p-9">
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const dropped = e.dataTransfer.files[0];
                if (dropped) {
                  setFile(dropped);
                  setError("");
                }
              }}
              className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-[#0b1220] p-6 text-center transition hover:border-orange-500/60"
            >
              <div className="mb-5 rounded-full bg-orange-500/10 p-5">
                <UploadCloud size={35} className="text-orange-400"/>
              </div>

              <h3 className="text-lg font-semibold text-white">
                Upload Authentication Logs
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Drag and drop your file here or browse your computer
              </p>

              <label className="mt-6 cursor-pointer rounded-lg bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600">
                Browse Files
                <input
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={e => {
                    setFile(e.target.files?.[0] || null);
                    setError("");
                  }}
                />
              </label>

              <p className="mt-4 text-xs text-slate-600">
                Supported formats: CSV, JSON · Maximum size: 5 MB
              </p>
            </div>

            {file && (
              <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-[#0b1220] p-4">
                <div className="flex min-w-0 items-center gap-3">
                  {file.name.endsWith(".csv")
                    ? <FileSpreadsheet className="shrink-0 text-emerald-400"/>
                    : <FileJson className="shrink-0 text-orange-400"/>}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setFile(null)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              disabled={!file || loading}
              onClick={handleUpload}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3.5 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading
                ? <><RefreshCw size={18} className="animate-spin"/> Analyzing Logs...</>
                : <><Shield size={18}/> Upload & Analyze Logs</>}
            </button>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ["Log ingestion", "CSV / JSON"],
              ["Threat detection", "Rule-based analysis"],
              ["Results", "Security insights"]
            ].map(([title, desc]) => (
              <div key={title} className="rounded-xl border border-slate-800 bg-[#101827] p-4 text-center">
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="mt-1 text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </main>
      ) : (
        <main className="mx-auto max-w-[1500px] px-5 py-8 md:px-8">

          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-orange-400">ANALYSIS COMPLETE</p>
              <h2 className="mt-2 text-3xl font-bold text-white">Security Analysis Report</h2>
              <p className="mt-2 text-sm text-slate-400">
                Results generated from uploaded authentication records.
              </p>
            </div>
            <button
              onClick={refreshResults}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-800"
            >
              <RefreshCw size={16}/> Refresh
            </button>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Authentication Events", data.stats.authentication.total, Activity, "text-blue-400"],
              ["Failed Logins", data.stats.authentication.failed, XCircle, "text-red-400"],
              ["Security Alerts", data.stats.alerts.total, ShieldAlert, "text-orange-400"],
              ["Open Incidents", data.stats.alerts.open, AlertTriangle, "text-yellow-400"]
            ].map(([title, value, Icon, color]) => (
              <div key={title} className="rounded-xl border border-slate-800 bg-[#101827] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">{title}</p>
                  <Icon size={20} className={color}/>
                </div>
                <p className="mt-4 text-3xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 grid gap-5 xl:grid-cols-3">
            <section className="rounded-xl border border-slate-800 bg-[#101827] p-5 xl:col-span-2">
              <h3 className="font-semibold text-white">Authentication Activity</h3>
              <p className="mt-1 text-xs text-slate-500">Hourly events from PostgreSQL</p>

              <div className="mt-5 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.activity}>
                    <defs>
                      <linearGradient id="eventFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#243044" strokeDasharray="3 3"/>
                    <XAxis
                      dataKey="hour"
                      tickFormatter={v => new Date(v).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
                      tick={{fill:"#94a3b8",fontSize:10}}
                    />
                    <YAxis tick={{fill:"#94a3b8",fontSize:10}}/>
                    <Tooltip contentStyle={{background:"#101827",border:"1px solid #334155"}}/>
                    <Area dataKey="total_events" name="Total events" stroke="#38bdf8" fill="url(#eventFill)"/>
                    <Area dataKey="failed_logins" name="Failed logins" stroke="#f97316" fill="transparent"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-[#101827] p-5">
              <h3 className="font-semibold text-white">Threat Severity</h3>
              <p className="mt-1 text-xs text-slate-500">Detected alert distribution</p>

              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={4}>
                      {severityData.map((entry, i) => (
                        <Cell key={entry.name} fill={COLORS[["Critical","High","Medium","Low"].indexOf(entry.name)]}/>
                      ))}
                    </Pie>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {severityData.map((item, i) => (
                  <div key={item.name} className="flex justify-between text-sm">
                    <span style={{color:COLORS[["Critical","High","Medium","Low"].indexOf(item.name)]}}>{item.name}</span>
                    <span className="text-white">{item.value}</span>
                  </div>
                ))}
                {severityData.length === 0 && <p className="text-sm text-slate-500">No threats detected.</p>}
              </div>
            </section>
          </div>

          <section className="mb-6 rounded-xl border border-slate-800 bg-[#101827]">
            <div className="border-b border-slate-800 p-5">
              <h3 className="font-semibold text-white">Detected Security Threats</h3>
              <p className="mt-1 text-xs text-slate-500">Alerts generated by the detection engine</p>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 sm:max-w-sm">
                <Search size={15} className="text-slate-500"/>
                <input
                  value={search}
                  onChange={e=>setSearch(e.target.value)}
                  placeholder="Search threats, IPs, usernames..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0b1220] text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-4">Threat</th>
                    <th className="p-4">Source IP</th>
                    <th className="p-4">Username</th>
                    <th className="p-4">Occurrences</th>
                    <th className="p-4">Severity</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredAlerts.map(alert=>(
                    <tr key={alert.id}>
                      <td className="p-4 font-medium text-white">{alert.title}</td>
                      <td className="p-4 font-mono text-xs">{alert.source_ip}</td>
                      <td className="p-4">{alert.username || "Multiple accounts"}</td>
                      <td className="p-4">{alert.occurrences}</td>
                      <td className="p-4">
                        <span className="rounded-md bg-orange-500/10 px-2 py-1 text-xs uppercase text-orange-400">{alert.severity}</span>
                      </td>
                      <td className="p-4 capitalize text-slate-400">{alert.status.replace("_"," ")}</td>
                    </tr>
                  ))}
                  {filteredAlerts.length===0 && (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-500">No matching alerts.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mb-6 grid gap-5 xl:grid-cols-2">
            <section className="rounded-xl border border-slate-800 bg-[#101827] p-5">
              <h3 className="font-semibold text-white">Top Suspicious IP Addresses</h3>
              <p className="mb-5 mt-1 text-xs text-slate-500">Based on failed authentication events</p>
              <div className="space-y-4">
                {data.ips.map(ip=>(
                  <div key={ip.source_ip}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-mono text-slate-300">{ip.source_ip}</span>
                      <span className="text-orange-400">{ip.failed_attempts} failures</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-orange-500"
                        style={{width:`${Math.min(100,Number(ip.failed_attempts)/Math.max(1,...data.ips.map(x=>Number(x.failed_attempts)))*100)}%`}}
                      />
                    </div>
                  </div>
                ))}
                {data.ips.length===0 && <p className="text-sm text-slate-500">No IP records available.</p>}
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-[#101827] p-5">
              <h3 className="font-semibold text-white">Detection History</h3>
              <p className="mb-5 mt-1 text-xs text-slate-500">Recent detection executions</p>
              <div className="space-y-3">
                {data.history.map(item=>(
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 p-3">
                    <div>
                      <p className="text-sm text-white">{item.rule_name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(item.executed_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-orange-400">{item.alerts_created} alerts</p>
                      <p className="text-xs text-slate-500">{item.execution_status}</p>
                    </div>
                  </div>
                ))}
                {data.history.length===0 && <p className="text-sm text-slate-500">No detection history available.</p>}
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-slate-800 bg-[#101827]">
            <div className="border-b border-slate-800 p-5">
              <h3 className="font-semibold text-white">Authentication Log Records</h3>
              <p className="mt-1 text-xs text-slate-500">Latest uploaded authentication events</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0b1220] text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-4">Username</th>
                    <th className="p-4">Source IP</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Event Type</th>
                    <th className="p-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.logs.map(log=>(
                    <tr key={log.id}>
                      <td className="p-4 text-white">{log.username}</td>
                      <td className="p-4 font-mono text-xs">{log.source_ip}</td>
                      <td className="p-4">
                        <span className={log.status==="failed"?"text-red-400":"text-emerald-400"}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">{log.event_type}</td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(log.event_time).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="mt-8 border-t border-slate-800 pt-5 text-center text-xs text-slate-600">
            Cyber Threat Trace · Authentication Security Monitoring Platform
          </footer>
        </main>
      )}
    </div>
  );
}