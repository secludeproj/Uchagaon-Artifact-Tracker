import React, { useState, useRef } from "react";
import { Artifact, MovementLog } from "../types";
import { REAL_ROOMS, ROOMS_BY_BLOCK, blockForLocation } from "../lib/locations";
import { buildCategoryList } from "../lib/categories";
import PhotoCropModal from "./PhotoCropModal";
import { deletePhotoFromStorage } from "../lib/photoStorage";
import { 
  Camera, 
  Sparkles, 
  FileText, 
  MapPin, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle,
  AlertTriangle,
  Upload,
  RefreshCw,
  Crop
} from "lucide-react";

interface AddEditFormViewProps {
  editItemId?: string;
  artifacts: Artifact[];
  currentUser: { name: string; email: string; role: string };
  onSave: (artifact: any) => void;
  onCancel: () => void;
  onGoToBulkImport?: () => void;
}

export default function AddEditFormView({
  editItemId,
  artifacts,
  currentUser,
  onSave,
  onCancel,
  onGoToBulkImport
}: AddEditFormViewProps) {
  const isEditMode = !!editItemId;
  const existingItem = isEditMode ? artifacts.find((a) => a.id === editItemId) : null;

  // Step state: 1 (Photo Capture/AI), 2 (Manual Fields), 3 (Location assignment)
  const [step, setStep] = useState(1);

  // Form Fields State
  const [photos, setPhotos] = useState<string[]>(existingItem?.photos || []);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const [name, setName] = useState(existingItem?.name || "");
  const [category, setCategory] = useState<Artifact["category"]>(existingItem?.category || "Other");
  const [description, setDescription] = useState(existingItem?.description || "");
  const [estimatedAge, setEstimatedAge] = useState(existingItem?.estimatedAge || "");
  const [material, setMaterial] = useState(existingItem?.material || "");
  const [dimensions, setDimensions] = useState(existingItem?.dimensions || "");
  const [subCategory, setSubCategory] = useState(existingItem?.subCategory || "");
  const [quantity, setQuantity] = useState(existingItem?.quantity ?? 1);
  const [driveLink, setDriveLink] = useState(existingItem?.driveLink || "");
  const [condition, setCondition] = useState<Artifact["condition"]>(existingItem?.condition || "Good");
  const [estimatedValue, setEstimatedValue] = useState(existingItem?.estimatedValue || 1000);
  const [valueNeedsReview, setValueNeedsReview] = useState(false);
  const [originalLocation, setOriginalLocation] = useState(existingItem?.originalLocation || "Room 1");
  const [currentLocation, setCurrentLocation] = useState(existingItem?.currentLocation || "Room 1");
  const [status, setStatus] = useState<Artifact["status"]>(existingItem?.status || "In Storage");
  const [handlingNotes, setHandlingNotes] = useState(existingItem?.handlingNotes || "");
  const [conservationNotes, setConservationNotes] = useState(existingItem?.conservationNotes || "");
  const [story, setStory] = useState(existingItem?.story || "");
  const [lastInspectedDate, setLastInspectedDate] = useState(existingItem?.lastInspectedDate || new Date().toISOString().split("T")[0]);

  // Dynamic location list generation
  const originalLocationsList = React.useMemo(() => {
    const locs = new Set<string>();
    artifacts.forEach(a => {
      if (a.originalLocation) locs.add(a.originalLocation);
    });
    REAL_ROOMS.forEach(r => locs.add(r));
    return Array.from(locs);
  }, [artifacts]);

  const currentLocationsList = React.useMemo(() => {
    const locs = new Set<string>();
    artifacts.forEach(a => {
      if (a.currentLocation) locs.add(a.currentLocation);
    });
    REAL_ROOMS.forEach(r => locs.add(r));
    return Array.from(locs);
  }, [artifacts]);

  // Track if custom option is triggered
  const [isCustomOriginal, setIsCustomOriginal] = useState(false);
  const [isCustomCurrent, setIsCustomCurrent] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [customOriginalVal, setCustomOriginalVal] = useState("");
  const [customCurrentVal, setCustomCurrentVal] = useState("");
  const [customCategoryVal, setCustomCategoryVal] = useState("");

  // Initialize custom states when editing existing item
  React.useEffect(() => {
    if (existingItem) {
      if (existingItem.originalLocation && !originalLocationsList.includes(existingItem.originalLocation)) {
        setIsCustomOriginal(true);
        setCustomOriginalVal(existingItem.originalLocation);
      }
      if (existingItem.currentLocation && !currentLocationsList.includes(existingItem.currentLocation)) {
        setIsCustomCurrent(true);
        setCustomCurrentVal(existingItem.currentLocation);
      }
    }
  }, [existingItem, originalLocationsList, currentLocationsList]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complianceAgree, setComplianceAgree] = useState(false);

  // Selector handlers
  // Groups a flat location list into [blockName, rooms[]] pairs, in physical
  // property order (Block A, then B, then C), with anything not matching a
  // known real room (e.g. a custom-typed location) grouped last.
  const groupLocationsByBlock = (locs: string[]): [string, string[]][] => {
    const groups: Record<string, string[]> = {};
    locs.forEach((loc) => {
      const block = blockForLocation(loc);
      if (!groups[block]) groups[block] = [];
      groups[block].push(loc);
    });
    const blockOrder = Object.keys(ROOMS_BY_BLOCK);
    const orderedKeys = [
      ...blockOrder.filter((b) => groups[b]),
      ...Object.keys(groups).filter((b) => !blockOrder.includes(b)),
    ];
    return orderedKeys.map((block) => [block, groups[block]]);
  };

  const handleOriginalSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__CUSTOM__") {
      setIsCustomOriginal(true);
      setOriginalLocation(customOriginalVal || "");
    } else {
      setIsCustomOriginal(false);
      setOriginalLocation(val);
    }
  };

  const handleCustomOriginalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomOriginalVal(val);
    setOriginalLocation(val);
  };

  const handleCurrentSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__CUSTOM__") {
      setIsCustomCurrent(true);
      setCurrentLocation(customCurrentVal || "");
    } else {
      setIsCustomCurrent(false);
      setCurrentLocation(val);
    }
  };

  const handleCustomCurrentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomCurrentVal(val);
    setCurrentLocation(val);
  };

  const categoriesList = React.useMemo(() => {
    return buildCategoryList(artifacts.map((a) => a.category));
  }, [artifacts]);

  const handleCategorySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__CUSTOM__") {
      setIsCustomCategory(true);
      setCategory((customCategoryVal || "") as any);
    } else {
      setIsCustomCategory(false);
      setCategory(val as any);
    }
  };

  const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomCategoryVal(val);
    setCategory(val as any);
  };

  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuccessLog, setAiSuccessLog] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startLiveCamera = async (deviceId?: string) => {
    setCameraError("");
    const constraints: MediaStreamConstraints = {
      video: deviceId 
        ? { deviceId: { exact: deviceId } } 
        : { facingMode: "environment" }
    };
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      
      // Enumerate cameras
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === "videoinput");
      setCameraDevices(videoDevices);
      if (videoDevices.length > 0 && !activeCameraId) {
        const backCam = videoDevices.find(d => 
          d.label.toLowerCase().includes("back") || 
          d.label.toLowerCase().includes("rear") || 
          d.label.toLowerCase().includes("environment")
        );
        setActiveCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
      }
    } catch (err: any) {
      console.error("Camera capture failed to initialize", err);
      setCameraError(err.message || "Failed to access camera device. Please grant camera permission.");
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setPhotos((prev) => [...prev, dataUrl]);
        stopLiveCamera();
        
        // Sound beep
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.05);
        } catch {}
      }
    } catch (err) {
      console.error("Failed to capture image frame", err);
      setCameraError("Failed to freeze and capture image frame.");
    }
  };

  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  React.useEffect(() => {
    if (step !== 1) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsCameraActive(false);
    }
  }, [step]);

  // Convert uploaded image file(s) to Base64 to supply to backend/Gemini
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const readers = Array.from(files).map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else reject(new Error("Failed to read file"));
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers)
      .then((dataUrls) => {
        setPhotos((prev) => [...prev, ...dataUrls]);
      })
      .catch((err) => {
        console.error("Failed to read one or more photo files:", err);
      });

    // Reset so selecting the same file(s) again still triggers onChange
    e.target.value = "";
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Gemini AI Analysis execution
  const handleAnalyzeWithAI = async () => {
    if (photos.length === 0) {
      setAiError("Please upload a photo or trigger your physical camera first.");
      return;
    }

    setIsAiLoading(true);
    setAiError("");
    setAiSuccessLog("");

    try {
      const activeImg = photos[0];
      
      // Extract clean raw base64 and standard mimetype mapping
      let base64Payload = "";
      let mimeType = "image/jpeg";

      if (activeImg.startsWith("data:")) {
        const parts = activeImg.split(",");
        base64Payload = parts[1];
        const mimeMatch = parts[0].match(/:(.*?);/);
        if (mimeMatch) mimeType = mimeMatch[1];
      } else {
        // Remote URL (e.g. an existing photo link on the artifact) — fetch it
        // so the backend always receives actual image bytes, never an empty payload.
        const imgResponse = await fetch(activeImg);
        if (!imgResponse.ok) {
          throw new Error("Could not load the selected reference photo for analysis.");
        }
        const blob = await imgResponse.blob();
        mimeType = blob.type || "image/jpeg";
        base64Payload = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => {
            const result = fr.result as string;
            resolve(result.split(",")[1] || "");
          };
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
      }

      if (!base64Payload) {
        throw new Error("No image data available to analyze. Please upload a photo and try again.");
      }

      const response = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Payload,
          mimeType,
          photoUrl: activeImg
        })
      });

      let data: any;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.error || `Intake analysis service failed to process photo (HTTP ${response.status}).`
        );
      }

      // Surface any error the backend reported, instead of silently no-oping
      if (data.error) {
        throw new Error(data.error);
      }
      if (!data.name && !data.category && !data.description) {
        throw new Error("Gemini AI could not confidently identify this artifact. Try a clearer photo, or fill in details manually.");
      }

      // Successfully returned Gemini curated attributes
      setName(data.name || name);
      setCategory(data.category || category);
      setEstimatedAge(data.estimatedAge || estimatedAge);
      setMaterial(data.material || material);
      setDescription(data.description || description);
      setHandlingNotes(data.handlingNotes || handlingNotes);
      if (data.condition) setCondition(data.condition);
      if (data.estimatedValue) {
        const parsedValue = Number(data.estimatedValue);
        if (!isNaN(parsedValue) && parsedValue > 0) {
          setEstimatedValue(parsedValue);
          setValueNeedsReview(true);
        }
      }

      setAiSuccessLog("Meticulous Gemini AI scanning parsed! Review below attributes in Step 2.");
      // Move to Step 2 Automatically so they can immediately review fields
      setTimeout(() => {
        setStep(2);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "An error occurred while connecting with Gemini model servers.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFormSubmission = async () => {
    if (!name.trim() || isSubmitting) return;

    // Auto-agree compliance if not already checked
    if (!complianceAgree) {
      setComplianceAgree(true);
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name,
        category,
        description,
        estimatedAge,
        material,
        dimensions,
        subCategory: subCategory || undefined,
        quantity,
        driveLink: driveLink || undefined,
        condition,
        estimatedValue: Number(estimatedValue) || 0,
        originalLocation,
        currentLocation,
        status,
        photos,
        handlingNotes,
        conservationNotes,
        story,
        lastInspectedDate,
        lastUpdatedBy: currentUser?.name || "",
        lastUpdatedByEmail: currentUser?.email || "",
      };

      await onSave(payload);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded shadow-lg overflow-hidden max-w-3xl mx-auto">
      {/* Visual Ledger top Header */}
      <div className="bg-[#3b5249] text-white p-4 px-6 flex justify-between items-center border-b border-[#2d3e37]">
        <div>
          <h3 className="font-serif text-base font-bold">
            {isEditMode ? `Revise Asset Dossier: ${existingItem?.id}` : "Acquire New Palace Heritage Artifact"}
          </h3>
          <p className="text-[10px] font-mono text-[#a8baa2] uppercase tracking-wider mt-0.5">
            Step {step} of 3: {step === 1 ? "Optical Visual Scan" : step === 2 ? "Dossier Metadata Detail" : "Spatial Custody Placement"}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs font-mono font-bold bg-[#eae2d0] text-[#1c1a18] px-3 py-1 bg-opacity-90 hover:bg-opacity-100 rounded cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {/* Progressive Step Tracker Indicators */}
      <div className="bg-[#f7f5f0] border-b border-[#ece6da] p-3 flex justify-evenly font-mono text-[10px] text-[#6e645a]">
        <button 
          onClick={() => step > 1 && setStep(1)} 
          className={`flex items-center gap-1 font-bold ${step === 1 ? "text-[#3b5249]" : "text-gray-400"}`}
        >
          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
            step === 1 ? "bg-[#3b5249] text-white" : "bg-gray-200"
          }`}>1</span>
          Optical Scan
        </button>
        <div className="border-t border-dashed border-gray-300 w-12 self-center"></div>
        <button 
          onClick={() => step > 2 && setStep(2)} 
          className={`flex items-center gap-1 font-bold ${step === 2 ? "text-[#3b5249]" : "text-gray-400"}`}
        >
          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
            step === 2 ? "bg-[#3b5249] text-white" : "bg-gray-200"
          }`}>2</span>
          Metadata Details
        </button>
        <div className="border-t border-dashed border-gray-300 w-12 self-center"></div>
        <button 
          onClick={() => step > 3 && setStep(3)} 
          className={`flex items-center gap-1 font-bold ${step === 3 ? "text-[#3b5249]" : "text-gray-400"}`}
        >
          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
            step === 3 ? "bg-[#3b5249] text-white" : "bg-gray-200"
          }`}>3</span>
          Spatial Allocation
        </button>
      </div>

      {!isEditMode && step === 1 && onGoToBulkImport && (
        <div className="mx-6 mt-4 p-3 bg-[#eae5d9]/60 border border-[#dcd6c8] rounded flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-[#5c544d] font-sans">
            <span className="font-bold text-[#3b5249]">Adding many items at once?</span> Paste a CSV/spreadsheet instead of filling this form one item at a time.
          </p>
          <button
            type="button"
            onClick={onGoToBulkImport}
            className="text-[10px] font-mono font-bold uppercase text-[#3b5249] border border-[#3b5249] hover:bg-[#3b5249] hover:text-white rounded px-3 py-1.5 shrink-0 cursor-pointer transition-all"
          >
            Use Bulk Import Instead
          </button>
        </div>
      )}

      <div className="p-6">
        {/* ======================= STEP 1: Vision Photo Scan ======================= */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h4 className="font-serif font-bold text-sm text-[#111110]">
                Capture Image or Utilize Stock Scan Templates
              </h4>
              <p className="text-xs text-[#6e645a] max-w-md mx-auto leading-relaxed">
                Provide a photo of the antique piece to trigger the **Gemini AI Heritage Assessor**. It will parse details, estimate age, and construct conservation notes automatically for your review.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Photo Input Selector */}
              <div className="space-y-3">
                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d]">
                  Active Media Capture
                </span>

                {isCameraActive ? (
                  <div className="relative rounded-lg overflow-hidden aspect-video bg-black border border-gray-300 flex items-center justify-center">
                    <video 
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    {/* Viewfinder overlays */}
                    <div className="absolute inset-4 border border-white/20 rounded-md pointer-events-none flex items-center justify-center">
                      <div className="w-6 h-6 border-t-2 border-l-2 border-emerald-400 absolute top-0 left-0"></div>
                      <div className="w-6 h-6 border-t-2 border-r-2 border-emerald-400 absolute top-0 right-0"></div>
                      <div className="w-6 h-6 border-b-2 border-l-2 border-emerald-400 absolute bottom-0 left-0"></div>
                      <div className="w-6 h-6 border-b-2 border-r-2 border-emerald-400 absolute bottom-0 right-0"></div>
                      <span className="text-[9px] font-mono text-emerald-300 tracking-widest bg-black/50 px-1.5 py-0.5 rounded animate-pulse">
                        LIVE VIEWFINDER ACTIVE
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center bg-black/75 p-1.5 rounded-md gap-2">
                      {cameraDevices.length > 1 ? (
                        <select
                          value={activeCameraId}
                          onChange={(e) => {
                            setActiveCameraId(e.target.value);
                            startLiveCamera(e.target.value);
                          }}
                          className="text-[9px] font-mono bg-neutral-900 text-white border border-neutral-700 rounded px-1.5 py-0.5 max-w-[90px] focus:outline-none"
                        >
                          {cameraDevices.map((dev, idx) => (
                            <option key={dev.deviceId} value={dev.deviceId}>
                              {dev.label || `Camera ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[8px] font-mono text-neutral-400">Environment Cam</span>
                      )}
                      
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[9px] font-bold uppercase px-3 py-1.5 rounded active:scale-95 transition-all cursor-pointer"
                      >
                        <Camera className="w-3 h-3" /> Capture Photo
                      </button>

                      <button
                        type="button"
                        onClick={stopLiveCamera}
                        className="text-[9px] bg-red-800 hover:bg-red-900 text-white font-mono uppercase px-2 py-1 rounded transition-all cursor-pointer"
                      >
                        Off
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={handleTriggerFileInput}
                    className="border-2 border-dashed border-[#c4beaf] hover:border-[#3b5249] rounded-lg p-6 bg-[#fcfbf9] text-center cursor-pointer transition-all aspect-video flex flex-col justify-center items-center group relative overflow-hidden"
                  >
                    {photos.length > 0 ? (
                      <>
                        <img 
                          src={photos[0]} 
                          alt="Current capture" 
                          className="absolute inset-0 w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-[#1c1a18]/65 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-center items-center text-white p-2">
                          <Camera className="w-8 h-8 mb-1 animate-pulse" />
                          <span className="text-xs font-mono font-bold uppercase">Add More Photos</span>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2 text-[#6e645a]">
                        <Upload className="w-8 h-8 mx-auto text-[#beb5a1] group-hover:text-[#3b5249] transition-all" />
                        <span className="block text-xs font-bold font-sans">Browse / Tap Mobile Camera</span>
                        <span className="block text-[10px] font-mono text-gray-400">Fits front, profile, or damage closeups</span>
                      </div>
                    )}
                  </div>
                )}

                {photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap items-center">
                    {photos.map((p, idx) => (
                      <div key={idx} className="relative group/thumb">
                        <img
                          src={p}
                          alt={`Photo ${idx + 1}`}
                          onClick={() => {
                            // Move this photo to the front — it becomes the
                            // "main" photo used for the AI scan and as the
                            // primary thumbnail shown elsewhere in the app.
                            setPhotos((prev) => {
                              const next = [...prev];
                              const [selected] = next.splice(idx, 1);
                              next.unshift(selected);
                              return next;
                            });
                          }}
                          className={`w-14 h-14 object-cover rounded border-2 cursor-pointer transition-all ${
                            idx === 0 ? "border-[#3b5249]" : "border-[#e8e4db] hover:border-[#c4beaf]"
                          }`}
                          referrerPolicy="no-referrer"
                        />
                        {idx === 0 && (
                          <span className="absolute -top-1.5 -left-1.5 bg-[#3b5249] text-white text-[8px] font-mono font-bold px-1 rounded">
                            MAIN
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCroppingIndex(idx);
                          }}
                          className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-[#3b5249] hover:bg-[#2c3d36] text-white rounded-full flex items-center justify-center transition-all"
                          title="Crop / zoom photo"
                        >
                          <Crop className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const removedUrl = photos[idx];
                            setPhotos((prev) => prev.filter((_, i) => i !== idx));
                            deletePhotoFromStorage(removedUrl).catch((err) => console.warn("Failed to delete photo from storage:", err));
                          }}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-[10px] leading-none transition-all"
                          title="Remove photo"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <div
                      onClick={handleTriggerFileInput}
                      className="w-14 h-14 border-2 border-dashed border-[#c4beaf] hover:border-[#3b5249] rounded flex items-center justify-center cursor-pointer text-[#8e847a] hover:text-[#3b5249] transition-all"
                      title="Add more photos"
                    >
                      <span className="text-xl leading-none">+</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleTriggerFileInput}
                    className="flex-1 py-1.5 px-3 bg-white hover:bg-gray-50 border border-[#c4beaf] hover:border-[#3b5249] rounded text-[10px] font-mono font-bold uppercase tracking-wider text-[#3c3730] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-gray-500" /> Upload File(s)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isCameraActive) {
                        stopLiveCamera();
                      } else {
                        startLiveCamera(activeCameraId);
                      }
                    }}
                    className={`flex-1 py-1.5 px-3 border rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isCameraActive 
                        ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" 
                        : "bg-[#3b5249] text-white border-[#2c3d35] hover:bg-[#2c3d35]"
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" /> 
                    {isCameraActive ? "Stop Camera" : "Live Camera"}
                  </button>
                </div>

                {cameraError && (
                  <div className="p-2 bg-red-50 border border-red-100 text-red-600 rounded text-[10px] flex gap-1 items-center font-mono mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* AI Action Console */}
            <div className="border border-[#e2dbce] p-4 rounded bg-white space-y-3">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-[#1c1a18] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#3b5249] animate-spin" />
                    Intake Heritage Intelligence Assessor
                  </h5>
                  <p className="text-[10px] text-gray-500">Powered by Gemini 3.1 Pro vision model.</p>
                </div>

                <button
                  type="button"
                  disabled={isAiLoading || photos.length === 0}
                  onClick={handleAnalyzeWithAI}
                  className={`p-2.5 px-4 font-mono text-xs font-bold uppercase tracking-wide rounded flex items-center gap-1.5 transition-all shadow-sm ${
                    photos.length === 0
                      ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                      : "bg-[#3b5249] hover:bg-[#2c3d35] text-white cursor-pointer active:scale-95"
                  }`}
                >
                  {isAiLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" /> Scrutinizing Artifact...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" /> Identify with AI
                    </>
                  )}
                </button>
              </div>

              {/* Feedback messages */}
              {aiError && (
                <div className="p-2.5 bg-red-50 border border-red-150 text-red-700 rounded text-xs flex gap-1.5 items-center">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {aiSuccessLog && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded text-xs flex gap-1.5 items-center font-semibold">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{aiSuccessLog}</span>
                </div>
              )}
            </div>

            {/* Footer action buttons */}
            <div className="flex justify-end pt-4 border-t border-[#ece6da]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="p-2 px-5 bg-white hover:bg-gray-100 border border-[#c4beaf] rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                Skip to Manual Fields <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================= STEP 2: Custom details dossier review ======================= */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <legend className="font-serif text-sm font-bold text-[#1a1a17]">
                Review Antique Artifact Metadata Files
              </legend>
              <p className="text-[10px] font-mono text-[#8e847a]">
                Ensure the AI parsed estimates or manual edits are completely verified.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  Historical Artifact Name / Title
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Damascus Curved Sabre Sabre with Turquoise inlay"
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans"
                />
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  Heritage Class Category
                </label>
                <select
                  value={isCustomCategory ? "__CUSTOM__" : category}
                  onChange={handleCategorySelectChange}
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__CUSTOM__">✍️ Custom / Add New Category...</option>
                </select>
                {isCustomCategory && (
                  <input
                    type="text"
                    required
                    value={customCategoryVal}
                    onChange={handleCustomCategoryChange}
                    placeholder="Type new category name..."
                    className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans mt-1"
                  />
                )}
              </div>

              {/* Age */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  Estimated Age / Era
                </label>
                <input
                  type="text"
                  value={estimatedAge}
                  onChange={(e) => setEstimatedAge(e.target.value)}
                  placeholder="e.g. c. 1780 (Late Rajput Era)"
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249]"
                />
              </div>

              {/* Material */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  Material Components
                </label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="e.g. Wootz Crucible steel, inlaid bone handle"
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249]"
                />
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  Dimensions (Metric/Imperial)
                </label>
                <input
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  placeholder="e.g. 92 cm length x 8 cm width"
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249]"
                />
              </div>

              {/* Sub-Category */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  Sub-Category (optional)
                </label>
                <input
                  type="text"
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  placeholder="e.g. Dagger, Powder Horn"
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249]"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249]"
                />
              </div>

              {/* Drive Link */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  Room Photo Drive Folder (optional)
                </label>
                <input
                  type="url"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249]"
                />
              </div>

              {/* Estimated Value */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  Estimated INR Valuation (Insurance coverage)
                </label>
                <input
                  type="number"
                  required
                  value={estimatedValue}
                  onChange={(e) => {
                    setEstimatedValue(Number(e.target.value));
                    setValueNeedsReview(false);
                  }}
                  placeholder="e.g. 25000"
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249]"
                />
                {valueNeedsReview && (
                  <p className="text-[9px] text-amber-700 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    AI-suggested figure — a rough starting point only, not an appraisal. Verify with a professional before relying on it for insurance.
                  </p>
                )}
              </div>

              {/* Condition */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  Preservation Condition Quality
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none"
                >
                  <option value="Mint">Mint</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Not Assessed">Not Assessed</option>
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  Catalog Description & Historical Narratives
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Insert meticulous stylistic annotations, marking visible chips, restoration hallmarks..."
                  rows={3}
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans"
                />
              </div>

              {/* Conservation Guidelines */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  Handling Instructions, Conservation Guidelines & Light thresholds
                </label>
                <textarea
                  value={handlingNotes}
                  onChange={(e) => setHandlingNotes(e.target.value)}
                  placeholder="e.g. Touch only with cotton curators gloves. Keep under 30% Relative Humidity."
                  rows={2}
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans"
                />
              </div>

              {/* Last Inspections */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  Last Forensics Check Inspections Date
                </label>
                <input
                  type="date"
                  value={lastInspectedDate}
                  onChange={(e) => setLastInspectedDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-mono font-bold"
                />
              </div>
            </div>

            {/* Back & Next Actions */}
            <div className="flex justify-between pt-4 border-t border-[#ece6da]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-2 px-5 bg-white hover:bg-gray-100 border border-[#c4beaf] rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Photo Info
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="p-2 px-5 bg-[#3b5249] text-white hover:bg-[#2c3d36] rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow"
              >
                Assign Spatial Custody <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================= STEP 3: Space assignations ======================= */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <legend className="font-serif text-sm font-bold text-[#1a1a17]">
                Spatial Allocations & Lease Compliance Coordinates
              </legend>
              <p className="text-[10px] font-mono text-[#8e847a]">
                Every item must map back to an immutable Palace Origin location for lease closure reconciliations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Palace return origin */}
              <div className="space-y-1">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  MANDATORY RETURN LOCATION AT LEASE-END (PALACE ORIGIN)
                </label>
                <select
                  value={isCustomOriginal ? "__CUSTOM__" : originalLocation}
                  onChange={handleOriginalSelectChange}
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans font-bold text-red-700"
                >
                  {groupLocationsByBlock(originalLocationsList).map(([block, rooms]) => (
                    <optgroup key={block} label={block}>
                      {rooms.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="__CUSTOM__">✍️ Custom/New Location...</option>
                </select>

                {isCustomOriginal && (
                  <input
                    type="text"
                    required
                    value={customOriginalVal}
                    onChange={handleCustomOriginalChange}
                    placeholder="Type custom Palace room location..."
                    className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans font-bold text-red-700 mt-1"
                  />
                )}
                <span className="text-[9px] text-gray-400 mt-1 block">This value is audited at Year 15 reconciliation.</span>
              </div>

              {/* Current setups location */}
              <div className="space-y-1">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  CURRENT HOTEL SETUP LOCATION (WHERE IT STANDS NOW)
                </label>
                <select
                  value={isCustomCurrent ? "__CUSTOM__" : currentLocation}
                  onChange={handleCurrentSelectChange}
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans font-bold text-emerald-800"
                >
                  {groupLocationsByBlock(currentLocationsList).map(([block, rooms]) => (
                    <optgroup key={block} label={block}>
                      {rooms.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="__CUSTOM__">✍️ Custom/New Location...</option>
                </select>

                {isCustomCurrent && (
                  <input
                    type="text"
                    required
                    value={customCurrentVal}
                    onChange={handleCustomCurrentChange}
                    placeholder="Type custom active hotel location..."
                    className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans font-bold text-emerald-800 mt-1"
                  />
                )}
                <span className="text-[9px] text-gray-400 mt-1 block">Rooms, corridors, lounges, or conservation vaults.</span>
              </div>

              {/* Status allocation */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                  ACTIVE CUSTODY STATUS
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none"
                >
                  <option value="On Display">On Display</option>
                  <option value="In Storage">In Storage</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Reserved">Reserved</option>
                </select>
                <span className="text-[9px] text-gray-400 mt-1 block">Assign display setups or storage states.</span>
              </div>

              {/* Legal verification sticker */}
              <div className="p-4 bg-[#fcfbf7] border border-[#d2cca0] rounded flex items-center gap-3">
                <input
                  type="checkbox"
                  required
                  id="compliance-agree"
                  checked={complianceAgree}
                  onChange={(e) => setComplianceAgree(e.target.checked)}
                  className="w-4 h-4 text-[#3b5249] border-[#c8c2b5] rounded focus:ring-[#3b5249] cursor-pointer"
                />
                <label htmlFor="compliance-agree" className="text-[10px] font-sans text-[#5c544d] leading-snug cursor-pointer select-none">
                  <strong>Pledge Audit Fidelity:</strong> I verify that this item belongs under Seclude Palace Lease Agreement parameters, and that I'm attributing this transaction to <strong>{currentUser.name}</strong>.
                </label>
              </div>
            </div>

            {/* Back & Save Action Buttons */}
            <div className="flex justify-between pt-4 border-t border-[#ece6da]">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                className="p-2 px-5 bg-white hover:bg-gray-100 border border-[#c4beaf] rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-55"
              >
                <ArrowLeft className="w-4 h-4" /> Back to metadata
              </button>
              <button
                type="button"
                onClick={handleFormSubmission}
                disabled={isSubmitting || !name.trim()}
                className={`p-2 px-6 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer rounded shadow-md transition-all ${
                  isSubmitting || !name.trim()
                    ? "bg-gray-300 border-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#3b5249] hover:bg-[#2c3d36] text-white active:scale-98"
                }`}
              >
                {isSubmitting ? "Pledging..." : "Pledge Dossier to Ledger ✓"}
              </button>
            </div>
          </div>
        )}
      </div>

      {croppingIndex !== null && photos[croppingIndex] && (
        <PhotoCropModal
          imageSrc={photos[croppingIndex]}
          onCancel={() => setCroppingIndex(null)}
          onApply={(croppedDataUrl) => {
            const replacedUrl = photos[croppingIndex];
            setPhotos((prev) => {
              const next = [...prev];
              next[croppingIndex] = croppedDataUrl;
              return next;
            });
            deletePhotoFromStorage(replacedUrl).catch((err) => console.warn("Failed to delete old photo from storage:", err));
            setCroppingIndex(null);
          }}
        />
      )}
    </div>
  );
}
