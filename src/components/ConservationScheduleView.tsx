import React, { useState, useMemo } from "react";
import { Artifact } from "../types";
import { supabase } from "../lib/supabase";
import {
  CalendarDays, Clock, AlertTriangle, CheckCircle2, User, Search,
  Filter, ArrowRight, ChevronDown, ChevronUp, Plus, X, Save
} from "lucide-react";

interface ConservationScheduleViewProps {
  artifacts: Artifact[];
  currentUser: { name: string; email: string; role: string };
  onBack: () => void;
  onNavigate: (view: string, targetId?: string) => void;
}

interface ScheduleNote {
  artifactId: string;
  plannedDate: string;
  assignedTo: string;
  notes: string;
  priority: "High" | "Medium" | "Low";
  createdBy: string;
  createdAt: string;
}

const TODAY = new Date();

export default function ConservationScheduleView({ artifacts, currentUser, onBack, onNavigate }: ConservationScheduleViewProps) {
  const [filterStatus, setFilterStatus] = useState<"all" | "overdue" | "upcoming" | "scheduled" | "done">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scheduleNotes, setScheduleNotes] = useState<Record<string, ScheduleNote>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState<Partial<ScheduleNote>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Calculate conservation status for each artifact
  const scheduleData = useMemo(() => {
    return artifacts.map(a => {
      const lastDate = a.lastInspectedDate ? new Date(a.lastInspectedDate) : null;
      let dueDate: Date | null = null;
      let daysUntilDue: number | null = null;
      let status: "overdue" | "upcoming" | "current" | "never" = "never";

      if (lastDate) {
        dueDate = new Date(lastDate);
        dueDate.setMonth(dueDate.getMonth() + 6);
        daysUntilDue = Math.ceil((dueDate.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue < 0) status = "overdue";
        else if (daysUntilDue <= 90) status = "upcoming";
        else status = "current";
      }

      const note = scheduleNotes[a.id];

      return {
        ...a,
        dueDate,
        daysUntilDue,
        conservationStatus: status,
        scheduleNote: note,
      };
    });
  }, [artifacts, scheduleNotes]);

  const filteredData = useMemo(() => {
    return scheduleData.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.currentLocation.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterStatus === "overdue") return item.conservationStatus === "overdue";
      if (filterStatus === "upcoming") return item.conservationStatus === "upcoming";
      if (filterStatus === "scheduled") return !!item.scheduleNote;
      if (filterStatus === "done") return item.conservationStatus === "current";
      return true;
    }).sort((a, b) => {
      // Overdue first, then by days until due
      if (a.conservationStatus === "overdue" && b.conservationStatus !== "overdue") return -1;
      if (b.conservationStatus === "overdue" && a.conservationStatus !== "overdue") return 1;
      return (a.daysUntilDue ?? 9999) - (b.daysUntilDue ?? 9999);
    });
  }, [scheduleData, searchQuery, filterStatus]);

  const stats = useMemo(() => ({
    overdue: scheduleData.filter(a => a.conservationStatus === "overdue").length,
    upcoming: scheduleData.filter(a => a.conservationStatus === "upcoming").length,
    scheduled: Object.keys(scheduleNotes).length,
    current: scheduleData.filter(a => a.conservationStatus === "current").length,
  }), [scheduleData, scheduleNotes]);

  const startEditNote = (artifactId: string) => {
    const existing = scheduleNotes[artifactId];
    setNoteForm(existing || {
      artifactId,
      plannedDate: "",
      assignedTo: "",
      notes: "",
      priority: "Medium",
    });
    setEditingNoteId(artifactId);
  };

  const saveNote = async () => {
    if (!editingNoteId) return;
    setIsSaving(true);
    const newNote: ScheduleNote = {
      artifactId: editingNoteId,
      plannedDate: noteForm.plannedDate || "",
      assignedTo: noteForm.assignedTo || "",
      notes: noteForm.notes || "",
      priority: (noteForm.priority as any) || "Medium",
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };
    setScheduleNotes(prev => ({ ...prev, [editingNoteId]: newNote }));
    setEditingNoteId(null);
    setIsSaving(false);
  };

  const removeNote = (artifactId: string) => {
    setScheduleNotes(prev => {
      const copy = { ...prev };
      delete copy[artifactId];
      return copy;
    });
  };

  const statusConfig = {
    overdue: { label: "Overdue", color: "text-red-700 bg-red-50 border-red-200", dot: "bg-red-500" },
    upcoming: { label: "Due Soon", color: "text-amber-700 bg-amber-50 border-amber-200", dot: "bg-amber-500" },
    current: { label: "Current", color: "text-emerald-700 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
    never: { label: "Never Inspected", color: "text-gray-600 bg-gray-50 border-gray-200", dot: "bg-gray-400" },
  };

  const priorityColors = {
    High: "bg-red-100 text-red-800 border-red-300",
    Medium: "bg-amber-100 text-amber-800 border-amber-300",
    Low: "bg-blue-100 text-blue-800 border-blue-300",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-[#1c1a18] text-white rounded-lg p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#3b5249] flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold tracking-tight">Conservation Schedule</h2>
            <p className="text-[11px] font-mono text-gray-400 mt-0.5">Planning, assignment, and tracking for all heritage inspections</p>
          </div>
        </div>
        <button onClick={onBack}
          className="px-3 py-1.5 bg-[#2e2c2a] hover:bg-[#3e3835] text-gray-300 text-xs font-mono rounded border border-[#3e3835] transition-all cursor-pointer">
          ← Back
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Overdue", value: stats.overdue, color: "text-red-700", bg: "bg-red-50 border-red-200" },
          { label: "Due Within 90 Days", value: stats.upcoming, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
          { label: "Scheduled & Planned", value: stats.scheduled, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
          { label: "Up To Date", value: stats.current, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
        ].map(stat => (
          <div key={stat.label} className={`p-4 rounded-lg border ${stat.bg}`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#dcd6c8] rounded-lg p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by artifact name or location..."
            className="w-full pl-9 pr-4 py-2 border border-[#d3cdc0] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#3b5249]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: "all", label: "All" },
            { id: "overdue", label: "Overdue" },
            { id: "upcoming", label: "Due Soon" },
            { id: "scheduled", label: "Scheduled" },
            { id: "done", label: "Up To Date" },
          ].map(f => (
            <button key={f.id} onClick={() => setFilterStatus(f.id as any)}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded border transition-all cursor-pointer ${
                filterStatus === f.id ? "bg-[#3b5249] text-white border-[#3b5249]" : "bg-white text-[#6e645a] border-[#d3cdc0] hover:bg-[#f5f2eb]"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Artifact list */}
      <div className="bg-white border border-[#dcd6c8] rounded-lg shadow-sm overflow-hidden">
        <div className="border-b border-[#ece6da] px-5 py-3 bg-[#fdfcf7]">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#3b5249]">
            {filteredData.length} artifact{filteredData.length !== 1 ? "s" : ""} shown
          </h3>
        </div>

        {filteredData.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400 font-serif italic">
            No artifacts match this filter.
          </div>
        ) : (
          <div className="divide-y divide-[#f0ece4]">
            {filteredData.map(item => {
              const config = statusConfig[item.conservationStatus];
              const isExpanded = expandedId === item.id;
              const isEditingThis = editingNoteId === item.id;
              const note = item.scheduleNote;

              return (
                <div key={item.id} className="transition-all">
                  {/* Main row */}
                  <div className="p-4 sm:p-5 hover:bg-[#fdfcf7] flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`}></div>
                      <div className="min-w-0">
                        <button onClick={() => onNavigate("item-detail", item.id)}
                          className="font-bold text-sm text-[#1c1a18] hover:text-[#3b5249] hover:underline truncate text-left cursor-pointer">
                          {item.name}
                        </button>
                        <p className="text-xs text-[#6e645a] truncate">{item.currentLocation} · {item.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${config.color}`}>
                        {config.label}
                        {item.daysUntilDue !== null && (
                          item.daysUntilDue < 0
                            ? ` · ${Math.abs(item.daysUntilDue)}d overdue`
                            : ` · ${item.daysUntilDue}d left`
                        )}
                      </span>

                      {note && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${priorityColors[note.priority]}`}>
                          {note.priority} Priority
                        </span>
                      )}

                      <button onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="p-1.5 hover:bg-[#eae5d9] rounded transition-all cursor-pointer">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="px-5 pb-5 bg-[#fafaf7]">
                      {!isEditingThis ? (
                        note ? (
                          <div className="bg-white border border-[#ece6da] rounded p-4 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                              <div>
                                <p className="font-mono text-[9px] uppercase text-gray-400 mb-0.5">Planned Date</p>
                                <p className="font-bold text-[#1c1a18]">{note.plannedDate || "—"}</p>
                              </div>
                              <div>
                                <p className="font-mono text-[9px] uppercase text-gray-400 mb-0.5">Assigned To</p>
                                <p className="font-bold text-[#1c1a18] flex items-center gap-1"><User className="w-3 h-3" /> {note.assignedTo || "Unassigned"}</p>
                              </div>
                              <div>
                                <p className="font-mono text-[9px] uppercase text-gray-400 mb-0.5">Created By</p>
                                <p className="text-[#6e645a]">{note.createdBy} · {new Date(note.createdAt).toLocaleDateString("en-IN")}</p>
                              </div>
                            </div>
                            {note.notes && (
                              <div>
                                <p className="font-mono text-[9px] uppercase text-gray-400 mb-0.5">Notes</p>
                                <p className="text-xs text-[#5c544d]">{note.notes}</p>
                              </div>
                            )}
                            <div className="flex gap-2 pt-2">
                              <button onClick={() => startEditNote(item.id)}
                                className="px-3 py-1 bg-[#eae5d9] hover:bg-[#d3cdc0] text-[#3b5249] text-[10px] font-mono font-bold rounded cursor-pointer transition-all">
                                Edit Plan
                              </button>
                              <button onClick={() => removeNote(item.id)}
                                className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-mono font-bold rounded cursor-pointer transition-all">
                                Remove Plan
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => startEditNote(item.id)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#3b5249] hover:bg-[#2c3d36] text-white text-xs font-mono font-bold rounded cursor-pointer transition-all">
                            <Plus className="w-3.5 h-3.5" /> Schedule Inspection
                          </button>
                        )
                      ) : (
                        <div className="bg-white border-2 border-[#3b5249] rounded p-4 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">Planned Date</label>
                              <input type="date" value={noteForm.plannedDate || ""}
                                onChange={e => setNoteForm({ ...noteForm, plannedDate: e.target.value })}
                                className="w-full text-xs p-2 border border-[#d3cdc0] rounded focus:outline-none focus:ring-1 focus:ring-[#3b5249]" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">Assigned To</label>
                              <input type="text" value={noteForm.assignedTo || ""}
                                onChange={e => setNoteForm({ ...noteForm, assignedTo: e.target.value })}
                                placeholder="Staff member name"
                                className="w-full text-xs p-2 border border-[#d3cdc0] rounded focus:outline-none focus:ring-1 focus:ring-[#3b5249]" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">Priority</label>
                            <div className="flex gap-2">
                              {(["High", "Medium", "Low"] as const).map(p => (
                                <button key={p} type="button" onClick={() => setNoteForm({ ...noteForm, priority: p })}
                                  className={`px-3 py-1 text-xs font-mono font-bold rounded border cursor-pointer transition-all ${
                                    noteForm.priority === p ? priorityColors[p] : "bg-white text-gray-500 border-gray-200"
                                  }`}>
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">Notes</label>
                            <textarea value={noteForm.notes || ""}
                              onChange={e => setNoteForm({ ...noteForm, notes: e.target.value })}
                              rows={2}
                              placeholder="What needs to be checked, materials required, special handling notes..."
                              className="w-full text-xs p-2 border border-[#d3cdc0] rounded focus:outline-none focus:ring-1 focus:ring-[#3b5249] resize-none" />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={saveNote} disabled={isSaving}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3b5249] hover:bg-[#2c3d36] text-white text-xs font-mono font-bold rounded cursor-pointer transition-all disabled:opacity-50">
                              <Save className="w-3.5 h-3.5" /> {isSaving ? "Saving..." : "Save Plan"}
                            </button>
                            <button onClick={() => setEditingNoteId(null)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-mono font-bold rounded cursor-pointer transition-all">
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded-lg p-4">
        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#3b5249] mb-2">Inspection Cycle</p>
        <p className="text-[11px] text-[#6e645a] leading-relaxed">
          Artifacts require inspection every 6 months from their last recorded date.
          <span className="text-red-700 font-bold"> Red = Overdue</span> ·
          <span className="text-amber-700 font-bold"> Amber = Due within 90 days</span> ·
          <span className="text-emerald-700 font-bold"> Green = Current</span> ·
          <span className="text-gray-500 font-bold"> Grey = Never inspected</span>
        </p>
      </div>
    </div>
  );
}
