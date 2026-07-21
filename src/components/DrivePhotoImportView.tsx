import React, { useMemo, useState } from "react";
import { Artifact } from "../types";
import { groupByRoom } from "../lib/locations";
import {
  DriveAuthError,
  DriveImageFile,
  extractDriveFolderId,
  fetchDriveImageAsDataUrl,
  listImagesInFolder,
  nameSimilarity,
} from "../lib/googleDrive";
import {
  FolderOpen,
  ImagePlus,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ImageOff,
  Check,
} from "lucide-react";

interface DrivePhotoImportViewProps {
  artifacts: Artifact[];
  onBack: () => void;
  driveAccessToken: string | null;
  onAppendPhotos: (itemId: string, dataUrls: string[]) => Promise<void>;
}

type ImportResult = "pending" | "success" | "failed";

export default function DrivePhotoImportView({ artifacts, onBack, driveAccessToken, onAppendPhotos }: DrivePhotoImportViewProps) {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [onlyMissingPhotos, setOnlyMissingPhotos] = useState(true);

  const [driveFiles, setDriveFiles] = useState<DriveImageFile[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({}); // driveFileId -> data URL
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ done: 0, total: 0 });
  const [driveError, setDriveError] = useState("");

  // itemId -> Drive file IDs selected for it. An item can take more than one.
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importResults, setImportResults] = useState<Record<string, ImportResult>>({});

  const groups = useMemo(() => groupByRoom(artifacts), [artifacts]);

  const roomsWithDriveLinks = groups.map((g) => ({
    ...g,
    driveLink: g.items.find((i) => i.driveLink)?.driveLink || null,
    missingCount: g.items.filter((i) => (i.photos || []).length === 0).length,
  }));

  const roomItems = selectedRoom
    ? (groups.find((g) => g.room === selectedRoom)?.items || []).filter(
        (i) => !onlyMissingPhotos || (i.photos || []).length === 0
      )
    : [];

  const openRoom = async (room: string, driveLink: string | null) => {
    setSelectedRoom(room);
    setDriveFiles([]);
    setPreviews({});
    setAssignments({});
    setImportResults({});
    setDriveError("");

    if (!driveAccessToken) {
      setDriveError("No Google Drive access. Sign out and sign back in, and approve the Drive permission request when prompted.");
      return;
    }
    if (!driveLink) {
      setDriveError("No Drive folder link is set for any item in this room.");
      return;
    }
    const folderId = extractDriveFolderId(driveLink);
    if (!folderId) {
      setDriveError("Couldn't recognize a Drive folder ID in this room's link.");
      return;
    }

    setLoadingDrive(true);
    try {
      const files = await listImagesInFolder(folderId, driveAccessToken);
      setDriveFiles(files);
      setLoadProgress({ done: 0, total: files.length });

      const loaded: Record<string, string> = {};
      for (const file of files) {
        try {
          loaded[file.id] = await fetchDriveImageAsDataUrl(file.id, driveAccessToken);
        } catch (err) {
          console.warn("Failed to load preview for", file.name, err);
        }
        setLoadProgress((p) => ({ ...p, done: p.done + 1 }));
      }
      setPreviews(loaded);

      // Auto-suggest the single best-matching Drive photo per item, above a
      // reasonably confident similarity threshold. Always addable/removable
      // below — this is just a starting point, not a requirement.
      const items = groups.find((g) => g.room === room)?.items || [];
      const nextAssignments: Record<string, string[]> = {};
      for (const item of items) {
        let best: { id: string; score: number } | null = null;
        for (const file of files) {
          const score = nameSimilarity(file.name, item.name);
          if (score > 0.5 && (!best || score > best.score)) best = { id: file.id, score };
        }
        nextAssignments[item.id] = best ? [best.id] : [];
      }
      setAssignments(nextAssignments);
    } catch (err: any) {
      setDriveError(err instanceof DriveAuthError ? err.message : `Could not load this room's Drive folder: ${err.message}`);
    } finally {
      setLoadingDrive(false);
    }
  };

  const togglePhotoForItem = (itemId: string, fileId: string) => {
    setAssignments((prev) => {
      const current = prev[itemId] || [];
      const next = current.includes(fileId) ? current.filter((id) => id !== fileId) : [...current, fileId];
      return { ...prev, [itemId]: next };
    });
  };

  const assignedItemCount = Object.values(assignments).filter((ids) => ids.length > 0).length;
  const assignedPhotoCount = Object.values(assignments).reduce((sum, ids) => sum + ids.length, 0);

  const runImport = async () => {
    const toImport = Object.entries(assignments).filter(([, ids]) => ids.length > 0);
    if (toImport.length === 0) return;
    setImporting(true);
    setImportProgress({ done: 0, total: toImport.length });
    const results: Record<string, ImportResult> = {};

    for (const [itemId, fileIds] of toImport) {
      const dataUrls = fileIds.map((id) => previews[id]).filter(Boolean) as string[];
      try {
        if (dataUrls.length === 0) throw new Error("Preview(s) not loaded");
        await onAppendPhotos(itemId, dataUrls);
        results[itemId] = "success";
      } catch (err) {
        console.error("Failed to import photos for", itemId, err);
        results[itemId] = "failed";
      }
      setImportResults({ ...results });
      setImportProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setImporting(false);
  };

  if (!selectedRoom) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 border-b border-[#dfd6be] pb-3">
          <div>
            <span className="block text-[9px] font-mono uppercase tracking-widest text-[#8e847a] font-bold mb-0.5">Seclude Fort Uchagaon</span>
            <h2 className="font-serif text-xl font-bold text-[#1c1a18] flex items-center gap-1.5">
              <FolderOpen className="w-5 h-5 text-[#3b5249]" /> Drive Photo Import
            </h2>
            <p className="text-xs text-[#6e645a] font-serif italic mt-0.5">
              Pull photos straight from each room's linked Google Drive folder — pick a room to get started.
            </p>
          </div>
          <button onClick={onBack} className="p-1 px-3 border border-[#c4beaf] hover:bg-[#eae5d9] rounded text-xs font-mono font-bold uppercase cursor-pointer shrink-0">
            Back
          </button>
        </div>

        {!driveAccessToken && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded text-xs font-mono flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>No Google Drive access on this session yet. Sign out and sign back in — you'll see an extra Google permission prompt for Drive access, approve it, then come back here.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {roomsWithDriveLinks.map(({ room, items, driveLink, missingCount }) => (
            <button
              key={room}
              onClick={() => openRoom(room, driveLink)}
              disabled={!driveLink}
              className={`text-left p-4 bg-[#fdfcf7] border rounded-lg transition-all ${
                driveLink ? "border-[#dcd6c8] hover:border-[#3b5249] hover:shadow-sm cursor-pointer" : "border-[#ece6da] opacity-50 cursor-not-allowed"
              }`}
            >
              <h4 className="font-serif text-sm font-bold text-[#1c1a18]">{room}</h4>
              <p className="text-[10px] font-mono text-[#8e847a] mt-1">{items.length} items · {missingCount} missing photos</p>
              {!driveLink && <p className="text-[9px] font-mono text-red-500 mt-1">No Drive link set</p>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-[#dfd6be] pb-3">
        <div>
          <span className="block text-[9px] font-mono uppercase tracking-widest text-[#8e847a] font-bold mb-0.5">Seclude Fort Uchagaon</span>
          <h2 className="font-serif text-xl font-bold text-[#1c1a18] flex items-center gap-1.5">
            <FolderOpen className="w-5 h-5 text-[#3b5249]" /> {selectedRoom}
          </h2>
          <p className="text-xs text-[#6e645a] font-serif italic mt-0.5">
            Click one or more Drive photos to assign them to an item, then import.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setOnlyMissingPhotos((v) => !v)}
            className={`p-1 px-3 rounded text-[10px] font-mono font-bold uppercase border cursor-pointer ${
              onlyMissingPhotos ? "bg-[#3b5249] text-white border-[#2f423a]" : "bg-white border-[#beb39e] hover:bg-[#eae5d9]"
            }`}
          >
            Only Missing Photos
          </button>
          <button onClick={() => setSelectedRoom(null)} className="p-1 px-3 border border-[#c4beaf] hover:bg-[#eae5d9] rounded text-xs font-mono font-bold uppercase cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 inline -mt-0.5 mr-1" /> Rooms
          </button>
        </div>
      </div>

      {driveError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded text-xs font-mono flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{driveError}</span>
        </div>
      )}

      {loadingDrive && (
        <div className="p-6 bg-[#fdfcf7] border border-[#dcd6c8] rounded text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#3b5249]" />
          <p className="text-xs font-mono text-[#6e645a]">
            Loading Drive photos... {loadProgress.done}/{loadProgress.total}
          </p>
        </div>
      )}

      {!loadingDrive && !driveError && driveFiles.length === 0 && (
        <div className="p-8 bg-[#fdfcf7] border border-[#dcd6c8] rounded text-center text-[#8e847a]">
          <ImageOff className="w-7 h-7 mx-auto mb-2 text-[#beb5a1]" />
          <p className="text-xs">No images found in this room's Drive folder.</p>
        </div>
      )}

      {!loadingDrive && driveFiles.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-mono text-[#6e645a]">
              {driveFiles.length} Drive photos found · {assignedPhotoCount} selected across {assignedItemCount} item(s)
            </p>
            <button
              onClick={runImport}
              disabled={assignedItemCount === 0 || importing}
              className={`p-1.5 px-4 text-white rounded font-bold text-xs uppercase font-mono flex items-center gap-1.5 border shadow transition active:scale-95 ${
                assignedItemCount === 0 || importing
                  ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                  : "bg-[#3b5249] border-[#2f423a] hover:bg-[#2f423a] cursor-pointer"
              }`}
            >
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
              {importing ? `Importing ${importProgress.done}/${importProgress.total}...` : `Import ${assignedPhotoCount} Photos`}
            </button>
          </div>

          <div className="space-y-3">
            {roomItems.map((item) => {
              const assignedIds = assignments[item.id] || [];
              const result = importResults[item.id];
              const existingPhotos = item.photos || [];
              return (
                <div key={item.id} className="p-3 bg-[#fdfcf7] border border-[#dcd6c8] rounded-lg space-y-2.5">
                  {/* Full item context so near-duplicate names (e.g. two
                      "Marble Table"s in the same room) can be told apart. */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-serif font-bold text-[#1c1a18]">{item.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] font-mono text-[#8e847a] mt-0.5">
                        <span>{item.id}</span>
                        <span>{item.category}{item.subCategory ? ` / ${item.subCategory}` : ""}</span>
                        {item.material && <span>Material: {item.material}</span>}
                        {item.dimensions && <span>Size: {item.dimensions}</span>}
                        {item.quantity && item.quantity > 1 && <span>Qty: {item.quantity}</span>}
                        <span>Condition: {item.condition}</span>
                      </div>
                      {item.description && (
                        <p className="text-[10px] text-[#6e645a] font-sans mt-1 italic">{item.description}</p>
                      )}
                    </div>
                    {result === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {result === "failed" && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                  </div>

                  {existingPhotos.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-mono uppercase text-[#8e847a] shrink-0">Already has:</span>
                      <div className="flex gap-1 overflow-x-auto">
                        {existingPhotos.map((url, i) => (
                          <img key={i} src={url} alt="" className="w-8 h-8 rounded object-cover border border-[#dcd6c8] shrink-0" />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {driveFiles.map((file) => {
                      const isAssigned = assignedIds.includes(file.id);
                      const preview = previews[file.id];
                      return (
                        <button
                          key={file.id}
                          type="button"
                          title={file.name}
                          onClick={() => togglePhotoForItem(item.id, file.id)}
                          className={`relative shrink-0 w-16 h-16 rounded border-2 overflow-hidden cursor-pointer transition-all ${
                            isAssigned ? "border-[#3b5249] ring-2 ring-[#3b5249]/40" : "border-[#dcd6c8] hover:border-[#8c745c]"
                          }`}
                        >
                          {preview ? (
                            <img src={preview} alt={file.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <ImageOff className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                          {isAssigned && (
                            <span className="absolute top-0.5 right-0.5 bg-[#3b5249] text-white rounded-full p-0.5">
                              <Check className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
