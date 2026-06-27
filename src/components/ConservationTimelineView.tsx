import React, { useState, useMemo } from "react";
import { Artifact, MovementLog } from "../types";
import {
  ArrowLeft,
  ClipboardCheck,
  ArrowRightLeft,
  Calendar,
  User,
  MapPin,
  Shield,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Filter,
  Download,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";

interface ConservationTimelineViewProps {
  item: Artifact;
  onBack: () => void;
}

type TimelineEventType = "inspection" | "movement" | "acquisition" | "status";

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  dateMs: number;
  title: string;
  subtitle?: string;
  actor: string;
  details: Record<string, string>;
  photoUrl?: string;
  condition?: string;
  isAlert?: boolean;
}

const CONDITION_ORDER: Record<string, number> = {
  Mint: 5,
  Good: 4,
  Fair: 3,
  Poor: 2,
  Damaged: 1,
};

const CONDITION_COLORS: Record<string, { dot: string; badge: string; text: string }> = {
  Mint:    { dot: "bg-teal-500",   badge: "bg-teal-50 border-teal-200 text-teal-800",   text: "text-teal-700" },
  Good:    { dot: "bg-emerald-500",badge: "bg-emerald-50 border-emerald-200 text-emerald-800", text: "text-emerald-700" },
  Fair:    { dot: "bg-amber-400",  badge: "bg-amber-50 border-amber-200 text-amber-800",  text: "text-amber-700" },
  Poor:    { dot: "bg-orange-500", badge: "bg-orange-50 border-orange-200 text-orange-800",text: "text-orange-700" },
  Damaged: { dot: "bg-red-600",    badge: "bg-red-50 border-red-200 text-red-800",        text: "text-red-700" },
};

function conditionTrend(prev: string | undefined, curr: string): "up" | "down" | "same" | "new" {
  if (!prev) return "new";
  const p = (CONDITION_ORDER as Record<string, number>)[prev] ?? 0;
  const c = (CONDITION_ORDER as Record<string, number>)[curr] ?? 0;
  if (c > p) return "up";
  if (c < p) return "down";
  return "same";
}

