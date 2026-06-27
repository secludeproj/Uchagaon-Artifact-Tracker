import React from "react";
import { Staff, TeamActivity } from "../types";
import { Users, Clock, History, UserCheck, ShieldCheck, Footprints } from "lucide-react";

interface TeamViewProps {
  staff: Staff[];
  activity: TeamActivity[];
  currentUser: { name: string; email: string; role: string };
  onBack: () => void;
}

export default function TeamView({ staff, activity, currentUser, onBack }: TeamViewProps) {
  return (
    <div className="space-y-6">
      {/* Roster Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#dfd6be] pb-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#1c1a18] flex items-center gap-1.5">
            <Users className="w-5 h-5 text-[#3b5249]" /> Conservation Officers & Activity Logs
          </h2>
          <p className="text-xs text-[#6e645a] font-serif italic mt-0.5">
            Active staff members currently patrolling the Seclude Palace and Hotel spaces.
          </p>
        </div>

        <button
          onClick={onBack}
          className="p-1.5 px-3 border border-[#c4beaf] hover:bg-[#eae5d9] text-xs font-mono font-bold uppercase rounded cursor-pointer"
        >
          Return to Console
        </button>
      </div>

      {/* Main Core Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Curators Profiles Roster list (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-[#fdfcf7] border border-[#dcd6c8] rounded shadow-sm overflow-hidden divide-y divide-[#ece6da]">
          <div className="p-4 bg-[#f7f5f0]">
            <h4 className="font-serif text-xs font-bold text-[#1c1a18] uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4.5 h-4.5 text-[#3b5249]" /> Registered Custody Curators
            </h4>
          </div>

          <div className="p-4 space-y-4">
            {staff.map((curr) => {
              const activeUserBadge = curr.email === currentUser.email;
              return (
                <div 
                  key={curr.id}
                  className={`p-3.5 rounded border transition-all flex items-start gap-3.5 relative overflow-hidden ${
                    activeUserBadge 
                      ? "bg-emerald-50 bg-opacity-70 border-[#b5ccbf] shadow-sm" 
                      : "bg-[#fcfbf9] border-[#e8e4db]"
                  }`}
                >
                  {activeUserBadge && (
                    <div className="absolute top-0 right-0 bg-[#3b5249] text-white font-mono text-[7px] tracking-widest font-bold uppercase px-1.5 py-0.5 rounded-bl">
                      Active Session Owner
                    </div>
                  )}

                  <img 
                    src={curr.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${curr.name}`} 
                    alt={curr.name}
                    className="w-10 h-10 rounded-full border border-[#c4beaf] bg-[#eae5d9] object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />

                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-[#1c1a18] truncate flex items-center gap-1">
                      {curr.name}
                    </h5>
                    <p className="text-[10px] font-mono text-gray-500 font-semibold">{curr.role}</p>

                    <div className="mt-2 flex flex-wrap gap-2 text-[9px] font-mono text-[#8e847a]">
                      <span>Email: <strong className="text-gray-700">{curr.email}</strong></span>
                      <span className="h-2.5 w-px bg-gray-300"></span>
                      <span>Joined: <strong className="text-gray-700">{curr.joinedDate}</strong></span>
                    </div>

                    <div className="mt-1 flex items-center gap-1 font-mono text-[9px] text-[#3d5246] font-bold">
                      <Clock className="w-3 h-3 text-[#3b5249]" /> Active: {new Date(curr.lastActive).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Scrolling Global Actions Feed entries (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-[#fdfcf7] border border-[#dcd6c8] rounded shadow-sm overflow-hidden">
          <div className="p-4 bg-[#f7f5f0] border-b border-[#ece6da]">
            <h4 className="font-serif text-xs font-bold text-[#1c1a18] uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4.5 h-4.5 text-[#3b5249]" /> Un-deletable Registry transaction feed
            </h4>
          </div>

          <div className="p-4 divide-y divide-[#ece6da] max-h-[80vh] overflow-y-auto bg-white">
            {activity.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-8">No log files committed recently.</p>
            ) : (
              activity.map((act) => {
                const isRelocate = act.action === "move";
                return (
                  <div key={act.id} className="p-3.5 flex gap-3 text-xs leading-relaxed">
                    <div className="shrink-0 pt-0.5">
                      <div className={`p-1.5 rounded-full ${
                        act.action === "add" ? "bg-emerald-500 text-white" :
                        act.action === "edit" ? "bg-blue-500 text-white" :
                        act.action === "move" ? "bg-amber-600 text-white" : "bg-red-500 text-white"
                      }`}>
                        <Footprints className="w-4.5 h-4.5" />
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between text-[10px] gap-2">
                        <div className="font-mono">
                          <strong className="text-[#1c1a18]">{act.userName}</strong> 
                          <span className="text-gray-400"> ( {act.userEmail} )</span>
                        </div>
                        <span className="text-gray-500 font-mono text-[9px]">
                          {new Date(act.timestamp).toLocaleDateString()} at {new Date(act.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <p className="text-[#1c1a18] font-sans">
                        CUSTODY TRANSACTION:{" "}
                        <span className={`px-1 rounded text-[10px] font-mono font-bold uppercase ${
                          act.action === "add" ? "bg-emerald-50 text-emerald-800" :
                          act.action === "edit" ? "bg-blue-50 text-blue-800" :
                          act.action === "move" ? "bg-amber-50 text-amber-850" : "bg-red-50 text-red-800"
                        }`}>
                          {act.action}
                        </span>{" "}
                        on <strong className="text-[#3b5249]">{act.artifactName} [ {act.artifactId} ]</strong>
                      </p>

                      <div className="text-[11px] text-[#5c544d] bg-[#fbfbf8] border border-[#eae5d9] p-2 rounded italic">
                        "{act.details}"
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
