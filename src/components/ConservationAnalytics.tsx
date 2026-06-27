import React from "react";
import { Artifact } from "../types";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart, 
  Pie, 
  Legend
} from "recharts";
import { AlertTriangle, ShieldCheck, HeartPulse, Sparkles, ArrowRight, CornerDownRight } from "lucide-react";

interface ConservationAnalyticsProps {
  artifacts: Artifact[];
  onNavigate: (view: string, targetId?: string) => void;
}

export default function ConservationAnalytics({ artifacts, onNavigate }: ConservationAnalyticsProps) {
  // Define metadata/color schemes for each condition
  const conditionMeta = {
    Damaged: {
      name: "Damaged",
      priority: "Urgent Restoration Needed",
      color: "#dc2626", // bold red
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-900",
      desc: "Requires immediate conservation assessment and stabilization."
    },
    Poor: {
      name: "Poor",
      priority: "Active Conservation Treatment",
      color: "#ea580c", // orange-red
      bg: "bg-orange-50",
      border: "border-orange-200",
      text: "text-orange-900",
      desc: "Showing advanced deterioration. Prioritize for repair soon."
    },
    Fair: {
      name: "Fair",
      priority: "Preventative Maintenance",
      color: "#d97706", // warm amber
      bg: "bg-amber-50/60",
      border: "border-amber-200",
      text: "text-amber-900",
      desc: "Mild wear or stable defects. Monitor during periodic checks."
    },
    Good: {
      name: "Good",
      priority: "Routine Observation",
      color: "#16a34a", // forest green
      bg: "bg-emerald-50/45",
      border: "border-emerald-100",
      text: "text-emerald-900",
      desc: "Structurally sound with minimal visual wear."
    },
    Mint: {
      name: "Mint",
      priority: "Pristine Showcase State",
      color: "#0f766e", // deep teal
      bg: "bg-teal-50/35",
      border: "border-teal-100",
      text: "text-teal-900",
      desc: "Exceptional state. Keep protected from excessive light/humidity."
    }
  };

  type ConditionKey = keyof typeof conditionMeta;

  // Initialize all states so they show up even if count is 0
  const counts: Record<ConditionKey, number> = {
    Damaged: 0,
    Poor: 0,
    Fair: 0,
    Good: 0,
    Mint: 0
  };

  // Populate counts safely
  artifacts.forEach(item => {
    if (!item || !item.condition) {
      counts["Good"]++;
      return;
    }
    const rawCond = String(item.condition || "Good");
    const normalizedCond = (rawCond.charAt(0).toUpperCase() + rawCond.slice(1).toLowerCase()) as ConditionKey;
    if (counts[normalizedCond] !== undefined) {
      counts[normalizedCond]++;
    } else {
      counts["Good"]++;
    }
  });

  // Calculate high-risk assets
  const highRiskCount = counts.Damaged + counts.Poor;

  // Render list of high-risk items requiring intervention
  const priorityItems = artifacts.filter(
    item => item.condition === "Damaged" || item.condition === "Poor"
  ).slice(0, 5); // limit to 5 highest priority for display

  // Prepare chart data (ordered from worst condition to best to highlight priorities)
  const chartData = [
    { name: "Damaged", count: counts.Damaged, fill: conditionMeta.Damaged.color },
    { name: "Poor", count: counts.Poor, fill: conditionMeta.Poor.color },
    { name: "Fair", count: counts.Fair, fill: conditionMeta.Fair.color },
    { name: "Good", count: counts.Good, fill: conditionMeta.Good.color },
    { name: "Mint", count: counts.Mint, fill: conditionMeta.Mint.color }
  ];

  // Custom styling for chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const meta = conditionMeta[data.name as ConditionKey];
      return (
        <div className="bg-white border border-[#dfd6be] p-3 rounded shadow-md text-xs font-serif max-w-[220px]">
          <p className="font-bold text-[#140e0b] flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }}></span>
            {data.name}: {data.count} items
          </p>
          <p className="text-[10px] font-mono text-[#8c7b6c] uppercase mt-1 tracking-wider">
            {meta.priority}
          </p>
          <p className="text-[10px] text-[#5c544d] font-sans italic mt-1.5 leading-relaxed">
            {meta.desc}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded-lg shadow-sm overflow-hidden">
      {/* Container Header */}
      <div className="border-b border-[#ece6da] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#fdfcf7] to-[#f4f0e6]">
        <div>
          <h3 className="font-serif text-base font-bold text-[#1c1a18] flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-[#3b5249]" /> 
            Heritage Conservation & Condition Analytics
          </h3>
          <p className="text-[10px] font-mono text-[#8e847a] uppercase mt-0.5 tracking-wider">
            Critical analysis of state-of-preservation to schedule corrective treatments
          </p>
        </div>

        {highRiskCount > 0 ? (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 px-3 py-1 rounded text-xs font-mono font-bold animate-pulse">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            {highRiskCount} PIECES AT HIGH RISK
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded text-xs font-mono font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ALL ARTIFACTS STABLE
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-[#ece6da]">
        {/* Chart Column (holds 3/5 width) */}
        <div className="lg:col-span-3 p-5 flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-mono font-bold tracking-widest text-[#8e847a] uppercase block mb-4">
              Condition Distribution Scale
            </span>
            
            {/* Horizontal Bar Chart for high-density reading */}
            <div className="h-64 w-full" id="condition-bar-chart">
              {artifacts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#8e847a] text-xs font-serif italic">
                  No artifacts registered yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#f0ece2" />
                    <XAxis
                      type="number"
                      stroke="#8c7b6c"
                      fontSize={10}
                      fontFamily="monospace"
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      domain={[0, 'auto']}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#1c1a18"
                      fontSize={11}
                      fontFamily="Georgia, serif"
                      fontWeight="bold"
                      tickLine={false}
                      axisLine={false}
                      width={75}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#fbfaf7", opacity: 0.6 }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Dynamic helpful guidelines */}
          <div className="mt-2 bg-[#faf9f5] border border-[#ebdcc3]/60 p-3 rounded flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#8c7b6c] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#6e645a] font-sans leading-relaxed">
              <strong>Curator Note:</strong> Conservation labor and budget allocation should prioritize treatment of items in the 
              <span className="font-semibold text-red-700"> Damaged</span> and <span className="font-semibold text-orange-600"> Poor</span> tiers. Periodic preventative stabilization should target the <span className="font-semibold text-amber-700">Fair</span> category.
            </p>
          </div>
        </div>

        {/* Priority Action Items Column (holds 2/5 width) */}
        <div className="lg:col-span-2 p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-mono font-bold tracking-widest text-[#8e847a] uppercase block">
                Immediate Conservation Action Register
              </span>
              <h4 className="font-serif text-sm font-bold text-[#1c1a18] mt-1">
                Highest-Priority Restoration Candidates
              </h4>
            </div>

            <div className="space-y-2.5">
              {priorityItems.length === 0 ? (
                <div className="border border-dashed border-[#c4beaf] rounded-lg p-6 text-center text-[#8e847a] space-y-2">
                  <ShieldCheck className="w-8 h-8 mx-auto text-emerald-600 opacity-60" />
                  <p className="text-xs font-serif font-bold text-[#1c1a18]">Exemption Approved</p>
                  <p className="text-[10px] leading-relaxed max-w-xs mx-auto">
                    No active assets are currently classed as Damaged or Poor. Your royal catalog lease is in supreme structural custody!
                  </p>
                </div>
              ) : (
                priorityItems.map((item) => {
                  const meta = conditionMeta[item.condition as ConditionKey] || conditionMeta.Good;
                  return (
                    <div 
                      key={item.id}
                      onClick={() => onNavigate("item-detail", item.id)}
                      className={`group border ${meta.border} ${meta.bg} p-2.5 rounded hover:shadow-sm cursor-pointer transition-all flex items-start justify-between gap-3 hover:-translate-y-0.5`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: meta.color }}></span>
                          <span className="text-[10px] font-mono text-[#4a4a40] uppercase tracking-wider font-bold">
                            {item.condition}
                          </span>
                        </div>
                        <h5 className="font-serif text-xs font-bold text-[#1c1a18] truncate mt-1 group-hover:text-[#3b5249] transition-colors">
                          {item.name}
                        </h5>
                        <p className="text-[9px] text-[#6e645a] font-mono mt-0.5">
                          ID: <span className="font-bold">{item.id}</span> | {item.currentLocation}
                        </p>
                      </div>

                      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                        <span className="text-[9px] font-mono font-bold text-red-850 bg-white/80 border border-current px-1.5 py-0.5 rounded capitalize">
                          {item.status}
                        </span>
                        
                        <span className="text-[10px] text-[#3b5249] flex items-center gap-0.5 font-mono group-hover:translate-x-1 transition-transform">
                          Inspect <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Call to action for full review */}
          {priorityItems.length > 0 && (
            <button
              onClick={() => onNavigate("all", "condition-action")}
              className="mt-4 w-full p-2 bg-gradient-to-r from-[#1c1a18] to-[#34302c] hover:from-[#3b5249] hover:to-[#2e3f38] text-white text-[9.5px] font-mono font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer hover:shadow-md active:scale-[0.98]"
            >
              View Full Priority Restoration Roll <CornerDownRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
