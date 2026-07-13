import React, { useState, useMemo, useRef, useCallback } from "react";
import { Artifact } from "../types";
import { REAL_ROOMS } from "../lib/locations";
import PhotoCropModal from "./PhotoCropModal";
import {
  Camera, Upload, Crop, ArrowRight, ArrowLeft, SkipForward,
  ImageOff, Search, ClipboardList,
} from "lucide-react";

// Flags names that are just a bare, undecorated object word — the exact
// output you get when the source data had no material, color, or feature
// to build a specific name from. Not wrong, just worth a visual nudge to
// fix while you're looking at the real item.
const GENERIC_BARE_NAMES = new Set([
  "sofa", "shelf", "pot", "table", "chair", "lamp", "vase", "jar", "urn",
  "cupboard", "bed", "stool", "bench", "tray", "bowl", "cushion", "curtain",
  "clock", "fan", "mirror", "wall frame", "carpet", "trunk", "kettle set",
  "cups & glasses set", "dinnerware set", "hanger", "washbasin",
]);
function isGenericName(name: string): boolean {
  return GENERIC_BARE_NAMES.has(name.trim().toLowerCase());
}

interface PhotoIntakeViewProps {
  artifacts: Artifact[];
  onBack: () => void;
  onSavePhotos: (itemId: string, photos: string[], description: string, name: string) => Promise<void> | void;
}

