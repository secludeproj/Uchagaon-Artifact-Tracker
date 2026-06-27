import React, { useState } from "react";
import { Artifact, MovementLog } from "../types";
import QRGenerator from "./QRGenerator";
import ConservationTimelineView from "./ConservationTimelineView";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { 
  Building, 
  MapPin, 
  ShieldAlert, 
  Calendar, 
  UserCheck, 
  Bookmark, 
  Coins, 
  FileText, 
  Printer, 
  ArrowLeft, 
  Trash2, 
  Edit3, 
  GitCommit, 
  Compass, 
  ArrowRightLeft,
  X,
  QrCode,
  Award,
  ShieldCheck,
  GitBranch
} from "lucide-react";

interface ItemDetailViewProps {
  itemId: string;
  artifacts: Artifact[];
  currentUser: { name: string; email: string; role: string };
  onBack: () => void;
  onEdit: (itemId: string) => void;
  onMoveTransaction: (id: string, updateData: { newLocation: string; newStatus: string; note: string }) => void;
  onDeleteTrigger: (itemId: string) => void;
  onUpdateItem: (id: string, updatedFields: Partial<Artifact>) => Promise<void>;
}

export default function ItemDetailView({ 
  itemId, 
  artifacts, 
  currentUser,
  onBack, 
  onEdit, 
  onMoveTransaction, 
  onDeleteTrigger,
  onUpdateItem
}: ItemDetailViewProps) {
  const item = artifacts.find((a) => a.id === itemId);

  const userRole = currentUser?.role?.trim()?.toUpperCase() || "";
  const isAdmin = userRole === "ADMIN";
  const isStaff = userRole === "STAFF";
  const isOwnerView = userRole === "OWNER VIEW" || userRole === "OWNER" || userRole === "READ-ONLY" || userRole === "READ ONLY";

  const canMove = isAdmin || isStaff;
  const canEdit = isAdmin || isStaff;
  const canDelete = isAdmin;

  // Quick fallback if not found
  if (!item) {
    return (
      <div className="bg-[#fdfcf7] border border-[#dcd6c8] p-8 text-center rounded">
        <ShieldAlert className="w-8 h-8 text-red-650 mx-auto mb-2" />
        <h4 className="font-serif text-sm font-bold">Historical Record Stale or Deleted</h4>
        <button onClick={onBack} className="mt-4 p-2 px-4 bg-[#3b5249] text-white text-xs rounded">
          Return to All Artifacts
        </button>
      </div>
    );
  }

  // Gallery state
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Guest Story QR Code state
  const [showGuestQrModal, setShowGuestQrModal] = useState(false);

  // Conservation Timeline full-screen view state
  const [showTimeline, setShowTimeline] = useState(false);

  // Custody Certificate state
  const [showCustodyCertificateModal, setShowCustodyCertificateModal] = useState(false);
  const [certificateHash, setCertificateHash] = useState("");
  const [certificateId, setCertificateId] = useState("");

  React.useEffect(() => {
    if (showCustodyCertificateModal && item) {
      const dataToHash = {
        id: item.id || "",
        name: item.name || "",
        category: item.category || "",
        material: item.material || "",
        dimensions: item.dimensions || "",
        condition: item.condition || "",
        status: item.status || "",
        originalLocation: item.originalLocation || "",
        currentLocation: item.currentLocation || "",
        estimatedValue: Number(item.estimatedValue) || 0,
        movementHistory: item.movementHistory || [],
        inspectionHistory: item.inspectionHistory || []
      };
      
      const computeHash = async () => {
        try {
          const jsonStr = JSON.stringify(dataToHash, Object.keys(dataToHash).sort());
          const encoder = new TextEncoder();
          const bytes = encoder.encode(jsonStr);
          const hashBuffer = await window.crypto.subtle.digest("SHA-256", bytes);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          setCertificateHash(hex);
        } catch (err) {
          console.error("Cryptographic signing failed:", err);
          setCertificateHash("VERIFICATION_ERROR_FALLBACK_HASH_SECURE_BYPASS");
        }
      };
      
      computeHash();
      setCertificateId(`CERT-SECLUDE-${item.id.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`);
    }
  }, [showCustodyCertificateModal, item]);

  // Relocation overlay/modal trigger state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [newLocation, setNewLocation] = useState(item.currentLocation);
  const [newStatus, setNewStatus] = useState(item.status);
  const [movementNote, setMovementNote] = useState("");

  // Locations list derived from all artifacts and standard defaults
  const currentLocationsList = React.useMemo(() => {
    const locs = new Set<string>();
    // Prepopulated standard defaults
    locs.add("Main Lobby Display Panel A");
    locs.add("Durbar Hall East Wall");
    locs.add("Durbar Hall West Wall");
    locs.add("Palace Conservation Laboratory");
    locs.add("North Gallery Walkway");
    locs.add("Lobby Lounge Area B");
    locs.add("Zen Garden Pavillion");
    locs.add("West Wing Vault");
    
    if (artifacts && Array.isArray(artifacts)) {
      artifacts.forEach((a) => {
        if (a.currentLocation) locs.add(a.currentLocation);
      });
    }
    return Array.from(locs).filter(Boolean);
  }, [artifacts]);

  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [customLocationText, setCustomLocationText] = useState("");

  // Sync form states when item changes or modal opens
  React.useEffect(() => {
    if (item) {
      setNewLocation(item.currentLocation);
      setNewStatus(item.status);
      setMovementNote("");
      
      const isCustom = !currentLocationsList.includes(item.currentLocation);
      setIsCustomLocation(isCustom);
      setCustomLocationText(isCustom ? item.currentLocation : "");
    }
  }, [item?.id, showMoveModal, currentLocationsList]);

  // AI Inspection state
  const [showAiInspection, setShowAiInspection] = useState(false);
  const [inspectionPhoto, setInspectionPhoto] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string>("image/jpeg");
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonNotes, setComparisonNotes] = useState("");
  const [newInspectionCondition, setNewInspectionCondition] = useState<'Mint' | 'Good' | 'Fair' | 'Poor' | 'Damaged'>(item.condition);
  const [inspectorName, setInspectorName] = useState(currentUser?.name || "Inspect Agent");
  const [dragActive, setDragActive] = useState(false);

  // Update condition default selection when changing active items
  React.useEffect(() => {
    if (item) {
      setNewInspectionCondition(item.condition);
    }
  }, [item?.id]);

  const [isInsideIframe, setIsInsideIframe] = useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.self !== window.top) {
      setIsInsideIframe(true);
    }
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setPhotoMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setInspectionPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoMimeType(file.type);
    const reader = new FileReader();
    reader.onloadend = () => {
      setInspectionPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const runAiComparison = async () => {
    if (!inspectionPhoto) return;
    setIsComparing(true);
    setComparisonNotes("");

    try {
      const originalPhotoUrl = item.photos?.[0] || "";
      const rawBase64 = inspectionPhoto.split(",")[1] || inspectionPhoto;

      const response = await fetch("/api/compare-condition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalPhotoUrl,
          inspectionPhotoBase64: rawBase64,
          mimeType: photoMimeType,
          artifactName: item.name,
          currentCondition: item.condition
        })
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data = await response.json();
      setComparisonNotes(data.notes || data.recommendations || "Analysis complete. Please review findings.");
    } catch (err: any) {
      console.error(err);
      setComparisonNotes("Failed to receive automated comparative analysis from Gemini Vision. Please review artifact details manually.");
    } finally {
      setIsComparing(false);
    }
  };

  const handleCommitInspection = async () => {
    // Let them edit it even if it failed or is empty, but we need notes
    if (!comparisonNotes.trim()) return;

    const newEntry = {
      id: `insp-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      inspector: inspectorName,
      notes: comparisonNotes,
      photoUrl: inspectionPhoto || "",
      condition: newInspectionCondition
    };

    const updatedHistory = [newEntry, ...(item.inspectionHistory || [])];
    const updatedPhotos = [...(item.photos || [])];
    if (inspectionPhoto) {
      updatedPhotos.push(inspectionPhoto);
    }

    try {
      await onUpdateItem(item.id, {
        inspectionHistory: updatedHistory,
        photos: updatedPhotos,
        lastInspectedDate: newEntry.date,
        condition: newInspectionCondition,
        conservationNotes: (item.conservationNotes ? item.conservationNotes + "\n\n" : "") + `[Inspection ${newEntry.date} by ${inspectorName}]: ${comparisonNotes}`
      });

      // Reset values
      setInspectionPhoto(null);
      setComparisonNotes("");
      setShowAiInspection(false);
    } catch (err) {
      console.error(err);
      alert("Error committing forensic inspection report.");
    }
  };

  const isReturnedToOrigin = item.currentLocation === item.originalLocation;

  // Overdue calculation (6 months trigger)
  const isOverdue = (dateStr: string) => {
    if (!dateStr) return true;
    try {
      const inspectDate = new Date(dateStr);
      const today = new Date("2026-06-19");
      const diffMs = today.getTime() - inspectDate.getTime();
      const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.43);
      return diffMonths >= 6;
    } catch {
      return false;
    }
  };

  const overdue = isOverdue(item.lastInspectedDate);

  const handleRelocateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalLocation = isCustomLocation ? customLocationText.trim() : newLocation.trim();
    if (!finalLocation) return;

    onMoveTransaction(item.id, {
      newLocation: finalLocation,
      newStatus,
      note: movementNote || "Standard field custody movement."
    });

    setShowMoveModal(false);
    setMovementNote("");
  };

  const getPublicStoryUrl = () => {
    if (item.qrCode && (item.qrCode.startsWith("http://") || item.qrCode.startsWith("https://"))) {
      return item.qrCode;
    }
    return `${window.location.origin}/?storyId=${item.id}`;
  };

  const getCurrentGuardian = (artifactObj: any) => {
    if (artifactObj.movementHistory && artifactObj.movementHistory.length > 0) {
      const latestLog = artifactObj.movementHistory[0];
      if (latestLog && latestLog.staffMember) {
        return latestLog.staffMember;
      }
    }
    return artifactObj.addedBy || "Chief Heritage Conservator";
  };

  const printCustodyCertificate = () => {
    const currentGuardian = getCurrentGuardian(item);
    const htmlContent = `
      <div style="font-family: 'Playfair Display', 'Times New Roman', Times, serif; background: #fdfbf7; color: #1c1a18; padding: 32px; box-sizing: border-box; min-height: 297mm; display: flex; flex-direction: column; justify-content: space-between; border: 4px double #b59e7a; position: relative; margin: 0 auto; max-width: 800px;">
        <div style="position: absolute; top: 12px; left: 12px; right: 12px; bottom: 12px; border: 1px solid #dcd6c8; pointer-events: none;"></div>
        
        <div>
          <div style="text-align: center; margin-bottom: 25px;">
            <div style="font-family: sans-serif; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: #8c7b6c; font-weight: bold; margin-bottom: 6px;">
              S E C L U D E   H O T E L S   H E R I T A G E   A R C H I V E S
            </div>
            <div style="font-size: 20px; font-weight: bold; letter-spacing: 0.1em; color: #140e0b; margin-bottom: 4px;">
              SECLUDE PALACE HOTEL, UDAIPUR
            </div>
            <div style="font-family: sans-serif; font-size: 9px; letter-spacing: 0.15em; color: #736357; text-transform: uppercase; margin-bottom: 15px;">
              REGISTRY AND CUSTODY LEDGER OF ROYAL ASSETS
            </div>
            <div style="border-bottom: 2px solid #dfb06c; width: 60%; margin: 0 auto 20px auto;"></div>
            
            <div style="font-size: 24px; font-style: italic; font-weight: bold; color: #3b5249; margin-bottom: 8px;">
              OFFICIAL CERTIFICATE OF ARCHIVAL CUSTODY
            </div>
            <div style="font-size: 11px; color: #8c7b6c; font-family: sans-serif; letter-spacing: 0.05em;">
              Certificate ID: <strong style="color: #140e0b;">${certificateId || 'CERT-PREVIEW-PENDING'}</strong> &bull; Generated Date: ${new Date().toLocaleString()}
            </div>
          </div>

          <div style="margin-bottom: 24px; padding: 18px; background: #fcfbf9; border: 1px solid #dfd6be; border-radius: 6px;">
            <div style="font-size: 13px; font-weight: bold; color: #3b5249; border-bottom: 1px solid #ece6da; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-family: sans-serif;">
              I. REGISTRY DOSSIER METADATA RECORD
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; line-height: 1.6;">
              <tr>
                <td style="padding: 4px 0; font-weight: bold; width: 35%; color: #5c544d;">Registry Artifact ID:</td>
                <td style="padding: 4px 0; color: #140e0b;">${item.id}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #5c544d;">Dossier Item Name:</td>
                <td style="padding: 4px 0; color: #140e0b; font-weight: bold;">${item.name}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #5c544d;">Registry Category Class:</td>
                <td style="padding: 4px 0; color: #140e0b;">${item.category}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #5c544d;">Material Composition:</td>
                <td style="padding: 4px 0; color: #140e0b;">${item.material}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #5c544d;">Physical Dimensions:</td>
                <td style="padding: 4px 0; color: #140e0b;">${item.dimensions}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #5c544d;">Registry Value Estimation:</td>
                <td style="padding: 4px 0; color: #140e0b; font-weight: bold;">INR ${Number(item.estimatedValue).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #5c544d;">Original Placement Origin:</td>
                <td style="padding: 4px 0; color: #140e0b;">${item.originalLocation}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #5c544d;">Active Custody Placement:</td>
                <td style="padding: 4px 0; color: #140e0b;">${item.currentLocation}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #5c544d;">Registered Preservation:</td>
                <td style="padding: 4px 0; color: #140e0b;">${item.condition} Quality (${item.status})</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 24px;">
            <div style="font-size: 13px; font-weight: bold; color: #3b5249; border-bottom: 1px solid #dfd6be; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-family: sans-serif;">
              II. CURRENT ASSIGNED GUARDIAN
            </div>
            <div style="padding: 12px 18px; background: #eef5f2; border: 1px solid #c2dfd3; border-radius: 6px; font-size: 13px; display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-weight: bold; color: #2c3d36; font-size: 15px;">${currentGuardian}</div>
                <div style="font-size: 10px; color: #516b5e; font-family: sans-serif; text-transform: uppercase; margin-top: 3px;">
                  Active Custody Guardian &amp; Registered Handler
                </div>
              </div>
              <div style="font-family: sans-serif; font-size: 10px; font-weight: bold; color: #1e7e51; background: #e1f4ec; border: 1px solid #8fd9b6; padding: 4px 10px; border-radius: 4px; text-transform: uppercase;">
                Duly Verified &amp; Signed
              </div>
            </div>
          </div>

          <div style="margin-bottom: 24px;">
            <div style="font-size: 13px; font-weight: bold; color: #3b5249; border-bottom: 1px solid #dfd6be; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-family: sans-serif;">
              III. COMPLETE CUSTODY MOVEMENT TRAIL &amp; AUDIT HISTORY
            </div>
            ${(!item.movementHistory || item.movementHistory.length === 0) ? `
              <div style="font-size: 11px; color: #8c7b6c; font-style: italic; padding: 12px; text-align: center;">
                No previous custody transfer events logged in the active database registry ledger.<br>
                Registry initialization placement acts as the original authorized custody parameter.
              </div>
            ` : `
              <div style="font-size: 11px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background: #ece6da; text-align: left; font-family: sans-serif; font-size: 10px; font-weight: bold; text-transform: uppercase; color: #5c544d;">
                      <th style="padding: 8px 12px; border-bottom: 1px solid #dfd6be;">Date / Time</th>
                      <th style="padding: 8px 12px; border-bottom: 1px solid #dfd6be;">Route</th>
                      <th style="padding: 8px 12px; border-bottom: 1px solid #dfd6be;">Custodian / Guardian</th>
                      <th style="padding: 8px 12px; border-bottom: 1px solid #dfd6be;">Clearance Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${item.movementHistory.map((h: any, idx: number) => `
                      <tr style="border-bottom: 1px solid #ece6da; background: ${idx === 0 ? '#fdfbf6' : 'transparent'};">
                        <td style="padding: 10px 12px; font-weight: bold; white-space: nowrap;">${h.date || h.timestamp || "N/A"}</td>
                        <td style="padding: 10px 12px;">
                          <span style="color: #8c7b6c; text-decoration: line-through;">${h.oldLocation || "Origin"}</span>
                          <span style="color: #3b5249; font-weight: bold; margin: 0 6px;">&rarr;</span>
                          <span style="color: #140e0b; font-weight: bold;">${h.newLocation || h.destination || "N/A"}</span>
                        </td>
                        <td style="padding: 10px 12px; font-weight: bold; color: #3b5249;">${h.staffMember || h.operator || h.staffName || "System Operator"}</td>
                        <td style="padding: 10px 12px; font-style: italic; color: #5c544d;">"${h.note || h.notes || "No custom remarks."}"</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

          <div style="margin-bottom: 30px;">
            <div style="font-size: 13px; font-weight: bold; color: #3b5249; border-bottom: 1px solid #dfd6be; padding-bottom: 6px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; font-family: sans-serif;">
              IV. LEDGER PROVENANCE INTEGRITY SIGNATURE
            </div>
            <div style="background: #f3f4f6; border: 1px solid #d1d5db; padding: 12px 16px; border-radius: 6px; font-family: monospace; font-size: 9px; color: #1f2937; word-break: break-all;">
              <strong>INTEGRITY HASH (SHA-256):</strong> ${certificateHash || 'PENDING_GENERATION'}<br>
              <span style="font-family: Georgia, serif; font-size: 9.5px; font-style: italic; color: #6b7280; display: block; margin-top: 5px;">
                The immutable hash represents a binary signature of the item data (dossier specifications, log parameters, and trace logs).
              </span>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; color: #4b5563;">
          <div style="width: 40%; border-top: 1px solid #736357; padding-top: 8px; text-align: center;">
            <div style="font-weight: bold; text-transform: uppercase; color: #140e0b;">${currentGuardian}</div>
            <div style="font-size: 8px; font-family: sans-serif; text-transform: uppercase; color: #8c7b6c; margin-top: 3px;">
              AUTHORIZED CUSTODIAN &amp; GUARDIAN
            </div>
            <div style="font-size: 7.5px; font-family: sans-serif; color: #9ca3af; margin-top: 2px;">
              SECLUDE ROYAL REGISTRY OFFICE
            </div>
          </div>
          <div style="width: 40%; border-top: 1px solid #736357; padding-top: 8px; text-align: center;">
            <div style="font-weight: bold; text-transform: uppercase; color: #140e0b;">${currentUser?.name || "Chief Registrar"}</div>
            <div style="font-size: 8px; font-family: sans-serif; text-transform: uppercase; color: #8c7b6c; margin-top: 3px;">
              PALACE ARCHIVIST SUPERVISOR
            </div>
            <div style="font-size: 7.5px; font-family: sans-serif; color: #9ca3af; margin-top: 2px;">
              HERITAGE TRUST BANNER CERTIFICATION
            </div>
          </div>
        </div>
      </div>
    `;
    printElementByCopying(htmlContent);
  };

  const generateCustodyCertificate = async () => {
    // 1. Calculate deterministic SHA-256 state hash of the artifact
    const dataToHash = {
      id: item.id || "",
      name: item.name || "",
      category: item.category || "",
      material: item.material || "",
      dimensions: item.dimensions || "",
      condition: item.condition || "",
      status: item.status || "",
      originalLocation: item.originalLocation || "",
      currentLocation: item.currentLocation || "",
      estimatedValue: Number(item.estimatedValue) || 0,
      movementHistory: item.movementHistory || [],
      inspectionHistory: item.inspectionHistory || []
    };

    let hashHex = "";
    try {
      const jsonStr = JSON.stringify(dataToHash, Object.keys(dataToHash).sort());
      const encoder = new TextEncoder();
      const bytes = encoder.encode(jsonStr);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", bytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (err) {
      console.error("Cryptographic signing failed:", err);
      hashHex = "VERIFICATION_ERROR_FALLBACK_HASH_SECURE_BYPASS";
    }

    const uniqueId = `CERT-SECLUDE-${item.id.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const timestampString = new Date().toLocaleString("en-US", { timeZoneName: "short" });

    // 2. Initialize jsPDF Document (A4 portrait size. Margins: 12mm)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // 3. Drawing Borders & Framings (Premium Gold-Bronze & Charcoal theme)
    doc.setDrawColor(140, 116, 92); // Gold-brown accent color
    doc.setLineWidth(1.0);
    doc.rect(12, 12, 186, 273, "S");
    
    doc.setLineWidth(0.4);
    doc.rect(14, 14, 182, 269, "S");

    // Tiny decorative inner corners
    doc.line(14, 25, 25, 14); // Top-left
    doc.line(196, 25, 185, 14); // Top-right
    doc.line(14, 272, 25, 283); // Bottom-left
    doc.line(196, 272, 185, 283); // Bottom-right

    // 4. Header Section
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(115, 99, 87);
    doc.text("S E C L U D E   H O T E L S   H E R I T A G E   A R C H I V E S", 105, 22, { align: "center" });

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(26, 25, 23);
    doc.text("SECLUDE PALACE HOTEL, UDAIPUR", 105, 29, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text("REGISTRY AND CUSTODY LEDGER OF ROYAL ASSETS", 105, 34, { align: "center" });

    doc.setDrawColor(223, 214, 190);
    doc.setLineWidth(0.5);
    doc.line(18, 38, 192, 38);

    doc.setFont("times", "bolditalic");
    doc.setFontSize(16);
    doc.setTextColor(59, 82, 73); // Dark emerald green
    doc.text("OFFICIAL CERTIFICATE OF ARCHIVAL CUSTODY", 105, 47, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(115, 99, 87);
    doc.text(`Certificate ID: ${uniqueId}`, 105, 53, { align: "center" });
    doc.text(`Generated Date: ${timestampString}`, 105, 58, { align: "center" });

    doc.line(18, 62, 192, 62);

    // 5. Artifact Details Parchment Tint Base
    doc.setFillColor(252, 251, 247); // Parchment cream background
    doc.rect(18, 67, 174, 96, "F");
    doc.setDrawColor(220, 214, 198);
    doc.setLineWidth(0.3);
    doc.rect(18, 67, 174, 96, "S");

    // Section Header in the Card
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(59, 82, 73);
    doc.text("I. REGISTRY DOSSIER METADATA RECORD", 22, 73);

    doc.setDrawColor(235, 232, 223);
    doc.line(22, 75, 188, 75);

    // Write Detail Fields inside card
    const fields = [
      { label: "Registry Artifact ID:", val: item.id || "N/A" },
      { label: "Dossier Item Name:", val: item.name || "N/A" },
      { label: "Registry Category Class:", val: item.category || "N/A" },
      { label: "Material Composition:", val: item.material || "N/A" },
      { label: "Physical Dimensions:", val: item.dimensions || "N/A" },
      { label: "Registry Value Estimation:", val: item.estimatedValue ? `INR ${Number(item.estimatedValue).toLocaleString()}` : "INR 0.00" },
      { label: "Original Placement Origin:", val: item.originalLocation || "N/A" },
      { label: "Active Custody Placement:", val: item.currentLocation || "N/A" },
      { label: "Registered Preservation:", val: `${item.condition || "N/A"} Quality (${item.status || "N/A"})` },
    ];

    doc.setFont("times", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(26, 25, 23);

    let yOffset = 81;
    fields.forEach((field, fIdx) => {
      doc.setFont("times", "bold");
      doc.text(field.label, 22, yOffset);

      doc.setFont("times", "normal");
      
      // Handle potential multiline names elegantly
      if (field.label === "Dossier Item Name:" && field.val.length > 55) {
        const textLines = doc.splitTextToSize(field.val, 110);
        doc.text(textLines, 68, yOffset);
        yOffset += (textLines.length - 1) * 4.5 + 6.5;
      } else {
        doc.text(field.val, 68, yOffset);
        yOffset += 6.5;
      }
    });

    // 6. Custody Movement History Block
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(59, 82, 73);
    doc.text("II. CUSTODY MOVEMENT TRAIL & AUDIT HISTORY", 22, 172);
    
    doc.setDrawColor(220, 214, 198);
    doc.line(18, 174, 192, 174);

    let historyY = 180;
    const historyLogs = item.movementHistory || [];

    if (historyLogs.length === 0) {
      doc.setFont("times", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(115, 99, 87);
      doc.text("No previous custody transfer events logged in the active database registry ledger.", 22, historyY);
      doc.text("Registry initialization placement acts as the original authorized custody parameter.", 22, historyY + 5);
    } else {
      // Get up to 4 latest audit/movement transactions
      const limitLogs = historyLogs.slice(0, 4);
      limitLogs.forEach((log: any, idx: number) => {
        doc.setFont("times", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(59, 82, 73);
        
        // Bullet design symbol
        doc.circle(23, historyY - 1, 0.8, "F");
        
        doc.text(`[Event #${idx + 1}] Destination: ${log.destination || log.location || log.newLocation || "N/A"}`, 27, historyY);
        
        doc.setFont("times", "normal");
        doc.setFontSize(9);
        doc.setTextColor(115, 99, 87);
        doc.text(`Date & Time: ${log.date || log.timestamp || "N/A"}${log.operator || log.staffName ? ` | Operator: ${log.operator || log.staffName}` : ""}`, 27, historyY + 4.5);
        
        doc.setFont("times", "italic");
        doc.text(`Note: "${log.notes || log.note || "No custom clearance remarks appended."}"`, 27, historyY + 8.5);
        
        historyY += 13.5;
      });
    }

    // 7. Security Hash Integrity Signature Block
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(59, 82, 73);
    doc.text("III. LEDGER PROVENANCE INTEGRITY SIGNATURE", 22, 237);
    
    doc.setDrawColor(220, 214, 198);
    doc.line(18, 239, 192, 239);

    doc.setFillColor(243, 244, 246); // Cool grey background box for cryptographic elements
    doc.rect(18, 242, 174, 13.5, "F");
    doc.setDrawColor(209, 213, 219);
    doc.rect(18, 242, 174, 13.5, "S");

    doc.setFont("courier", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(31, 41, 55); // Dark gray
    doc.text(`INTEGRITY HASH (SHA-256): ${hashHex}`, 21, 247.5);

    doc.setFont("times", "italic");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128); // Muted gray
    doc.text("The immutable hash represents a binary signature of the item data (dossier specifications, log parameters, and trace logs).", 21, 252);

    // 8. Signature Placeholders
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);

    doc.line(22, 270, 80, 270);
    doc.text("AUTHORIZED CUSTODIAN", 22, 274);
    doc.setFontSize(7.5);
    doc.text("SECLUDE ROYAL REGISTRY OFFICE", 22, 277.5);

    doc.line(130, 271, 188, 271);
    doc.text("PALACE ARCHIVIST SUPERVISOR", 130, 274);
    doc.setFontSize(7.5);
    doc.text("HERITAGE TRUST BANNER CERTIFICATION", 130, 277.5);

    // Save PDF
    doc.save(`Custody-Certificate-${item.id.toUpperCase()}-${item.name.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 20)}.pdf`);
  };

  const printElementByCopying = (htmlContent: string) => {
    try {
      // Create a temporary hidden iframe for printing to avoid messing up main DOM & styles
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) {
        throw new Error("Unable to access iframe document");
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Document</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@300;400;500;600;700&family=Lora:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap" rel="stylesheet">
            <style>
              body {
                margin: 0;
                padding: 0;
                background: white;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              @media print {
                body {
                  background: white;
                }
              }
            </style>
          </head>
          <body>
            ${htmlContent}
            <script>
              window.focus();
              // Small delay to ensure styles and web fonts are loaded before printing
              setTimeout(function() {
                try {
                  window.print();
                } catch (e) {
                  console.error("Iframe window.print() failed:", e);
                }
              }, 500);
            </script>
          </body>
        </html>
      `);
      doc.close();

      // Cleanup after print dialog is closed
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 6000);
    } catch (err) {
      console.error("Print fallback triggered due to iframe printing restriction:", err);
      // Fallback: original inline printing method
      const printDiv = document.createElement("div");
      printDiv.id = "temp-print-container";
      printDiv.innerHTML = htmlContent;
      document.body.appendChild(printDiv);

      const style = document.createElement("style");
      style.id = "temp-print-style";
      style.innerHTML = `
        @media print {
          #root, .no-print, [role="dialog"], .fixed {
            display: none !important;
          }
          #temp-print-container {
            display: block !important;
            background: white !important;
            color: black !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
          }
        }
        @media screen {
          #temp-print-container {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(style);

      try {
        window.print();
      } catch (e) {
        console.error("Standard window.print() failed as well:", e);
        alert("Your browser blocked direct printing from within this iframe. Please open the application in a new tab or download the certificate as a PDF instead.");
      }

      setTimeout(() => {
        if (document.body.contains(printDiv)) {
          document.body.removeChild(printDiv);
        }
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      }, 1000);
    }
  };

  const printExhibitionPlate = () => {
    const storyUrl = getPublicStoryUrl();
    const qrValue = encodeURIComponent(storyUrl);
    const htmlContent = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 90vh; text-align: center; box-sizing: border-box; background: white; color: #140e0b; font-family: 'Lora', Georgia, serif; padding: 20px;">
        <div style="border: 3px double #dfb06c; padding: 40px; max-width: 440px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); background: white;">
          <div style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #8c7b6c; font-weight: bold; margin-bottom: 5px; font-family: sans-serif;">
            Heritage Exhibit Story
          </div>
          <div style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #140e0b; font-weight: bold; margin-bottom: 25px; font-family: sans-serif;">
            Seclude Palace Hotel Udaipur
          </div>
          
          <div style="font-size: 22px; font-weight: bold; color: #140e0b; margin-bottom: 12px; line-height: 1.3; font-family: Georgia, serif;">
            ${item.name}
          </div>
          
          <div style="font-family: monospace; font-size: 11px; color: #736357; margin-bottom: 25px; border-top: 1px dashed #ece6da; border-bottom: 1px dashed #ece6da; padding: 8px 0;">
            Age: ${item.estimatedAge} &bull; Category: ${item.category}
          </div>

          <div style="background: #ffffff; padding: 15px; border: 1px solid #dfd6be; display: inline-block; border-radius: 8px; margin-bottom: 15px;">
            <img style="width: 180px; height: 180px; display: block;" src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrValue}" />
          </div>
          
          <div style="font-size: 11px; color: #736357; font-style: italic; margin-top: 15px; font-family: Georgia, serif;">
            Scan QR to view the official royal story, background, and cultural significance card.
          </div>
        </div>
      </div>
    `;
    printElementByCopying(htmlContent);
  };

  const generateExhibitionPlatePdf = async () => {
    if (!item) return;
    try {
      const storyUrl = getPublicStoryUrl();
      const qrDataUrl = await QRCode.toDataURL(storyUrl, { margin: 1, width: 256 });
      
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5"
      });

      // Draw premium gold-brown border
      doc.setDrawColor(223, 176, 108); // #dfb06c
      doc.setLineWidth(1.0);
      doc.rect(8, 8, 132, 194, "S");
      
      doc.setDrawColor(28, 26, 24);
      doc.setLineWidth(0.3);
      doc.rect(10, 10, 128, 190, "S");

      // Title header
      doc.setFont("times", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(140, 123, 108);
      doc.text("H E R I T A G E   E X H I B I T   S T O R Y", 74, 22, { align: "center" });

      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 14, 11);
      doc.text("SECLUDE PALACE HOTEL, UDAIPUR", 74, 28, { align: "center" });

      doc.setDrawColor(236, 230, 218);
      doc.line(20, 33, 128, 33);

      // Artifact name
      doc.setFont("times", "bold");
      doc.setFontSize(15);
      doc.setTextColor(20, 14, 11);
      const textLines = doc.splitTextToSize(item.name || "Unnamed Artifact", 100);
      doc.text(textLines, 74, 45, { align: "center" });

      // Calculate vertical offset after name text
      const nameHeight = textLines.length * 6;
      const metadataY = 45 + nameHeight + 2;

      // Metadata line
      doc.setFont("times", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(115, 99, 87);
      doc.text(`Age: ${item.estimatedAge || "N/A"}   |   Category: ${item.category || "N/A"}`, 74, metadataY, { align: "center" });

      doc.setDrawColor(236, 230, 218);
      doc.line(30, metadataY + 5, 118, metadataY + 5);

      // QR Code box
      const qrBoxY = metadataY + 12;
      doc.setDrawColor(223, 214, 190);
      doc.rect(49, qrBoxY, 50, 50, "S");
      
      // Draw QR image
      doc.addImage(qrDataUrl, 'PNG', 50, qrBoxY + 1, 48, 48);

      // Bottom footer text
      const footerY = qrBoxY + 62;
      doc.setFont("times", "italic");
      doc.setFontSize(9);
      doc.setTextColor(115, 99, 87);
      const footerLines = doc.splitTextToSize("Scan QR to view the official royal story, background, and cultural significance card.", 100);
      doc.text(footerLines, 74, footerY, { align: "center" });

      // Save PDF
      doc.save(`EXHIBIT-PLATE-${item.id.toUpperCase()}.pdf`);
    } catch (err) {
      console.error("Failed to generate Exhibition Plate PDF:", err);
    }
  };

  const generateAssetTagPdf = async () => {
    if (!item) return;
    try {
      const qrValue = item.qrCode || item.id;
      const qrDataUrl = await QRCode.toDataURL(qrValue, { margin: 1, width: 150 });

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [100, 60]
      });

      // Border style
      doc.setDrawColor(59, 82, 73); // #3b5249
      doc.setLineWidth(0.6);
      doc.rect(4, 4, 92, 52, "S");

      // Left Column: Text Registry information
      doc.setFont("courier", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(140, 123, 108);
      doc.text("SECLUDE REGISTRY TAG", 8, 11);

      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(28, 26, 24);
      const nameLines = doc.splitTextToSize(item.name || "Unnamed", 46);
      doc.text(nameLines, 8, 17);

      // Metadata information
      const metaY = 32;
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.setTextColor(92, 84, 77);
      doc.text(`ID: ${item.id}`, 8, metaY);
      doc.text(`ORIG: ${item.originalLocation || "Palace"}`, 8, metaY + 5);

      // Lease Compliant Pill Box
      doc.setDrawColor(196, 190, 175);
      doc.setFillColor(250, 249, 246);
      doc.rect(8, metaY + 11, 32, 6, "FD");

      doc.setFont("courier", "bold");
      doc.setFontSize(7);
      doc.setTextColor(83, 76, 70);
      doc.text("LEASE COMPLIANT", 11, metaY + 15);

      // Right Column: QR Code
      doc.setDrawColor(223, 214, 190);
      doc.rect(60, 10, 32, 32, "S");
      doc.addImage(qrDataUrl, 'PNG', 61, 11, 30, 30);

      // QR label
      doc.setFont("courier", "bold");
      doc.setFontSize(7);
      doc.setTextColor(59, 82, 73);
      doc.text(item.id, 76, 47, { align: "center" });

      doc.save(`REGISTRY-TAG-${item.id.toUpperCase()}.pdf`);
    } catch (err) {
      console.error("Failed to generate Asset Tag PDF:", err);
    }
  };

  const printAssetTag = () => {
    const qrValue = encodeURIComponent(item.qrCode);
    const htmlContent = `
      <div style="display: flex; align-items: center; justify-content: space-between; border: 2px dashed #3b5249; border-radius: 8px; padding: 16px; margin: 40px auto; max-width: 380px; background: white; color: black; font-family: sans-serif; box-sizing: border-box; gap: 16px;">
        <div style="flex: 1; text-align: left;">
          <span style="display: block; font-size: 8px; font-family: monospace; letter-spacing: 0.15em; color: #8c7b6c; font-weight: bold; text-transform: uppercase;">
            SECLUDE REGISTRY TAG
          </span>
          <span style="display: block; font-size: 15px; font-family: Georgia, serif; font-weight: bold; color: #1c1a18; margin-top: 4px; line-height: 1.2;">
            ${item.name}
          </span>
          <p style="margin: 6px 0 0 0; padding: 0; font-size: 10px; font-family: monospace; color: #5c544d; line-height: 1.4;">
            ID: <span style="font-weight: bold; color: #3b5249;">${item.id}</span> <br />
            Orig: ${item.originalLocation}
          </p>
          <span style="display: inline-block; margin-top: 6px; background: #faf9f6; border: 1px solid #c4beaf; font-size: 8px; font-family: monospace; font-weight: bold; padding: 2px 6px; color: #534c46; border-radius: 3px; text-transform: uppercase;">
            LEASE COMPLIANT
          </span>
        </div>
        <div style="text-align: center; flex-shrink: 0; background: white; padding: 4px; border: 1px solid #dfd6be; border-radius: 4px; display: flex; flex-direction: column; align-items: center; gap: 2px;">
          <img style="width: 76px; height: 76px; display: block;" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrValue}" />
          <span style="display: block; font-size: 7px; font-family: monospace; color: #3b5249; font-weight: bold; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${item.id}
          </span>
        </div>
      </div>
    `;
    printElementByCopying(htmlContent);
  };

  // Render timeline view if toggled
  if (showTimeline) {
    return (
      <div className="space-y-6">
        <ConservationTimelineView
          item={item}
          onBack={() => setShowTimeline(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">

      {/* 1. Quick Navigation Action Panel */}
      <div className="no-print flex items-center justify-between border-b border-[#dfd6be] pb-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#5c544d] hover:text-[#1c1a18] cursor-pointer"
        >
          <X className="w-4 h-4 text-[#3b5249]" /> Close Dossier
        </button>

        <div className="flex gap-2">
          {/* Full Provenance Timeline Button */}
          <button
            onClick={() => setShowTimeline(true)}
            className="p-1 px-3 bg-[#1c1a18] hover:bg-[#3b5249] border border-[#1c1a18] text-white transition-all rounded text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <GitBranch className="w-3.5 h-3.5" /> Full Timeline
          </button>

          {/* Move/Relocate Custody Button */}
          {canMove && (
            <button
              onClick={() => setShowMoveModal(true)}
              className="p-1 px-3 bg-[#eae2d0] hover:bg-[#dfd6be] border border-[#beb39e] text-[#1a1917] hover:border-[#3b5249] transition-all rounded text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer Custody

            </button>
          )}

          {/* Edit Button */}
          {canEdit && (
            <button
              onClick={() => onEdit(item.id)}
              className="p-1 px-3 bg-white hover:bg-[#eae5d9] border border-[#c4beaf] hover:border-[#3b5249] text-[#1a1917] transition-all rounded text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#3b5249]" /> Revise Dossier
            </button>
          )}

          {/* Delete Button */}
          {canDelete && (
            <button
              onClick={() => onDeleteTrigger(item.id)}
              className="p-1 px-2.5 bg-red-50 hover:bg-red-100 hover:border-red-500 border border-red-200 text-red-700 transition-all rounded text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" /> Withdraw Record
            </button>
          )}
        </div>
      </div>
      {/* Main Print Wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Gallery & Printable QR Panel (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#fdfcf7] border border-[#dcd6c8] p-4 rounded-lg shadow-sm space-y-4">
            {/* Primary Main Active Photo */}
            <div className="relative aspect-[4/3] w-full bg-[#eae5d9] overflow-hidden rounded border border-[#dfd6be]">
              <img
                src={item.photos?.[activePhotoIndex] || "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600"}
                alt={item.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 left-2 bg-[#1c1a18]/80 text-[#fdfcf7] font-mono text-[9px] px-2 py-0.5 rounded shadow">
                Photo {activePhotoIndex + 1} of {item.photos?.length || 1}
              </div>
            </div>

            {/* Thumbnail selector row */}
            {item.photos?.length > 1 && (
              <div className="flex gap-2 min-w-full overflow-x-auto pb-1">
                {item.photos.map((ph, idx) => (
                  <button
                    key={ph + idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative w-16 h-12 rounded overflow-hidden border transition-all ${
                      activePhotoIndex === idx ? "border-[#3b5249] ring-1 ring-[#3b5249]" : "border-[#dfd6be]"
                    }`}
                  >
                    <img src={ph} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}

            {/* Aesthetic Printable Tag with built-in QR Code */}
            <div className="p-3.5 bg-[#fcfbf7] border-2 border-dashed border-[#c4beaf] rounded flex items-center justify-between gap-4 relative overflow-hidden">
              <div className="space-y-1 z-10">
                <span className="block text-[8px] font-mono tracking-widest text-[#8e847a] uppercase font-bold">
                  SECLUDE REGISTRY TAG
                </span>
                <span className="block text-[14px] font-serif font-bold text-[#1a1917] tracking-tight leading-none mt-0.5">
                  {item.name}
                </span>
                <p className="text-[10px] font-mono text-[#5c544d] pt-1 leading-snug">
                  ID: <span className="font-bold text-[#3b5249]">{item.id}</span> <br />
                  Orig: {item.originalLocation}
                </p>
                <span className="inline-block mt-1 bg-white border border-[#dfd6be] text-[8px] font-mono px-1 font-bold text-gray-500 uppercase rounded">
                  LEASE COMPLIANT
                </span>
              </div>

              {/* Generates a nice visual block representing the permanent QR asset code */}
              <div className="flex flex-col items-center gap-1 shrink-0 z-10 bg-white p-1.5 border border-[#dfd6be] rounded">
                <div className="w-20 h-20 bg-white flex items-center justify-center p-0.5 relative">
                  <QRGenerator value={item.qrCode} className="w-full h-full text-[#1c1a18]" />
                </div>
                <span className="text-[8px] font-mono tracking-tighter uppercase font-bold text-[#3b5249]">
                  {item.qrCode}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={generateAssetTagPdf}
                className="no-print py-2 bg-[#8c745c] hover:bg-[#735d48] text-white rounded transition-all text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-amber-200" /> Download Tag PDF
              </button>
              <button
                onClick={printAssetTag}
                className="no-print py-2 bg-white hover:bg-[#fcfcf9] border border-[#beb5a1] hover:border-[#3b5249] rounded transition-all text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#3b5249]" /> Print via Browser
              </button>
            </div>

            <button
              onClick={() => setShowGuestQrModal(true)}
              className="no-print w-full py-2 bg-[#3b5249] hover:bg-[#2c3d36] text-white border border-transparent rounded transition-all text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            >
              <QrCode className="w-4 h-4 text-emerald-300" /> View & Print Guest Story QR
            </button>

            <button
              onClick={() => setShowCustodyCertificateModal(true)}
              className="no-print w-full py-2 bg-[#8c745c] hover:bg-[#725e4c] text-white border border-transparent rounded transition-all text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer mt-1 shadow-sm h-9"
              id="btn-custody-certificate"
            >
              <Award className="w-4 h-4 text-[#efdfca]" /> Custody Certificate & Trail
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Ledger Dossier Metadata Details & History Logs (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#fdfcf7] border border-[#dcd6c8] p-6 rounded-lg shadow-sm space-y-6">
            
            {/* 1. Header description */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#3b5249] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-bold">
                  {item.category}
                </span>
                
                <div className="flex gap-1.5 items-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-tight bg-gray-100 text-[#1c1a18] border border-[#d3cdc0]`}>
                    {item.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-tight bg-[#f7f4ed] text-[#8c745c] border border-[#ebdcc3]`}>
                    {item.condition} Quality
                  </span>
                </div>
              </div>

              <h3 className="font-serif text-xl font-bold tracking-tight text-[#1c1a18] leading-tight flex flex-wrap items-center gap-2">
                <span>{item.name}</span>
                {item.pendingSync && (
                  <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-mono px-2 py-0.5 rounded shadow-sm animate-pulse shrink-0">
                    ⚡ Changes Queued (Offline)
                  </span>
                )}
              </h3>

              <p className="text-xs text-[#5c544d] font-sans leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* 2. Metadata Field Matrix Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-y border-dashed border-[#dcd6c8] py-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-serif text-[#1c1a18]">
                  <Bookmark className="w-4 h-4 text-[#3b5249]" />
                  <span>
                    <span className="text-[#8e847a] font-sans text-[11px] uppercase tracking-wider block">Estimated Age / Style</span>
                    <strong>{item.estimatedAge}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-serif text-[#1c1a18]">
                  <FileText className="w-4 h-4 text-[#3b5249]" />
                  <span>
                    <span className="text-[#8e847a] font-sans text-[11px] uppercase tracking-wider block">Materials</span>
                    <strong>{item.material}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-serif text-[#1c1a18]">
                  <Compass className="w-4 h-4 text-[#3b5249]" />
                  <span>
                    <span className="text-[#8e847a] font-sans text-[11px] uppercase tracking-wider block">Dimensions</span>
                    <strong>{item.dimensions || "Not calculated yet"}</strong>
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-serif text-[#1c1a18]">
                  <Coins className="w-4 h-4 text-amber-700" />
                  <span>
                    <span className="text-[#8e847a] font-sans text-[11px] uppercase tracking-wider block">Replacement Value</span>
                    <strong className="text-amber-900">₹ {Number(item.estimatedValue).toLocaleString()}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-serif text-[#1c1a18]">
                  <Building className="w-4 h-4 text-[#3b5249]" />
                  <span>
                    <span className="text-[#8e847a] font-sans text-[11px] uppercase tracking-wider block">Mandatory Lease Return (Palace Origin)</span>
                    <strong className="text-red-700">{item.originalLocation}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-serif text-[#1c1a18]">
                  <MapPin className="w-4 h-4 text-[#3b5249]" />
                  <span>
                    <span className="text-[#8e847a] font-sans text-[11px] uppercase tracking-wider block">Current Setup Hall / Room</span>
                    <strong className={isReturnedToOrigin ? "text-emerald-700" : "text-amber-700"}>
                      {item.currentLocation} {isReturnedToOrigin ? " (✓ Matched)" : " (↳ Relocated)"}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Conservation Status Display & Handling guidelines */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#5c544d] uppercase block">
                  🛡️ CONSERVATION REMINDER DOSSIER
                </span>
                
                {overdue && (
                  <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                    ⚠️ CONSERVATION DELAY OVER 6-MONTHS
                  </span>
                )}
              </div>

              <div className="p-3.5 bg-[#fcfbf9] border border-[#dfd6be] rounded space-y-3/2">
                <div className="flex justify-between text-xs text-[#1c1a18] font-sans font-medium mb-1">
                  <span>Last Physical Forensic Inspection Date:</span>
                  <span className="font-mono text-[#3b5249] bg-[#eae5d9] px-1.5 rounded">{item.lastInspectedDate || "N/A"}</span>
                </div>
                <div className="text-[11px] text-[#5c544d] leading-relaxed">
                  <strong className="text-gray-700">Forensic Handling Rules:</strong> <br />
                  {item.handlingNotes || "Apply standard archival ledgers protocols. No specialized rules declared."}
                </div>
              </div>
            </div>

            {/* Inline Forensic Photo & Condition Analysis Tool */}
            <div className="border border-[#dfd6be] bg-[#faf8f4] p-4 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#5c544d] uppercase block">
                  🔍 FORENSIC PHOTO COMPARATIVE ANALYSIS
                </span>
                {!isOwnerView && (
                  <button
                    type="button"
                    onClick={() => setShowAiInspection(!showAiInspection)}
                    className={`text-xs px-2.5 py-1 font-mono font-bold rounded cursor-pointer transition-all active:scale-95 ${
                      showAiInspection 
                        ? "bg-red-50 text-red-700 border border-red-200" 
                        : "bg-[#3b5249] text-white hover:bg-[#2c3d36]"
                    }`}
                  >
                    {showAiInspection ? "✕ Cancel" : "＋ Log Inspection Photo"}
                  </button>
                )}
              </div>

              {showAiInspection && (
                <div className="space-y-4 pt-2 border-t border-dashed border-[#ece6da]">
                  {/* File Upload Selector & Drag & Drop Zone */}
                  {!inspectionPhoto ? (
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
                        dragActive 
                          ? "border-[#3b5249] bg-emerald-50/50" 
                          : "border-[#beb5a1] hover:border-[#3b5249]"
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        id="inspection-file-upload"
                      />
                      <label htmlFor="inspection-file-upload" className="cursor-pointer block space-y-2">
                        <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100/50 flex items-center justify-center">
                          <Compass className="w-5 h-5 text-[#3b5249] animate-pulse" />
                        </div>
                        <p className="text-xs font-serif font-bold text-gray-800">
                          Drag and drop inspection photo here
                        </p>
                        <p className="text-[10px] text-[#8e847a] font-mono uppercase">
                          or click to browse local files
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Comparison Side-by-Side View */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="block text-[9px] font-mono uppercase tracking-wider text-[#8e847a]">
                            Original Onboarding Photo
                          </span>
                          <div className="aspect-video bg-white border border-[#dfd6be] rounded overflow-hidden relative">
                            <img
                              src={item.photos?.[0] || "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600"}
                              alt="Onboarding original"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-1.5 left-1.5 bg-[#1c1a18]/75 text-white text-[8px] font-mono px-1.5 rounded uppercase">
                              Baseline Reference
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="block text-[9px] font-mono uppercase tracking-wider text-[#8e847a]">
                              New Physical Photo
                            </span>
                            <button
                              onClick={() => setInspectionPhoto(null)}
                              className="text-[9px] font-mono text-red-650 hover:underline cursor-pointer"
                            >
                              Reset Photo
                            </button>
                          </div>
                          <div className="aspect-video bg-white border border-[#dfd6be] rounded overflow-hidden relative">
                            <img
                              src={inspectionPhoto}
                              alt="Uploaded inspection site"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-1.5 left-1.5 bg-emerald-700/80 text-white text-[8px] font-mono px-1.5 rounded uppercase">
                              Active Upload
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Run Gemini Analysis Prompt Trigger */}
                      {!comparisonNotes && !isComparing && (
                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={runAiComparison}
                            className="w-full py-2 px-4 bg-[#3b5249] text-white font-mono text-xs font-bold rounded hover:bg-[#2c3d36] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                          >
                            <Compass className="w-4 h-4 text-emerald-300" /> Compare Photos with Gemini Vision
                          </button>
                        </div>
                      )}

                      {/* Live loading state */}
                      {isComparing && (
                        <div className="p-6 bg-white border border-dashed border-emerald-200 rounded text-center space-y-2 animate-pulse">
                          <div className="mx-auto w-6 h-6 rounded-full border-2 border-t-transparent border-[#3b5249] animate-spin" />
                          <p className="text-xs font-serif font-bold text-gray-800">
                            Analyzing surface differences...
                          </p>
                          <p className="text-[10px] text-[#5c544d] font-mono leading-relaxed max-w-xs mx-auto">
                            Gemini is evaluating fiber alignments, physical micro-fissures, chemical rust markings, and structural cracks.
                          </p>
                        </div>
                      )}

                      {/* Comparison findings edit area */}
                      {comparisonNotes && (
                        <div className="space-y-3 animate-in fade-in duration-200">
                          <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded space-y-1">
                            <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                              ✨ Gemini Vision Diagnosis Report
                            </h5>
                            <p className="text-[11px] text-[#5c544d] leading-relaxed italic">
                              "The generative vision model compared your upload side-by-side with original onboarding files."
                            </p>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d]">
                              Forensic Condition & Change Notes
                            </label>
                            <textarea
                              value={comparisonNotes}
                              onChange={(e) => setComparisonNotes(e.target.value)}
                              rows={4}
                              className="w-full p-2 text-xs bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans"
                              placeholder="Review and edit the comparative report here..."
                            />
                            <p className="text-[9px] text-[#8e847a] italic">
                              You have full authority to modify, refine, or rewrite the analysis findings before filing.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-dashed border-[#ece6da]">
                            <div>
                              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                                Designate Overall Condition
                              </label>
                              <select
                                value={newInspectionCondition}
                                onChange={(e) => setNewInspectionCondition(e.target.value as any)}
                                className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249]"
                              >
                                <option value="Mint">Mint (Pristine preservation)</option>
                                <option value="Good">Good (Authentic minimal age marker)</option>
                                <option value="Fair">Fair (Noticeable surface deterioration)</option>
                                <option value="Poor">Poor (Prominent wear - requires repair)</option>
                                <option value="Damaged">Damaged (Compromised - quarantine required)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                                Lead Forensic Auditor
                              </label>
                              <input
                                type="text"
                                value={inspectorName}
                                onChange={(e) => setInspectorName(e.target.value)}
                                className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249]"
                                required
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 text-xs font-mono">
                            <button
                              type="button"
                              onClick={() => {
                                setInspectionPhoto(null);
                                setComparisonNotes("");
                              }}
                              className="flex-1 py-2 border border-[#c4beaf] hover:bg-gray-50 rounded font-bold uppercase cursor-pointer"
                            >
                              Discard Image
                            </button>
                            <button
                              type="button"
                              onClick={handleCommitInspection}
                              className="flex-1 py-2 bg-[#3b5249] text-white hover:bg-[#2c3d36] rounded font-bold uppercase cursor-pointer text-center"
                            >
                              Commit to Ledger
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Forensic Inspection Event Logs */}
            {item.inspectionHistory && item.inspectionHistory.length > 0 && (
              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#5c544d] uppercase block">
                  🔍 DETAILED FORENSIC INSPECTION HISTORY
                </span>
                <div className="space-y-3">
                  {item.inspectionHistory.map((history) => (
                    <div key={history.id} className="p-3 bg-white border border-[#dfd6be] rounded space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#8e847a] border-b border-[#ece6da] pb-1.5">
                        <span className="font-bold text-[#3b5249]">Date: {history.date}</span>
                        <span>Auditor: {history.inspector}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        {history.photoUrl && (
                          <div className="sm:col-span-1 rounded overflow-hidden aspect-video bg-[#eae5d9] border border-[#dfd6be]">
                            <img 
                              src={history.photoUrl} 
                              alt="Inspection site detail" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                          </div>
                        )}
                        <div className={history.photoUrl ? "sm:col-span-3 space-y-1.5" : "sm:col-span-4 space-y-1.5"}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 uppercase rounded bg-orange-50 border border-orange-200 text-orange-900 leading-none">
                              Condition: {history.condition}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5c544d] italic leading-relaxed bg-[#faf8f4] p-1.5 rounded border border-[#ece6da]">
                            "{history.notes}"
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Immutable Chain-of-Custody Transaction History Log Grid (Auditors Trail) */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#5c544d] uppercase block">
                ⛓️ IMMUTABLE CHAIN-OF-CUSTODY AUDIT TRAIL LOGS
              </span>

              <div className="border border-[#e2dbce] rounded divide-y divide-[#ece6da] overflow-hidden max-h-48 overflow-y-auto bg-white">
                <div className="p-2 px-3 bg-[#f7f5f0] text-[9px] font-mono tracking-widest font-bold uppercase text-[#6e645a] flex justify-between">
                  <span>HISTORICAL PATH RECORDS</span>
                  <span>{item.movementHistory?.length || 0} TRANSACTION EVENTS</span>
                </div>

                {(!item.movementHistory || item.movementHistory.length === 0) ? (
                  <div className="p-4 text-center text-xs text-gray-400 italic">
                    Original placement is untouched. No relocation events registered.
                  </div>
                ) : (
                  item.movementHistory.map((h: MovementLog, idx: number) => (
                    <div key={h.id || idx} className="p-3 text-xs flex gap-2">
                      <div className="flex flex-col items-center shrink-0">
                        <GitCommit className="w-4 h-4 text-[#3b5249] mt-0.5" />
                        <div className="w-0.5 flex-1 bg-[#eae5d9]"></div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-mono text-[#3b5249] bg-emerald-50 px-1 py-0.2 rounded">
                            {new Date(h.date).toLocaleDateString()} at {new Date(h.date).toLocaleTimeString()}
                          </span>
                          <span className="font-mono text-gray-500 italic">By {h.staffMember}</span>
                        </div>
                        <p className="text-[#1c1a18] font-sans">
                          Transfered from{" "}
                          <strong className="text-[#8e847a] line-through">{h.oldLocation}</strong> to{" "}
                          <strong className="text-emerald-800">{h.newLocation}</strong>
                        </p>
                        {h.note && (
                          <div className="text-[11px] text-[#5c544d] bg-[#fdfcf7] border border-[#ece6da] p-1.5 rounded italic">
                            Log note: "{h.note}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Curator Audit Stamp */}
            <div className="pt-2 flex justify-between border-t border-[#ece6da] font-mono text-[9px] text-[#8e847a]">
              <span>INITIAL ACQUISITION: {item.addedBy || "Vetted Agent"} ({new Date(item.addedDate).toLocaleDateString()})</span>
              <span>LAST AUDITED: {item.lastUpdatedBy || "N/A"} ({new Date(item.lastUpdatedDate).toLocaleDateString()})</span>
            </div>

          </div>
        </div>
      </div>

      {/* Spatially Assigned explicit move custody modal */}
      {showMoveModal && (
        <div className="z-50 fixed inset-0 bg-[#1c1a18]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#fdfcf7] border-2 border-[#c4beaf] rounded-lg shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-150">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#3b5249]" />

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-serif text-base font-bold text-[#1c1a18] flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-[#3b5249]" /> Execute Custody Transfer
                </h4>
                <button
                  onClick={() => setShowMoveModal(false)}
                  className="font-mono font-bold hover:text-red-650 cursor-pointer text-[#8e847a]"
                >
                  ✕ Close
                </button>
              </div>

              <div className="h-px bg-[#ece6da] mb-4"></div>

              <form onSubmit={handleRelocateSubmit} className="space-y-4">
                {/* Active Info Banner */}
                <div className="p-3 bg-amber-50 rounded border border-amber-100 text-xs text-[#5c544d] leading-relaxed">
                  Moving: <strong className="text-[#1c1a18]">{item.name}</strong> <br />
                  Current Custody Site: <strong className="text-amber-800">{item.currentLocation}</strong>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                      New Current Location (Preset Registry)
                    </label>
                    <select
                      value={isCustomLocation ? "__CUSTOM__" : newLocation}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__CUSTOM__") {
                          setIsCustomLocation(true);
                        } else {
                          setIsCustomLocation(false);
                          setNewLocation(val);
                        }
                      }}
                      className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans"
                    >
                      {currentLocationsList.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                      <option value="__CUSTOM__">✍️ Custom / Enter New Location...</option>
                    </select>
                  </div>

                  {isCustomLocation && (
                    <div className="animate-in fade-in duration-100">
                      <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 mb-1">
                        Enter Custom Location Name
                      </label>
                      <input
                        type="text"
                        required
                        value={customLocationText}
                        onChange={(e) => setCustomLocationText(e.target.value)}
                        placeholder="e.g. Royal Corridor Section D"
                        className="w-full text-xs p-2.5 bg-white border border-emerald-400 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                    Disposition / Status Assign
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249]"
                  >
                    <option value="On Display">On Display</option>
                    <option value="In Storage">In Storage</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Reserved">Reserved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                    Transfer / Handover Custody Log Note
                  </label>
                  <textarea
                    required
                    value={movementNote}
                    onChange={(e) => setMovementNote(e.target.value)}
                    placeholder="e.g. Relocated under principal curator instructions to showcase near check-in desk."
                    rows={3}
                    className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans"
                  />
                </div>

                <div className="pt-2 flex gap-3 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setShowMoveModal(false)}
                    className="flex-1 py-2.5 border border-[#c4beaf] hover:bg-gray-100 text-[#5c544d] rounded font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#3b5249] text-white hover:bg-[#2c3d36] rounded font-bold uppercase"
                  >
                    Pledge Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* 4. Guest QR Exposition Label Printing Modal */}
      {showGuestQrModal && (
        <div className="no-print fixed inset-0 bg-[#1c1a18]/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#fdecda] border-2 border-[#dfb06c] text-[#140e0b] w-full max-w-md p-6 rounded-xl shadow-2xl relative space-y-5">
            
            {/* Close Button */}
            <button
              onClick={() => setShowGuestQrModal(false)}
              className="absolute top-4 right-4 text-[#8c7b6c] hover:text-[#1c1a18] p-1.5 hover:bg-[#eae0d0] rounded-full transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase font-mono font-bold tracking-[0.2em] text-[#8c7b6c] block">
                ✦ ROYAL EXHIBIT CARD ✦
              </span>
              <h3 className="font-serif text-lg font-bold text-[#140e0b] tracking-tight">
                Guest Story Placard QR
              </h3>
              <p className="text-[11px] text-[#736357] font-sans max-w-xs mx-auto leading-relaxed">
                Provide scan access to this artifact's poetic history narrative. Perfect for hotel guests, room plaques, or hallway stands.
              </p>
            </div>

            {/* Simulated Plaque Preview */}
            <div className="p-5 bg-white border border-[#dfd6be] rounded-lg text-center space-y-3 shadow-inner">
              <span className="text-[9px] uppercase font-serif tracking-widest text-gray-400 block font-bold">
                SECLUDE PALACE HOTEL UDAIPUR
              </span>
              <h4 className="font-serif text-md font-bold tracking-tight text-gray-800 leading-tight">
                {item.name}
              </h4>
              <div className="w-44 h-44 mx-auto bg-white border border-gray-100 p-2.5 rounded-lg shadow-sm flex items-center justify-center relative">
                <QRGenerator value={getPublicStoryUrl()} className="w-full h-full text-black" />
              </div>
              <span className="inline-block bg-[#fcfbf9] border border-[#e5dfd3] rounded px-2.5 py-1 text-[8.5px] font-mono text-[#5c544d] max-w-full truncate">
                {getPublicStoryUrl()}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={generateExhibitionPlatePdf}
                className="w-full py-2.5 bg-[#8c745c] hover:bg-[#735d48] text-white font-mono text-xs font-bold uppercase rounded-lg shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <FileText className="w-4 h-4 text-amber-200" /> Download PDF Placard (A5)
              </button>

              <button
                onClick={printExhibitionPlate}
                className="w-full py-2 bg-white hover:bg-gray-50 border border-[#3b5249] text-[#3b5249] font-mono text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Printer className="w-4 h-4" /> Print via Browser
              </button>
              
              <div className="flex gap-2">
                <a
                  href={getPublicStoryUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 text-center border border-[#beb39e] hover:bg-[#eae1d0] font-mono text-[10px] font-bold uppercase rounded text-gray-700 transition"
                >
                  Inspect Live Page ↗
                </a>
                <button
                  type="button"
                  onClick={() => setShowGuestQrModal(false)}
                  className="flex-1 py-2 border border-transparent hover:bg-[#e4d8c5] font-mono text-[10px] font-bold uppercase rounded text-gray-600 transition cursor-pointer"
                >
                  Dismiss Preview
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5. Certificate of Custody Printable View Modal */}
      {showCustodyCertificateModal && (
        <div className="no-print fixed inset-0 bg-[#1c1a18]/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#fcfaf4] border border-[#dfb06c] text-[#140e0b] w-full max-w-4xl p-6 md:p-8 rounded-xl shadow-2xl relative space-y-6">
            
            {/* Close Button */}
            <button
              onClick={() => setShowCustodyCertificateModal(false)}
              className="absolute top-4 right-4 text-[#8c7b6c] hover:text-[#1c1a18] p-1.5 hover:bg-[#eae0d0] rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#dfd6be] pb-4 gap-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#3b5249]">
                  Certificate of Archival Custody
                </h3>
                <p className="text-xs text-[#736357]">
                  Verify, print, or download the official registered chain of custody ledger for this royal asset.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={printCustodyCertificate}
                  className="px-3.5 py-1.5 bg-[#3b5249] hover:bg-[#2c3d36] text-white font-mono text-xs font-bold uppercase rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-300" /> Print Certificate
                </button>
                <button
                  onClick={generateCustodyCertificate}
                  className="px-3.5 py-1.5 bg-[#8c745c] hover:bg-[#725e4c] text-white font-mono text-xs font-bold uppercase rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-[#efdfca]" /> Download PDF
                </button>
                <button
                  onClick={() => setShowCustodyCertificateModal(false)}
                  className="px-3.5 py-1.5 border border-[#beb39e] hover:bg-[#eae1d0] text-[#5c544d] font-mono text-xs font-bold uppercase rounded-lg transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Live Certificate Document Preview Wrapper */}
            <div className="border border-[#e6dfcc] rounded-lg p-2 bg-[#eae3d0] max-h-[60vh] overflow-y-auto shadow-inner">
              
              {/* THE CERTIFICATE CONTAINER (Styled as Physical Parchment) */}
              <div className="bg-[#fdfbf7] p-8 md:p-12 border-4 border-double border-[#b59e7a] relative text-[#1c1a18] font-serif shadow-md max-w-3xl mx-auto space-y-8 select-none">
                
                {/* Decorative Inner Corner Frame */}
                <div className="absolute inset-2 border border-[#dcd6c8] pointer-events-none"></div>

                {/* Crest, Hotel Name, & Registry Header */}
                <div className="text-center space-y-2 relative">
                  <div className="flex justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-[#b59e7a] flex items-center justify-center bg-[#fdfbf7]">
                      <Award className="w-7 h-7 text-[#3b5249]" />
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-sans font-bold tracking-[0.25em] text-[#8c7b6c] block">
                    S E C L U D E   H O T E L S   H E R I T A G E   A R C H I V E S
                  </span>
                  <h1 className="font-serif text-xl md:text-2xl font-bold text-[#140e0b] tracking-wide uppercase">
                    Seclude Palace Hotel, Udaipur
                  </h1>
                  <span className="text-[10px] font-sans text-[#736357] uppercase tracking-[0.15em] block font-semibold">
                    Registry and Custody Ledger of Royal Assets
                  </span>
                  <div className="border-b border-[#dfb06c] w-3/4 mx-auto pt-2"></div>
                </div>

                {/* Certificate Main Title */}
                <div className="text-center space-y-1">
                  <h2 className="font-serif text-2xl md:text-3xl font-bold italic text-[#3b5249] tracking-tight">
                    Official Certificate of Archival Custody
                  </h2>
                  <p className="text-xs text-[#8c7b6c] font-sans">
                    Certificate ID: <span className="font-mono font-bold text-[#140e0b]">{certificateId}</span> &bull; Issued: {new Date().toLocaleString()}
                  </p>
                </div>

                {/* SECTION I: DOSSIER METADATA RECORD */}
                <div className="p-5 bg-[#fcfbf9] border border-[#dfd6be] rounded-lg space-y-3">
                  <h4 className="text-xs font-sans font-bold text-[#3b5249] tracking-wider uppercase border-b border-[#ece6da] pb-1">
                    I. REGISTRY DOSSIER METADATA RECORD
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs md:text-sm">
                    <div className="flex justify-between border-b border-[#f3eee0] pb-1">
                      <span className="font-sans font-medium text-[#736357]">Registry ID:</span>
                      <span className="font-mono text-[#140e0b] font-bold">{item.id}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#f3eee0] pb-1">
                      <span className="font-sans font-medium text-[#736357]">Class Category:</span>
                      <span className="text-[#140e0b] font-bold">{item.category}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#f3eee0] pb-1 md:col-span-2">
                      <span className="font-sans font-medium text-[#736357] shrink-0">Item Name:</span>
                      <span className="text-[#140e0b] font-bold text-right pl-4">{item.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#f3eee0] pb-1">
                      <span className="font-sans font-medium text-[#736357]">Material:</span>
                      <span className="text-[#140e0b]">{item.material}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#f3eee0] pb-1">
                      <span className="font-sans font-medium text-[#736357]">Dimensions:</span>
                      <span className="text-[#140e0b]">{item.dimensions}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#f3eee0] pb-1">
                      <span className="font-sans font-medium text-[#736357]">Estimated Value:</span>
                      <span className="text-[#140e0b] font-bold">INR {Number(item.estimatedValue).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#f3eee0] pb-1">
                      <span className="font-sans font-medium text-[#736357]">Original Location:</span>
                      <span className="text-[#140e0b]">{item.originalLocation}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#f3eee0] pb-1">
                      <span className="font-sans font-medium text-[#736357]">Current Location:</span>
                      <span className="text-[#3b5249] font-bold">{item.currentLocation}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#f3eee0] pb-1">
                      <span className="font-sans font-medium text-[#736357]">Condition Status:</span>
                      <span className="text-[#140e0b]">{item.condition} Quality ({item.status})</span>
                    </div>
                  </div>
                </div>

                {/* SECTION II: ACTIVE ASSIGNED GUARDIAN */}
                <div className="space-y-2">
                  <h4 className="text-xs font-sans font-bold text-[#3b5249] tracking-wider uppercase border-b border-[#dfd6be] pb-1">
                    II. CURRENT ASSIGNED GUARDIAN
                  </h4>
                  <div className="p-4 bg-[#eef5f2] border border-[#c2dfd3] rounded-lg flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-serif text-sm md:text-base font-bold text-[#2c3d36]">
                        {getCurrentGuardian(item)}
                      </div>
                      <p className="text-[10px] font-sans uppercase tracking-wider text-[#516b5e]">
                        Active Custody Guardian &amp; Registered Handler
                      </p>
                    </div>
                    <div className="px-2.5 py-1 bg-[#e1f4ec] border border-[#8fd9b6] rounded text-[9px] font-sans font-bold tracking-wider text-[#1e7e51] uppercase shrink-0">
                      🛡️ Duly Verified
                    </div>
                  </div>
                </div>

                {/* SECTION III: CUSTODY TRAIL & AUDIT HISTORY */}
                <div className="space-y-2">
                  <h4 className="text-xs font-sans font-bold text-[#3b5249] tracking-wider uppercase border-b border-[#dfd6be] pb-1">
                    III. COMPLETE CUSTODY MOVEMENT TRAIL &amp; AUDIT HISTORY
                  </h4>
                  {(!item.movementHistory || item.movementHistory.length === 0) ? (
                    <div className="text-xs text-[#8c7b6c] italic text-center py-4 bg-[#fcfbf9] border border-[#ece6da] rounded">
                      No previous custody transfer events logged in the active database registry ledger.<br />
                      Registry initialization placement acts as the original authorized custody parameter.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#ece6da] font-sans text-[10px] font-bold text-[#5c544d] uppercase border-b border-[#dfd6be]">
                            <th className="p-2 md:p-3">Date / Time</th>
                            <th className="p-2 md:p-3">Route Path</th>
                            <th className="p-2 md:p-3">Custodian</th>
                            <th className="p-2 md:p-3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ece6da]">
                          {item.movementHistory.map((h: MovementLog, idx: number) => (
                            <tr key={h.id || idx} className={`hover:bg-[#fbf9f4] ${idx === 0 ? 'bg-[#fdfbf6] font-medium' : ''}`}>
                              <td className="p-2 md:p-3 font-bold white-space-nowrap">{h.date}</td>
                              <td className="p-2 md:p-3">
                                <span className="text-[#8c7b6c] line-through">{h.oldLocation || "Origin"}</span>
                                <span className="text-[#3b5249] font-bold mx-1.5">&rarr;</span>
                                <span className="text-[#140e0b] font-bold">{h.newLocation}</span>
                              </td>
                              <td className="p-2 md:p-3 text-[#3b5249] font-semibold">{h.staffMember || "Palace Archivist"}</td>
                              <td className="p-2 md:p-3 italic text-gray-500 font-sans">"{h.note}"</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* SECTION IV: PROVENANCE INTEGRITY SIGNATURE */}
                <div className="space-y-2">
                  <h4 className="text-xs font-sans font-bold text-[#3b5249] tracking-wider uppercase border-b border-[#dfd6be] pb-1">
                    IV. LEDGER PROVENANCE INTEGRITY SIGNATURE
                  </h4>
                  <div className="bg-gray-50 border border-gray-250 p-3 rounded-lg space-y-1.5">
                    <p className="font-mono text-[9px] text-gray-800 break-all select-all leading-tight">
                      <strong className="font-sans text-[9px] tracking-wider uppercase font-bold text-gray-500 mr-1.5">INTEGRITY HASH (SHA-256):</strong>
                      {certificateHash || "GENERATING_CRYPTO_SIGNATURE_LEDGER_HASH..."}
                    </p>
                    <p className="text-[10px] text-gray-450 italic leading-snug">
                      The immutable hash represents a binary signature of the item data (dossier specifications, log parameters, and trace logs).
                    </p>
                  </div>
                </div>

                {/* SECTION V: SIGNATURES */}
                <div className="flex justify-between pt-6 text-xs text-[#5c544d]">
                  <div className="w-[45%] text-center border-t border-[#736357] pt-2 space-y-0.5">
                    <p className="font-serif font-bold text-[#140e0b] uppercase tracking-wide text-[10px] truncate max-w-full">
                      {getCurrentGuardian(item)}
                    </p>
                    <p className="text-[8px] font-sans uppercase tracking-wider text-[#8c7b6c]">
                      AUTHORIZED CUSTODIAN &amp; GUARDIAN
                    </p>
                    <p className="text-[7.5px] font-sans text-[#a39485]">
                      SECLUDE ROYAL REGISTRY OFFICE
                    </p>
                  </div>
                  <div className="w-[45%] text-center border-t border-[#736357] pt-2 space-y-0.5">
                    <p className="font-serif font-bold text-[#140e0b] uppercase tracking-wide text-[10px] truncate max-w-full">
                      {currentUser?.name || "Chief Registrar"}
                    </p>
                    <p className="text-[8px] font-sans uppercase tracking-wider text-[#8c7b6c]">
                      PALACE ARCHIVIST SUPERVISOR
                    </p>
                    <p className="text-[7.5px] font-sans text-[#a39485]">
                      HERITAGE TRUST BANNER CERTIFICATION
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Print Friendly Tips */}
            <p className="text-[11px] text-center text-[#8c7b6c] italic">
              * Note: Clicking "Print Certificate" will launch your browser's native printer panel, optimized for high-fidelity A4 layout printing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