export default function ConservationTimelineView({ item, onBack }: ConservationTimelineViewProps) {
  const [filterType, setFilterType] = useState<"all" | TimelineEventType>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Build unified timeline events from all sources
  const allEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];

    // 1. Acquisition (item added)
    if (item.addedDate) {
      events.push({
        id: `acq-${item.id}`,
        type: "acquisition",
        date: item.addedDate,
        dateMs: new Date(item.addedDate).getTime(),
        title: "Artifact Registered to Palace Ledger",
        subtitle: `Initial acquisition into the Seclude Heritage Inventory`,
        actor: item.addedBy || "Field Agent",
        details: {
          "Catalog ID": item.id,
          "Opening Condition": item.condition,
          "Origin Room": item.originalLocation,
          "Opening Location": item.currentLocation,
          "Category": item.category,
        },
        condition: item.condition,
      });
    }

    // 2. Inspection entries
    (item.inspectionHistory || []).forEach((insp, idx) => {
      const prevInsp = (item.inspectionHistory || [])[idx + 1];
      const trend = conditionTrend(prevInsp?.condition, insp.condition);
      events.push({
        id: insp.id || `insp-${idx}`,
        type: "inspection",
        date: insp.date,
        dateMs: new Date(insp.date).getTime(),
        title: "Physical Forensic Inspection",
        subtitle: `Condition assessed as "${insp.condition}"`,
        actor: insp.inspector,
        details: {
          "Condition Found": insp.condition,
          "Inspector Notes": insp.notes,
        },
        photoUrl: insp.photoUrl || undefined,
        condition: insp.condition,
        isAlert: insp.condition === "Damaged" || insp.condition === "Poor",
      });
    });

    // 3. Movement entries
    (item.movementHistory || []).forEach((mov: MovementLog, idx: number) => {
      events.push({
        id: mov.id || `mov-${idx}`,
        type: "movement",
        date: mov.date,
        dateMs: new Date(mov.date).getTime(),
        title: "Custody Transfer — Relocation Logged",
        subtitle: `${mov.oldLocation} → ${mov.newLocation}`,
        actor: mov.staffMember,
        details: {
          "From": mov.oldLocation,
          "To": mov.newLocation,
          ...(mov.oldStatus ? { "Status (before)": mov.oldStatus } : {}),
          ...(mov.newStatus ? { "Status (after)": mov.newStatus } : {}),
          ...(mov.note ? { "Custodian Note": mov.note } : {}),
        },
      });
    });

    // Sort newest first
    return events.sort((a, b) => b.dateMs - a.dateMs);
  }, [item]);

  const filtered = filterType === "all" ? allEvents : allEvents.filter(e => e.type === filterType);

  // Derive condition history for mini sparkline
  const conditionHistory = useMemo(() => {
    const inspEvents = allEvents
      .filter(e => e.type === "inspection" || e.type === "acquisition")
      .sort((a, b) => a.dateMs - b.dateMs);
    return inspEvents.map(e => ({ date: e.date, condition: e.condition || "Good" }));
  }, [allEvents]);

  // Check if overdue
  const isOverdue = (() => {
    if (!item.lastInspectedDate) return true;
    const d = new Date(item.lastInspectedDate);
    const now = new Date();
    return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.43) >= 6;
  })();

  // Next inspection due
  const nextDue = (() => {
    if (!item.lastInspectedDate) return "Overdue – No record";
    const d = new Date(item.lastInspectedDate);
    d.setMonth(d.getMonth() + 6);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  })();

  const filterLabels: { key: "all" | TimelineEventType; label: string; count: number }[] = [
    { key: "all", label: "All Events", count: allEvents.length },
    { key: "inspection", label: "Inspections", count: allEvents.filter(e => e.type === "inspection").length },
    { key: "movement", label: "Transfers", count: allEvents.filter(e => e.type === "movement").length },
    { key: "acquisition", label: "Acquisition", count: allEvents.filter(e => e.type === "acquisition").length },
  ];

  const typeIcons: Record<TimelineEventType, React.ReactNode> = {
    inspection: <ClipboardCheck className="w-4 h-4" />,
    movement:   <ArrowRightLeft className="w-4 h-4" />,
    acquisition:<Shield className="w-4 h-4" />,
    status:     <Sparkles className="w-4 h-4" />,
  };

  const typeBg: Record<TimelineEventType, string> = {
    inspection:  "bg-[#3b5249] text-white",
    movement:    "bg-amber-700 text-white",
    acquisition: "bg-[#1c1a18] text-[#fdfcf7]",
    status:      "bg-purple-700 text-white",
  };

  const typeLineBg: Record<TimelineEventType, string> = {
    inspection:  "bg-[#3b5249]/30",
    movement:    "bg-amber-700/30",
    acquisition: "bg-[#1c1a18]/20",
    status:      "bg-purple-700/30",
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#dfd6be] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 px-3 border border-[#c4beaf] hover:bg-[#eae5d9] rounded text-xs font-mono font-bold uppercase cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dossier
          </button>
          <div>
            <h2 className="font-serif text-lg font-bold text-[#1c1a18] tracking-tight leading-tight">
              Provenance & Conservation Timeline
            </h2>
            <p className="font-mono text-[10px] text-[#8e847a] uppercase tracking-widest mt-0.5">
              {item.name} · ID {item.id}
            </p>
          </div>
        </div>
      </div>

      {/* ── Summary Header Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Events */}
        <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded p-3.5 space-y-1 shadow-sm">
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#8e847a]">Total Events</p>
          <p className="font-serif text-2xl font-bold text-[#1c1a18]">{allEvents.length}</p>
          <p className="text-[10px] text-[#6e645a] font-sans">in this artifact's ledger</p>
        </div>

        {/* Condition Trajectory */}
        <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded p-3.5 space-y-1 shadow-sm">
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#8e847a]">Current Condition</p>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${CONDITION_COLORS[item.condition]?.dot || "bg-gray-400"}`} />
            <p className="font-serif text-base font-bold text-[#1c1a18]">{item.condition}</p>
          </div>
          <p className="text-[10px] text-[#6e645a] font-sans">{item.status}</p>
        </div>

        {/* Total Relocations */}
        <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded p-3.5 space-y-1 shadow-sm">
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#8e847a]">Custody Transfers</p>
          <p className="font-serif text-2xl font-bold text-[#1c1a18]">{item.movementHistory?.length || 0}</p>
          <p className="text-[10px] text-[#6e645a] font-sans">relocation events logged</p>
        </div>

        {/* Next Inspection */}
        <div className={`border rounded p-3.5 space-y-1 shadow-sm ${isOverdue ? "bg-red-50 border-red-200" : "bg-[#fdfcf7] border-[#dcd6c8]"}`}>
          <p className={`text-[9px] font-mono uppercase tracking-widest ${isOverdue ? "text-red-500" : "text-[#8e847a]"}`}>
            Next Inspection Due
          </p>
          <p className={`font-serif text-xs font-bold leading-snug ${isOverdue ? "text-red-700" : "text-[#1c1a18]"}`}>
            {nextDue}
          </p>
          {isOverdue && (
            <p className="text-[9px] text-red-600 font-mono font-bold uppercase flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Overdue
            </p>
          )}
        </div>
      </div>

      {/* ── Condition Trajectory Sparkline ── */}
      {conditionHistory.length >= 2 && (
        <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded p-4 shadow-sm">
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#8e847a] mb-3">
            Condition Trajectory Over Time
          </p>
          <div className="flex items-end gap-2 overflow-x-auto pb-1">
            {conditionHistory.map((pt: { date: string; condition: string }, i: number) => {
              const prev = conditionHistory[i - 1];
              const trend = conditionTrend(prev?.condition, pt.condition);
              const pct = (((CONDITION_ORDER as Record<string, number>)[pt.condition] ?? 3) / 5) * 100;
              return (
                <div key={i} className="flex flex-col items-center gap-1 shrink-0 min-w-[52px]">
                  <span className={`text-[9px] font-mono font-bold ${CONDITION_COLORS[pt.condition]?.text || "text-gray-600"}`}>
                    {pt.condition}
                  </span>
                  <div className="w-8 bg-[#eae5d9] rounded-t" style={{ height: "60px", position: "relative" }}>
                    <div
                      className={`absolute bottom-0 left-0 right-0 rounded-t transition-all ${
                        CONDITION_COLORS[pt.condition]?.dot?.replace("bg-", "bg-") || "bg-gray-400"
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  {i > 0 && (
                    <span className="text-[9px]">
                      {trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-600" />}
                      {trend === "down" && <TrendingDown className="w-3 h-3 text-red-600" />}
                      {trend === "same" && <Minus className="w-3 h-3 text-gray-400" />}
                    </span>
                  )}
                  <span className="text-[8px] font-mono text-[#8e847a] text-center leading-none">
                    {new Date(pt.date).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filter Tabs ── */}
      <div className="flex flex-wrap gap-2">
        {filterLabels.map(f => (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide border transition-all cursor-pointer ${
              filterType === f.key
                ? "bg-[#3b5249] text-white border-transparent"
                : "bg-[#fdfcf7] border-[#dcd6c8] text-[#5c544d] hover:bg-[#eae5d9]"
            }`}
          >
            <Filter className="w-3 h-3" />
            {f.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] leading-none ${
              filterType === f.key ? "bg-white/20" : "bg-[#eae5d9]"
            }`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Timeline ── */}
      <div className="relative">
        {/* Vertical Track */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[#dfd6be]" />

        <div className="space-y-0">
          {filtered.length === 0 && (
            <div className="pl-12 py-10 text-center text-[#8e847a] text-xs font-serif italic">
              No events match this filter.
            </div>
          )}

          {filtered.map((event: TimelineEvent, idx: number) => {
            const isExpanded = expandedIds.has(event.id);
            const condMeta = CONDITION_COLORS[event.condition || ""] || null;
            const eventType = event.type as TimelineEventType;

            return (
              <div key={event.id} className="relative flex gap-4 pb-1">
                {/* Timeline Node */}
                <div className={`relative z-10 shrink-0 w-10 h-10 mt-3 rounded-full flex items-center justify-center shadow-sm border-2 border-[#f7f5f0] ${typeBg[eventType]}`}>
                  {typeIcons[eventType]}
                </div>

                {/* Event Card */}
                <div className={`flex-1 mb-4 bg-[#fdfcf7] border border-[#dcd6c8] rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
                  event.isAlert ? "border-red-200" : ""
                }`}>
                  {/* Card Header (always visible) */}
                  <button
                    onClick={() => toggleExpand(event.id)}
                    className="w-full text-left p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-[#faf8f4] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {/* Date badge */}
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-[#3b5249] bg-[#eae5d9] px-1.5 py-0.5 rounded">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(event.date).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric"
                          })}
                        </span>

                        {/* Type label */}
                        <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${typeBg[eventType]}`}>
                          {event.type}
                        </span>

                        {/* Alert badge */}
                        {event.isAlert && (
                          <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 bg-red-50 border border-red-200 text-red-700 rounded flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> High Risk
                          </span>
                        )}

                        {/* Condition badge for inspections */}
                        {event.condition && condMeta && (
                          <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${condMeta.badge}`}>
                            {event.condition}
                          </span>
                        )}
                      </div>

                      <h4 className="font-serif text-sm font-bold text-[#1c1a18] leading-snug">
                        {event.title}
                      </h4>
                      {event.subtitle && (
                        <p className="text-[11px] text-[#6e645a] font-sans mt-0.5 leading-snug">
                          {event.subtitle}
                        </p>
                      )}

                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[#8e847a] font-mono">
                        <User className="w-3 h-3" />
                        <span>{event.actor}</span>
                      </div>
                    </div>

                    {/* Expand toggle */}
                    <div className="shrink-0 mt-1">
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-[#8e847a]" />
                        : <ChevronRight className="w-4 h-4 text-[#8e847a]" />
                      }
                    </div>
                  </button>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-[#ece6da] bg-[#faf8f4] animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="p-4 space-y-3">
                        {/* Photo (for inspections) */}
                        {event.photoUrl && (
                          <div className="rounded overflow-hidden border border-[#dfd6be] aspect-video max-w-xs">
                            <img
                              src={event.photoUrl}
                              alt="Inspection documentation"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        {/* Detail key-value pairs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(event.details).map(([key, val]) => (
                            <div key={key} className="space-y-0.5">
                              <p className="text-[9px] font-mono uppercase tracking-wider text-[#8e847a]">{key}</p>
                              <p className="text-xs font-sans text-[#1c1a18] leading-snug break-words">{val || "—"}</p>
                            </div>
                          ))}
                        </div>

                        {/* Exact timestamp */}
                        <div className="pt-2 border-t border-[#ece6da] flex items-center gap-1.5 text-[9px] font-mono text-[#8e847a]">
                          <Clock className="w-3 h-3" />
                          <span>Recorded: {new Date(event.date).toLocaleString("en-IN", { timeZoneName: "short" })}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Leasehold Return Status Footer ── */}
      <div className={`p-4 rounded-lg border text-xs font-sans flex items-start gap-3 ${
        item.currentLocation === item.originalLocation
          ? "bg-emerald-50 border-emerald-200 text-emerald-900"
          : "bg-amber-50 border-amber-200 text-amber-900"
      }`}>
        {item.currentLocation === item.originalLocation
          ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        }
        <div>
          <p className="font-mono font-bold uppercase text-[10px] tracking-wider mb-1">
            Lease Return Status
          </p>
          {item.currentLocation === item.originalLocation ? (
            <p>This artifact is currently positioned at its <strong>mandatory lease-return origin</strong>: <em>{item.originalLocation}</em>. Compliant with trust legislation.</p>
          ) : (
            <p>This artifact is <strong>not at its registered origin</strong>. Mandatory return location is <em>{item.originalLocation}</em>, but it is currently in <em>{item.currentLocation}</em>. A relocation must be arranged before lease-end.</p>
          )}
        </div>
      </div>
    </div>
  );
}