// A streamlined, one-item-at-a-time photo intake screen — built specifically
// for working through a large backlog (hundreds of items) without the
// overhead of opening the full Add/Edit form and scrolling to the photo
// section for every single one.
export default function PhotoIntakeView({ artifacts, onBack, onSavePhotos }: PhotoIntakeViewProps) {
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [onlyGeneric, setOnlyGeneric] = useState(false);
  const [search, setSearch] = useState("");
  const [index, setIndex] = useState(0);
  const [stagedPhotos, setStagedPhotos] = useState<string[] | null>(null);
  const [croppingIdx, setCroppingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [stagedDescription, setStagedDescription] = useState<string | null>(null);
  const [stagedName, setStagedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const roomOrder = useMemo(() => new Map(REAL_ROOMS.map((r, i) => [r, i])), []);

  const queue = useMemo(() => {
    let list = artifacts;
    if (onlyMissing) list = list.filter(a => !a.photos || a.photos.length === 0);
    if (onlyGeneric) list = list.filter(a => isGenericName(a.name));
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(s));
    }
    return [...list].sort((a, b) => {
      const ai = roomOrder.has(a.currentLocation) ? roomOrder.get(a.currentLocation)! : Infinity;
      const bi = roomOrder.has(b.currentLocation) ? roomOrder.get(b.currentLocation)! : Infinity;
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    });
  }, [artifacts, onlyMissing, onlyGeneric, search, roomOrder]);

  const current = queue[Math.min(index, queue.length - 1)];
  const workingPhotos = stagedPhotos ?? current?.photos ?? [];
  const workingDescription = stagedDescription ?? current?.description ?? "";
  const workingName = stagedName ?? current?.name ?? "";

  const totalWithoutPhotos = useMemo(
    () => artifacts.filter(a => !a.photos || a.photos.length === 0).length,
    [artifacts]
  );
  const totalGenericNames = useMemo(
    () => artifacts.filter(a => isGenericName(a.name)).length,
    [artifacts]
  );

  const loadFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const readers = Array.from(files).map(
      file =>
        new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.onerror = reject;
          fr.readAsDataURL(file);
        })
    );
    Promise.all(readers).then(dataUrls => {
      setStagedPhotos([...(workingPhotos || []), ...dataUrls]);
    });
  }, [workingPhotos]);

  const goTo = (newIndex: number) => {
    setStagedPhotos(null);
    setStagedDescription(null);
    setStagedName(null);
    setIndex(Math.max(0, Math.min(newIndex, queue.length - 1)));
  };

  const handleSaveAndNext = async () => {
    if (!current) return;
    setSaving(true);
    try {
      await onSavePhotos(current.id, workingPhotos, workingDescription, workingName);
    } finally {
      setSaving(false);
      // Don't just increment — once the parent's artifacts prop refreshes,
      // this item drops out of the "only missing" queue on its own and the
      // next item slides into this same index automatically.
      goTo(index);
    }
  };

  const handleSkip = () => goTo(index + 1);

  if (queue.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-3">
        <ImageOff className="w-10 h-10 mx-auto text-emerald-600" />
        <h2 className="font-serif text-xl font-bold text-[#1c1a18]">
          {onlyMissing ? "Every item already has a photo!" : "No items match your search."}
        </h2>
        <p className="text-xs text-[#6e645a]">
          {onlyMissing && "Toggle off \"only missing\" below to browse and re-photograph anything anyway."}
        </p>
        <div className="flex justify-center gap-2 pt-2">
          {onlyMissing && (
            <button onClick={() => setOnlyMissing(false)} className="text-xs font-mono font-bold uppercase px-3 py-1.5 rounded border border-[#c4beaf] hover:bg-[#eae5d9] cursor-pointer">
              Show All Items
            </button>
          )}
          <button onClick={onBack} className="text-xs font-mono font-bold uppercase px-3 py-1.5 rounded bg-[#3b5249] text-white cursor-pointer">
            Back to Console
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between border-b border-[#dfd6be] pb-3">
        <div>
          <span className="block text-[9px] font-mono uppercase tracking-widest text-[#8e847a] font-bold mb-0.5">Seclude Fort Uchagaon</span>
          <h2 className="font-serif text-xl font-bold text-[#1c1a18] flex items-center gap-1.5">
            <ClipboardList className="w-5 h-5 text-[#3b5249]" /> Rapid Photo Intake
          </h2>
          <p className="text-xs text-[#6e645a] font-serif italic mt-0.5">
            {totalWithoutPhotos} item{totalWithoutPhotos === 1 ? "" : "s"} still need a photo, sorted room by room.
          </p>
        </div>
        <button onClick={onBack} className="p-1.5 px-3 border border-[#c4beaf] hover:bg-[#eae5d9] text-xs font-mono font-bold uppercase rounded cursor-pointer">
          Return to Console
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs font-mono text-[#5c544d] cursor-pointer">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => { setOnlyMissing(e.target.checked); goTo(0); }} />
          Only items without a photo
        </label>
        <label className="flex items-center gap-1.5 text-xs font-mono text-[#5c544d] cursor-pointer">
          <input type="checkbox" checked={onlyGeneric} onChange={(e) => { setOnlyGeneric(e.target.checked); goTo(0); }} />
          Only generic names ({totalGenericNames})
        </label>
        <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 text-[#8e847a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); goTo(0); }}
            placeholder="Jump to an item by name..."
            className="w-full text-xs p-1.5 bg-white border border-[#c8c2b5] rounded focus:outline-none"
          />
        </div>
      </div>

      {/* Progress */}
      <div className="w-full bg-[#eae5d9] rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-[#3b5249] h-full transition-all"
          style={{ width: `${((index + 1) / queue.length) * 100}%` }}
        />
      </div>
      <p className="text-[10px] font-mono text-[#8e847a] -mt-3">Item {index + 1} of {queue.length} in this queue</p>

      {/* Current item card */}
      <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded-lg shadow-sm p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={workingName}
              onChange={(e) => setStagedName(e.target.value)}
              className="font-serif text-lg font-bold text-[#1c1a18] bg-transparent border-b border-dashed border-[#c4beaf] focus:border-[#3b5249] focus:outline-none flex-1 py-0.5"
            />
            {isGenericName(workingName) && (
              <span className="text-[9px] font-mono font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                Generic name
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-[#8e847a] mt-1">{current.currentLocation} • {current.category}</p>

          {/* Extra identifying context — many bulk-imported names are
              generic ("Sofa", "Shelf", "Pot"), so this is what actually
              lets you confirm you've got the right physical item before
              attaching a photo to it. */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-[#6e645a]">
            {current.subCategory && <span><strong className="text-[#3b5249]">Original label:</strong> {current.subCategory}</span>}
            {current.dimensions && <span><strong className="text-[#3b5249]">Dimensions:</strong> {current.dimensions}</span>}
            {current.material && <span><strong className="text-[#3b5249]">Material:</strong> {current.material}</span>}
            {current.quantity && current.quantity > 1 && <span><strong className="text-[#3b5249]">Qty:</strong> {current.quantity}</span>}
            {current.handlingNotes && <span><strong className="text-[#3b5249]">Notes:</strong> {current.handlingNotes}</span>}
          </div>
        </div>

        {/* Editable description — most bulk-imported items never had one
            filled in, and this is the natural moment to add it, since
            you're already looking at the physical item to photograph it. */}
        <div>
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
            Description (fill in or correct while you're looking at it)
          </label>
          <textarea
            value={workingDescription}
            onChange={(e) => setStagedDescription(e.target.value)}
            rows={2}
            placeholder="e.g. Carved rosewood side table with brass inlay, minor scuff on left leg"
            className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249]"
          />
        </div>

        {/* Existing/staged photos */}
        {workingPhotos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {workingPhotos.map((p, i) => (
              <div key={i} className="relative group/thumb">
                <img src={p} alt={`Photo ${i + 1}`} className="w-20 h-20 object-cover rounded border-2 border-[#e8e4db]" referrerPolicy="no-referrer" />
                <button
                  type="button"
                  onClick={() => setCroppingIdx(i)}
                  className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-[#3b5249] hover:bg-[#2c3d36] text-white rounded-full flex items-center justify-center"
                  title="Crop / zoom"
                >
                  <Crop className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setStagedPhotos(workingPhotos.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xs leading-none"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); loadFiles(e.dataTransfer.files); }}
          className="border-2 border-dashed border-[#c4beaf] hover:border-[#3b5249] rounded-lg p-6 bg-[#fcfbf9] text-center cursor-pointer transition-all flex flex-col items-center gap-1.5"
        >
          <Upload className="w-6 h-6 text-[#beb5a1]" />
          <span className="text-xs font-bold font-sans text-[#6e645a]">Click, drag a file here, or use the camera button below</span>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => loadFiles(e.target.files)} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => loadFiles(e.target.files)} />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 py-2 text-xs font-mono font-bold uppercase bg-white border border-[#c4beaf] rounded hover:bg-[#eae5d9] cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" /> Use Camera
          </button>
        </div>

        {/* Nav / save controls */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#ece6da]">
          <button
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="p-2 px-3 border border-[#c4beaf] rounded text-xs font-mono font-bold uppercase disabled:opacity-30 hover:bg-[#eae5d9] cursor-pointer flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <button
            onClick={handleSkip}
            className="p-2 px-3 border border-[#c4beaf] rounded text-xs font-mono font-bold uppercase hover:bg-[#eae5d9] cursor-pointer flex items-center gap-1"
          >
            Skip <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleSaveAndNext}
            disabled={saving || (workingPhotos.length === 0 && !workingDescription.trim() && workingName.trim() === (current.name || "").trim())}
            className="flex-1 p-2 px-4 bg-[#3b5249] hover:bg-[#2c3d36] text-white rounded text-xs font-mono font-bold uppercase disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {saving ? "Saving..." : <>Save & Next <ArrowRight className="w-3.5 h-3.5" /></>}
          </button>
        </div>
      </div>

      {croppingIdx !== null && workingPhotos[croppingIdx] && (
        <PhotoCropModal
          imageSrc={workingPhotos[croppingIdx]}
          onCancel={() => setCroppingIdx(null)}
          onApply={(cropped) => {
            const next = [...workingPhotos];
            next[croppingIdx] = cropped;
            setStagedPhotos(next);
            setCroppingIdx(null);
          }}
        />
      )}
    </div>
  );
}
