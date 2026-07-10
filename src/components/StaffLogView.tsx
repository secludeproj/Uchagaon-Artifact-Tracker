import React, { useMemo, useState } from "react";
import { Artifact, Duty, Staff } from "../types";
import { ClipboardList, UserPlus, CheckCircle2, RotateCcw, Trash2, Users, ListChecks } from "lucide-react";

interface StaffLogViewProps {
  duties: Duty[];
  staff: Staff[];
  artifacts: Artifact[];
  currentUser: { name: string; email: string; role: string };
  isAdmin: boolean;
  onBack: () => void;
  onAddDuty: (duty: {
    assignedToName: string;
    task: string;
    relatedItemId?: string;
    relatedItemName?: string;
    dueDate?: string;
  }) => Promise<void> | void;
  onUpdateStatus: (id: string, status: "Pending" | "Completed") => Promise<void> | void;
  onDeleteDuty: (id: string) => Promise<void> | void;
}

export default function StaffLogView({
  duties,
  staff,
  artifacts,
  currentUser,
  isAdmin,
  onBack,
  onAddDuty,
  onUpdateStatus,
  onDeleteDuty,
}: StaffLogViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [assignedTo, setAssignedTo] = useState("__CUSTOM__");
  const [customName, setCustomName] = useState("");
  const [task, setTask] = useState("");
  const [relatedItemId, setRelatedItemId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<"All" | "Pending" | "Completed">("Pending");
  const [saving, setSaving] = useState(false);

  // Every distinct name that's ever been assigned a duty, plus registered
  // staff accounts — this is the "how many staff" count the manager asked for.
  const distinctStaffNames = useMemo(() => {
    const set = new Set<string>();
    staff.forEach((s) => set.add(s.name));
    duties.forEach((d) => set.add(d.assignedToName));
    return Array.from(set).filter(Boolean).sort();
  }, [staff, duties]);

  const pendingCount = duties.filter((d) => d.status === "Pending").length;
  const completedCount = duties.filter((d) => d.status === "Completed").length;

  const visibleDuties = duties.filter((d) => filter === "All" || d.status === filter);

  const resetForm = () => {
    setAssignedTo("__CUSTOM__");
    setCustomName("");
    setTask("");
    setRelatedItemId("");
    setDueDate("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = assignedTo === "__CUSTOM__" ? customName.trim() : assignedTo;
    if (!finalName || !task.trim()) return;

    const relatedItem = artifacts.find((a) => a.id === relatedItemId);
    setSaving(true);
    try {
      await onAddDuty({
        assignedToName: finalName,
        task: task.trim(),
        relatedItemId: relatedItem?.id,
        relatedItemName: relatedItem?.name,
        dueDate: dueDate || undefined,
      });
      resetForm();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#dfd6be] pb-3">
        <div>
          <span className="block text-[9px] font-mono uppercase tracking-widest text-[#8e847a] font-bold mb-0.5">Seclude Fort Uchagaon</span>
          <h2 className="font-serif text-xl font-bold text-[#1c1a18] flex items-center gap-1.5">
            <ClipboardList className="w-5 h-5 text-[#3b5249]" /> Staff Duty Log
          </h2>
          <p className="text-xs text-[#6e645a] font-serif italic mt-0.5">
            Who's assigned to what across Seclude Fort Uchagaon — inspections, photo updates, and other duties.
          </p>
        </div>
        <button
          onClick={onBack}
          className="p-1.5 px-3 border border-[#c4beaf] hover:bg-[#eae5d9] text-xs font-mono font-bold uppercase rounded cursor-pointer"
        >
          Return to Console
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded p-3 flex items-center gap-2.5">
          <Users className="w-5 h-5 text-[#3b5249] shrink-0" />
          <div>
            <span className="block text-lg font-bold text-[#1c1a18] leading-none">{distinctStaffNames.length}</span>
            <span className="text-[9px] font-mono uppercase text-[#8e847a] tracking-wide">Staff on record</span>
          </div>
        </div>
        <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded p-3 flex items-center gap-2.5">
          <ListChecks className="w-5 h-5 text-amber-700 shrink-0" />
          <div>
            <span className="block text-lg font-bold text-[#1c1a18] leading-none">{pendingCount}</span>
            <span className="text-[9px] font-mono uppercase text-[#8e847a] tracking-wide">Pending duties</span>
          </div>
        </div>
        <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded p-3 flex items-center gap-2.5 col-span-2 sm:col-span-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <span className="block text-lg font-bold text-[#1c1a18] leading-none">{completedCount}</span>
            <span className="text-[9px] font-mono uppercase text-[#8e847a] tracking-wide">Completed</span>
          </div>
        </div>
      </div>

      {/* Assign new duty (admin only) */}
      {isAdmin && (
        <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded shadow-sm">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer"
          >
            <span className="font-serif text-sm font-bold text-[#1c1a18] flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-[#3b5249]" /> Assign a New Duty
            </span>
            <span className="text-xs font-mono text-[#8e847a]">{showForm ? "▲ Close" : "▼ Open"}</span>
          </button>

          {showForm && (
            <form onSubmit={handleSubmit} className="p-4 pt-0 space-y-3 border-t border-[#eae5d9]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                    Staff Member
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none"
                  >
                    {staff.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                    <option value="__CUSTOM__">✍️ Enter a name not listed above...</option>
                  </select>
                  {assignedTo === "__CUSTOM__" && (
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Type staff name..."
                      className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] mt-1"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                    Related Artifact (optional)
                  </label>
                  <select
                    value={relatedItemId}
                    onChange={(e) => setRelatedItemId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none"
                  >
                    <option value="">— None —</option>
                    {artifacts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  Duty / Task
                </label>
                <input
                  type="text"
                  required
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="e.g. Check and upload the latest photo of the Damascus Sabre"
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  Due Date (optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="text-xs font-mono font-bold bg-[#3b5249] hover:bg-[#2c3d36] text-white py-2 px-4 rounded cursor-pointer disabled:opacity-50"
              >
                {saving ? "Assigning..." : "Assign Duty"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["Pending", "Completed", "All"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-mono font-bold uppercase px-3 py-1.5 rounded border cursor-pointer ${
              filter === f
                ? "bg-[#3b5249] text-white border-[#3b5249]"
                : "bg-white text-[#5c544d] border-[#c4beaf] hover:bg-[#eae5d9]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Duty list */}
      <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded shadow-sm divide-y divide-[#ece6da]">
        {visibleDuties.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-8">No duties in this view yet.</p>
        ) : (
          visibleDuties.map((d) => (
            <div key={d.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-[#1c1a18]">{d.assignedToName}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      d.status === "Completed" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {d.status}
                  </span>
                  {d.dueDate && (
                    <span className="text-[9px] font-mono text-[#8e847a]">Due: {d.dueDate}</span>
                  )}
                </div>
                <p className="text-xs text-[#34302c] font-sans">{d.task}</p>
                {d.relatedItemName && (
                  <p className="text-[10px] font-mono text-[#3b5249]">↳ Artifact: {d.relatedItemName} [{d.relatedItemId}]</p>
                )}
                <p className="text-[9px] font-mono text-[#8e847a]">
                  Assigned by {d.assignedBy} on {new Date(d.assignedDate).toLocaleDateString()}
                  {d.completedDate ? ` • Completed ${new Date(d.completedDate).toLocaleDateString()}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onUpdateStatus(d.id, d.status === "Pending" ? "Completed" : "Pending")}
                  className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1.5 rounded border cursor-pointer flex items-center gap-1 ${
                    d.status === "Pending"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                      : "bg-white hover:bg-[#eae5d9] text-[#5c544d] border-[#c4beaf]"
                  }`}
                >
                  {d.status === "Pending" ? (
                    <><CheckCircle2 className="w-3 h-3" /> Mark Done</>
                  ) : (
                    <><RotateCcw className="w-3 h-3" /> Reopen</>
                  )}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => onDeleteDuty(d.id)}
                    className="text-[10px] font-mono font-bold uppercase px-2 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
                    title="Delete duty"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
