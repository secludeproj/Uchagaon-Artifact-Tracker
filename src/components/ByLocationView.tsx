import React, { useMemo } from "react";
import { Artifact } from "../types";
import { MapPin, ArrowRight, Layers, Eye } from "lucide-react";
import { REAL_ROOMS, blockForLocation } from "../lib/locations";

interface ByLocationViewProps {
  artifacts: Artifact[];
  onNavigate: (view: string, targetId?: string) => void;
}

export default function ByLocationView({ artifacts, onNavigate }: ByLocationViewProps) {
  // Grouping items by their dynamic currentLocation attribute.
  // Seeded with every real room first (even ones with 0 items currently),
  // so the property's full layout is always visible, not just rooms that
  // happen to already have an artifact assigned.
  const groupedLocations = useMemo(() => {
    const groups: Record<string, Artifact[]> = {};

    REAL_ROOMS.forEach((room) => {
      groups[room] = [];
    });

    artifacts.forEach((item) => {
      const loc = item.currentLocation || "Unassigned Reception Room";
      if (!groups[loc]) {
        groups[loc] = [];
      }
      groups[loc].push(item);
    });

    return groups;
  }, [artifacts]);

  // Sort in physical property order (Block A rooms, then B, then C, in the
  // same order they appear at the property), with any custom/unrecognized
  // location names grouped at the end, alphabetically among themselves.
  const roomOrderIndex = new Map(REAL_ROOMS.map((room, i) => [room, i]));
  const locationKeys = Object.keys(groupedLocations).sort((a, b) => {
    const ai = roomOrderIndex.has(a) ? roomOrderIndex.get(a)! : Infinity;
    const bi = roomOrderIndex.has(b) ? roomOrderIndex.get(b)! : Infinity;
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <span className="block text-[9px] font-mono uppercase tracking-widest text-[#8e847a] font-bold mb-0.5">Seclude Fort Uchagaon</span>
        <h2 className="font-serif text-xl font-bold text-[#1c1a18]">
          Registry Grouped By Spatial Locations
        </h2>
        <p className="text-xs text-[#6e645a] font-serif italic mt-0.5">
          Real-time physical asset mapping layout inside Seclude Palace and Hotel bounds.
        </p>
      </div>

      {locationKeys.length === 0 ? (
        <div className="bg-[#fdfcf7] border border-[#dcd6c8] p-12 text-center rounded">
          <MapPin className="w-8 h-8 text-[#c4bcae] mx-auto mb-2" />
          <p className="text-xs text-[#8e847a]">No active locations mapped in historical records.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(() => {
            let lastBlock = "";
            return locationKeys.map((location) => {
              const items = groupedLocations[location];
              const sumValue = items.reduce((sum, i) => sum + i.estimatedValue, 0);
              const thisBlock = blockForLocation(location);
              const showBlockHeader = thisBlock !== lastBlock;
              lastBlock = thisBlock;

              return (
                <React.Fragment key={location}>
                  {showBlockHeader && (
                    <div className="pt-2 first:pt-0">
                      <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#3b5249] border-b-2 border-[#3b5249] pb-1 inline-block">
                        {thisBlock}
                      </h3>
                    </div>
                  )}
                  <div
                    className="bg-[#fdfcf7] border border-[#dcd6c8] rounded shadow-sm overflow-hidden"
                  >
                {/* Section Header */}
                <div className="bg-[#f7f5f0] border-b border-[#ece6da] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-[#3b5249] text-white">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-serif text-sm font-bold text-[#1a1917]">{location}</h3>
                      <p className="text-[10px] font-mono text-[#6e645a] uppercase font-bold">
                        {items.length} {items.length === 1 ? "heritage piece" : "heritage pieces"} allocated
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] font-mono text-[#5c544d] self-end sm:self-auto">
                    {items.length > 0 ? (
                      <>
                        <span>
                          Original return match rate:{" "}
                          <span className="font-bold text-[#3b5249]">
                            {items.filter((i) => i.currentLocation === i.originalLocation).length} / {items.length} matched
                          </span>
                        </span>
                        <span className="h-4 w-px bg-[#c4bcae]"></span>
                        <span>
                          Est value: <span className="font-bold text-[#1c1a18]">₹ {sumValue.toLocaleString()}</span>
                        </span>
                      </>
                    ) : (
                      <span className="italic text-[#8e847a]">No items assigned to this space yet</span>
                    )}
                  </div>
                </div>

                {/* Group Items Grid */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {items.map((item) => {
                    const isReturnedToOrigin = item.currentLocation === item.originalLocation;
                    return (
                      <div
                        key={item.id}
                        onClick={() => onNavigate("item-detail", item.id)}
                        className="p-3 bg-[#fcfbf9] border border-[#e8e4db] hover:border-[#3b5249] rounded transition-all cursor-pointer flex gap-3 group relative overflow-hidden"
                      >
                        {/* Little indicator border for mismatched palace location */}
                        <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                          isReturnedToOrigin ? "bg-emerald-600" : "bg-amber-600"
                        }`}></div>

                        <img
                          src={item.photos?.[0] || "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=200"}
                          alt={item.name}
                          className="w-12 h-12 rounded object-cover border border-[#dcd6c8] group-hover:scale-105 transition-all bg-[#eae5d9]"
                          referrerPolicy="no-referrer"
                        />

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-[#1c1a18] truncate group-hover:text-[#3b5249] transition-all">
                              {item.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-mono text-[#8e847a] font-semibold">{item.id}</span>
                              <span className="h-2 w-px bg-[#c4bcae]"></span>
                              <span className="text-[9px] font-sans text-gray-500 italic">{item.category}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[9px] mt-1.5 font-mono">
                            <span className={isReturnedToOrigin ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                              {isReturnedToOrigin ? "✓ Original Palace Site" : "↳ Lease Relocation Setup"}
                            </span>
                            <span className="italic text-[#8e847a]">Condition: {item.condition}</span>
                          </div>
                        </div>

                        {/* Hover Arrow */}
                        <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center text-[#3b5249] self-center pl-1">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
                </React.Fragment>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
