import { useEffect, useState } from "react";
import {
  Shield, LayoutDashboard, Activity, FileSearch, Bell,
  Settings, Search, Menu, ChevronDown, ArrowUpRight,
  ArrowDownRight, Server, Globe, Clock, ShieldAlert,
  RefreshCw, CheckCircle2, XCircle, Zap, Wifi
} from "lucide-react";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell
} from "recharts";

import {
  getDashboardStats, getAlerts, getHealth
} from "./services/api";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

const activityData = [
  { time: "00:00", threats: 4, events: 18 },
  { time: "04:00", threats: 7, events: 28 },
  { time: "08:00", threats: 13, events: 45 },
  { time: "12:00", threats: 9, events: 37 },
  { time: "16:00", threats: 21, events: 65 },
  { time: "20:00", threats: 14, events: 48 },
  { time: "23:59", threats: 18, events: 59 }
];

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Threat Monitoring", icon: ShieldAlert },
  { label: "Authentication Logs", icon: FileSearch },
  { label: "Investigations", icon: Activity }
];

function StatCard({ title, value, subtitle, icon: Icon, color, trend }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {value}
          </h2>
        </div>
        <div className={`rounded-lg p-3 ${color}`}>
          <Icon size={21} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        {trend && <span className="text-orange-400">{trend}</span>}
        {subtitle}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const styles = {
    critical: "bg-red-500/15 text-red-400 border-red-500/20",
    high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
  };

  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-medium uppercase ${styles[severity] || styles.low}`}>
      {severity}
    </span>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [health, setHealth] = useState("checking");
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState("Overview");
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  async function loadDashboard() {
    setLoading(true);

    try {
      const [statsResponse, alertsResponse, healthResponse] =
        await Promise.all([
          getDashboardStats(),
          getAlerts(),
          getHealth()
        ]);

      setStats(statsResponse.data.data);
      setAlerts(alertsResponse.data.data);
      setHealth(healthResponse.data.status);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Dashboard loading failed:", error.message);
      setHealth("disconnected");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const severityData = stats
    ? [
        { name: "Critical", value: stats.severity.critical },
        { name: "High", value: stats.severity.high },
        { name: "Medium", value: stats.severity.medium },
        { name: "Low", value: stats.severity.low }
      ].filter(item => item.value > 0)
    : [];

  const filteredAlerts = alerts.filter(alert =>
    `${alert.title} ${alert.source_ip || ""} ${alert.username || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-200">

      {mobileMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-[#0d1422] transition-transform lg:translate-x-0 ${
        mobileMenu ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
          <div className="rounded-lg bg-orange-500 p-2 text-white">
            <Shield size={23} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Cyber Threat
            </h1>
            <p className="text-xs tracking-widest text-orange-400">
              TRACE PLATFORM
            </p>
          </div>
        </div>

        <div className="px-4 py-6">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Workspace
          </p>

          <div className="space-y-1">
            {navigation.map(item => {
              const Icon = item.icon;
              const active = activePage === item.label;

              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setActivePage(item.label);
                    setMobileMenu(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${
                    active
                      ? "border border-orange-500/20 bg-orange-500/10 text-orange-400"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                  {item.label === "Threat Monitoring" && alerts.length > 0 && (
                    <span className="ml-auto rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                      {alerts.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-auto border-t border-slate-800 p-4">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-400 hover:bg-slate-800">
            <Settings size={18} />
            Settings
          </button>

          <div className="mt-4 rounded-xl border border-slate-800 bg-[#111c2d] p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-slate-300">
                Detection engine
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Rule-based monitoring platform
            </p>
          </div>
        </div>
      </aside>

      <main className="min-h-screen lg:ml-64">

        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800 bg-[#080d18]/95 px-5 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 hover:bg-slate-800 lg:hidden"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={22} />
            </button>
            <div>
              <p className="text-xs text-slate-500">Security / Workspace</p>
              <h2 className="font-semibold text-white">{activePage}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-[#101827] px-3 py-2 sm:flex">
              <div className={`h-2 w-2 rounded-full ${
                health === "healthy" ? "bg-emerald-400" : "bg-red-400"
              }`} />
              <span className="text-xs text-slate-400">
                API {health === "healthy" ? "Connected" : health}
              </span>
            </div>

            <button
              onClick={loadDashboard}
              disabled={loading}
              className="rounded-lg border border-slate-800 p-2.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Refresh dashboard"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>

            <button className="relative rounded-lg border border-slate-800 p-2.5 text-slate-400 hover:bg-slate-800">
              <Bell size={17} />
              {alerts.length > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
          </div>
        </header>

        <div className="p-5 md:p-8">

          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                Security Overview
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Monitor authentication activity and investigate security threats.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock size={14} />
              Updated {lastUpdated.toLocaleTimeString()}
            </div>
          </div>

          <div className="mb-6 flex items-center gap-2 rounded-lg border border-slate-800 bg-[#101827] px-4 py-3">
            <Wifi size={17} className={health === "healthy" ? "text-emerald-400" : "text-red-400"} />
            <span className="text-sm text-slate-300">
              {health === "healthy"
                ? "All systems operational. Database connection established."
                : "Backend connection unavailable. Check the API server."}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Events"
              value={loading ? "..." : stats?.authentication.total ?? 0}
              subtitle="All recorded authentication events"
              icon={Activity}
              color="bg-blue-500/10 text-blue-400"
            />
            <StatCard
              title="Failed Logins"
              value={loading ? "..." : stats?.authentication.failed ?? 0}
              subtitle="Unsuccessful authentication attempts"
              icon={XCircle}
              color="bg-red-500/10 text-red-400"
            />
            <StatCard
              title="Total Alerts"
              value={loading ? "..." : stats?.alerts.total ?? 0}
              subtitle="Detected security incidents"
              icon={ShieldAlert}
              color="bg-orange-500/10 text-orange-400"
            />
            <StatCard
              title="Open Alerts"
              value={loading ? "..." : stats?.alerts.open ?? 0}
              subtitle="Incidents awaiting investigation"
              icon={Zap}
              color="bg-yellow-500/10 text-yellow-400"
            />
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-3">

            <div className="rounded-xl border border-slate-800 bg-[#101827] p-5 xl:col-span-2">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">
                    Security Activity
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Illustrative activity trend — sample visualization
                  </p>
                </div>
                <span className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400">
                  Sample 24H view
                </span>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#243044" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#111c2d", border: "1px solid #334155", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="threats" name="Threat signals" stroke="#f97316" fill="url(#threatGradient)" strokeWidth={2} />
                    <Area type="monotone" dataKey="events" name="Events" stroke="#38bdf8" fill="transparent" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#101827] p-5">
              <h3 className="font-semibold text-white">Threat Distribution</h3>
              <p className="mt-1 text-xs text-slate-500">
                Actual alert severity breakdown
              </p>

              <div className="relative mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#111c2d", border: "1px solid #334155", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {stats?.alerts.total ?? 0}
                  </span>
                  <span className="text-xs text-slate-500">Total alerts</span>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {[
                  ["Critical", stats?.severity.critical ?? 0, COLORS[0]],
                  ["High", stats?.severity.high ?? 0, COLORS[1]],
                  ["Medium", stats?.severity.medium ?? 0, COLORS[2]],
                  ["Low", stats?.severity.low ?? 0, COLORS[3]]
                ].map(([name, value, color]) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                      <span className="text-slate-400">{name}</span>
                    </div>
                    <span className="font-medium text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-[#101827]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-5">
              <div>
                <h3 className="font-semibold text-white">Recent Security Alerts</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Latest incidents from the detection system
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2">
                <Search size={15} className="text-slate-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search alerts..."
                  className="w-36 bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-[#0d1422] text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Threat</th>
                    <th className="px-5 py-4">Source IP</th>
                    <th className="px-5 py-4">Username</th>
                    <th className="px-5 py-4">Severity</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredAlerts.map(alert => (
                    <tr key={alert.id} className="hover:bg-slate-800/30">
                      <td className="px-5 py-4 font-medium text-white">{alert.title}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-400">{alert.source_ip || "—"}</td>
                      <td className="px-5 py-4 text-slate-400">{alert.username || "—"}</td>
                      <td className="px-5 py-4"><SeverityBadge severity={alert.severity} /></td>
                      <td className="px-5 py-4 text-xs capitalize text-slate-400">{alert.status.replace("_", " ")}</td>
                    </tr>
                  ))}

                  {!loading && filteredAlerts.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-5 py-12 text-center">
                        <Shield size={28} className="mx-auto mb-3 text-slate-600" />
                        <p className="text-sm text-slate-400">No security alerts found</p>
                        <p className="mt-1 text-xs text-slate-600">
                          Alerts will appear here when the detection engine identifies threats.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-800 px-5 py-3 text-xs text-slate-500">
              Showing {filteredAlerts.length} of {alerts.length} alerts
            </div>
          </div>

          <footer className="mt-8 flex flex-wrap justify-between gap-2 border-t border-slate-800 pt-5 text-xs text-slate-600">
            <span>Cyber Threat Trace © 2026</span>
            <span>Security Monitoring Platform · Version 1.0.0</span>
          </footer>

        </div>
      </main>
    </div>
  );
}

export default Dashboard;
