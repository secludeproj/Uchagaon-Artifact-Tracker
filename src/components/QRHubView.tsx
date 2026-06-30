import React, { useState, useEffect } from "react";
import { Artifact } from "../types";
import { QrCode, Printer, CheckSquare, Square, XCircle, FileText } from "lucide-react";
import QRGenerator from "./QRGenerator";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import SecludeLogo from "./SecludeLogo";

interface QRHubViewProps {
  artifacts: Artifact[];
  onBack: () => void;
}

export default function QRHubView({ artifacts, onBack }: QRHubViewProps) {
  // Tracking selected items for print batch
  const [selectedIds, setSelectedIds] = useState<string[]>(
    artifacts.slice(0, 4).map(a => a.id) // first 4 selected by default as a preview
  );

  const [isInsideIframe, setIsInsideIframe] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.self !== window.top) {
      setIsInsideIframe(true);
    }
  }, []);

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === artifacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(artifacts.map((a) => a.id));
    }
  };

  const downloadPdfLabels = async () => {
    const itemsToPrint = artifacts.filter(item => selectedIds.includes(item.id));
    if (itemsToPrint.length === 0) return;

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Preload Seclude logo once — self-hosted SVG (seclude.in blocks hotlinking)
      const SVG_LOGO_URI = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMzIwIDkwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZyBmaWxsPSJub25lIiBzdHJva2U9IiMzYjUyNDkiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj4KPHBhdGggZD0iTTQwIDgyIEM0MCA2NSwgNDAgNTIsIDQwIDQwIiAvPgo8cGF0aCBkPSJNNDAgNTIgQzMyIDQ4LCAyNiA0MSwgMjggMzMgQzMwIDI3LCAzOCAyNywgNDAgMzMgQzQyIDI3LCA1MCAyNywgNTIgMzMgQzU0IDQxLCA0OCA0OCwgNDAgNTIiIC8+CjxjaXJjbGUgY3g9IjI4IiBjeT0iMzMiIHI9IjMuMiIgZmlsbD0iIzNiNTI0OSIgLz4KPGNpcmNsZSBjeD0iNTIiIGN5PSIzMyIgcj0iMy4yIiBmaWxsPSIjM2I1MjQ5IiAvPgo8cGF0aCBkPSJNNDAgNDAgQzM2IDM2LCAzMyAzMCwgMzcgMjUgQzM5IDIyLCA0MyAyMiwgNDUgMjUgQzQ3IDMwLCA0NCAzNiwgNDAgNDAiIC8+CjxjaXJjbGUgY3g9IjQwIiBjeT0iMjMiIHI9IjIuOCIgZmlsbD0iIzNiNTI0OSIgLz4KPC9nPgo8dGV4dCB4PSI3MiIgeT0iNTYiIGZvbnQtZmFtaWx5PSJHZW9yZ2lhLCBzZXJpZiIgZm9udC1zdHlsZT0iaXRhbGljIiBmb250LXdlaWdodD0iNjAwIiBmb250LXNpemU9IjM0IiBmaWxsPSIjM2I1MjQ5Ij5zZWNsdWRlPC90ZXh0Pgo8dGV4dCB4PSI3NCIgeT0iNzIiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI5IiBsZXR0ZXItc3BhY2luZz0iMiIgZmlsbD0iIzNiNTI0OSIgb3BhY2l0eT0iMC43NSI+SE9URUxTIEhPTUUgU1RZTEU8L3RleHQ+Cjwvc3ZnPg==";
      let logoDataUrl: string | null = null;
      try {
        const logoImg = new Image();
        logoImg.src = SVG_LOGO_URI;
        await new Promise((resolve) => {
          logoImg.onload = resolve;
          logoImg.onerror = resolve;
        });
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 180;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(logoImg, 0, 0, 640, 180);
          logoDataUrl = canvas.toDataURL("image/png");
        }
      } catch (_) { logoDataUrl = null; }

      // A4 dimensions: 210 x 297 mm
      // 2 columns, 4 rows = 8 labels per page
      const colWidth = 82;
      const rowHeight = 56;
      const colGap = 14;
      const rowGap = 8;
      const startX = 16;
      const startY = 18;

      for (let i = 0; i < itemsToPrint.length; i++) {
        const item = itemsToPrint[i];
        
        // Add new page if we exceed 8 labels per page
        if (i > 0 && i % 8 === 0) {
          doc.addPage();
        }

        const pageIdx = i % 8;
        const col = pageIdx % 2;
        const row = Math.floor(pageIdx / 2);

        const x = startX + col * (colWidth + colGap);
        const y = startY + row * (rowHeight + rowGap);

        // Generate QR Code data URL offline!
        const qrValue = item.qrCode || item.id;
        const qrDataUrl = await QRCode.toDataURL(qrValue, {
          margin: 1,
          width: 150,
          color: {
            dark: "#1c1a18",
            light: "#ffffff"
          }
        });

        // 1. Draw outer dashed border for easy cutting/peeling
        doc.setDrawColor(180, 170, 150);
        doc.setLineWidth(0.4);
        doc.setLineDashPattern([2, 2], 0);
        doc.roundedRect(x, y, colWidth, rowHeight, 3, 3, "S");
        doc.setLineDashPattern([], 0);

        // 2. Logo at top-left (small, fits cleanly above text)
        const logoH = 6;
        if (logoDataUrl) {
          try {
            doc.addImage(logoDataUrl, "PNG", x + 5, y + 4, logoH * 2.6, logoH, undefined, "FAST");
          } catch (_) {}
        }

        // Watermark header — placed below logo, shorter text to avoid overlap
        doc.setFont("courier", "bold");
        doc.setFontSize(5.5);
        doc.setTextColor(140, 130, 115);
        doc.text("SECLUDE HERITAGE REGISTRY", x + 5, y + 13.5);

        // Divider line under header
        doc.setDrawColor(225, 220, 205);
        doc.setLineWidth(0.2);
        doc.line(x + 5, y + 15.5, x + colWidth - 5, y + 15.5);

        // Name
        doc.setFont("times", "bold");
        doc.setFontSize(10);
        doc.setTextColor(28, 26, 24);
        const nameLines = doc.splitTextToSize(item.name || "Unnamed Piece", 44);
        doc.text(nameLines.slice(0, 2), x + 5, y + 21);

        // Meta rows
        const metaY = y + 31;
        doc.setFont("courier", "bold");
        doc.setFontSize(7);
        doc.setTextColor(80, 75, 70);
        doc.text(`CAT: ${item.category || "N/A"}`, x + 5, metaY);
        doc.text(`ID : ${item.id}`, x + 5, metaY + 4.2);
        doc.text(`ORIG: ${(item.originalLocation || "Heritage Site").substring(0, 20)}`, x + 5, metaY + 8.4);

        // Lease Compliance Pill Tag
        doc.setDrawColor(210, 205, 190);
        doc.setFillColor(248, 247, 244);
        doc.rect(x + 5, metaY + 12, 34, 5, "FD");

        doc.setFont("courier", "bold");
        doc.setFontSize(6);
        doc.setTextColor(110, 100, 90);
        doc.text("LEASE COMPLIANCE TAG", x + 7, metaY + 15.5);

        // QR Code box on the right
        const qrSize = 32;
        const qrX = x + colWidth - qrSize - 5;
        const qrY = y + 16;

        doc.setDrawColor(220, 215, 200);
        doc.setLineWidth(0.2);
        doc.rect(qrX, qrY, qrSize, qrSize, "S");
        doc.addImage(qrDataUrl, 'PNG', qrX + 0.5, qrY + 0.5, qrSize - 1, qrSize - 1);

        // QR Label under code
        doc.setFont("courier", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(28, 26, 24);
        doc.text(item.qrCode, qrX + qrSize / 2, qrY + qrSize + 4, { align: "center" });
      }

      doc.save(`SECLUDE-HERITAGE-QR-LABELS.pdf`);
    } catch (err) {
      console.error("PDF Sticker generation failed:", err);
    }
  };

  const executePrint = () => {
    window.focus();
    window.print();
  };

  const selectedArtifactsList = artifacts.filter(item => selectedIds.includes(item.id));

  return (
    <div className="space-y-6">
      {/* Primary header screen control - hide inside print output */}
      <div className="no-print flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#dfd6be] pb-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#1c1a18] flex items-center gap-1.5">
            <QrCode className="w-5 h-5 text-[#3b5249]" /> Palace QR & Archival Labeling Hub
          </h2>
          <p className="text-xs text-[#6e645a] font-serif italic mt-0.5">
            Synchronize, scale, and print high-density inventory code labels to apply physically to pieces.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <button
            onClick={onBack}
            className="p-1 px-3 border border-[#c4beaf] hover:bg-[#eae5d9] rounded font-bold uppercase cursor-pointer"
          >
            Back
          </button>
          
          <button
            onClick={handleSelectAll}
            className="p-1 px-3 bg-white hover:bg-[#eae5d9] border border-[#beb39e] rounded font-bold uppercase cursor-pointer"
          >
            {selectedIds.length === artifacts.length ? "Deselect All" : "Select All Pieces"}
          </button>

          <button
            disabled={selectedIds.length === 0}
            onClick={downloadPdfLabels}
            className={`p-1 px-4 text-white rounded font-bold uppercase flex items-center gap-1.5 border shadow transition active:scale-95 ${
              selectedIds.length === 0 
                ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                : "bg-[#8c745c] border-[#735d48] hover:bg-[#735d48] cursor-pointer"
            }`}
          >
            <FileText className="w-4 h-4 text-amber-200" /> Download PDF Stickers ({selectedIds.length})
          </button>

          <button
            disabled={selectedIds.length === 0}
            onClick={executePrint}
            className={`p-1 px-4 rounded font-bold uppercase flex items-center gap-1.5 border shadow ${
              selectedIds.length === 0 
                ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                : "bg-white border-[#beb39e] text-[#1c1a18] hover:bg-gray-50 cursor-pointer"
            }`}
          >
            <Printer className="w-4 h-4 text-emerald-800" /> Print via Browser
          </button>
        </div>
      </div>
      {/* Main Core Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Checklist Selector (no-print) */}
        <div className="no-print lg:col-span-4 bg-[#fdfcf7] border border-[#dcd6c8] rounded shadow-sm p-4 space-y-4">
          <div>
            <h4 className="font-serif text-sm font-bold text-[#1c1a18]">Catalog Checklist</h4>
            <p className="text-[10px] font-mono text-[#8e847a]">Select which items' labels you wish to generate.</p>
          </div>

          <div className="h-px bg-[#ece6da]"></div>

          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {artifacts.map((item) => {
              const selected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelectItem(item.id)}
                  className={`p-2 rounded border text-xs cursor-pointer transition-all flex items-center justify-between gap-1.5 hover:bg-[#f6f2ec] border-transparent ${
                    selected ? "bg-[#f5efe4] border-[#d2cca0] font-semibold" : "bg-[#fcfbf9]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button type="button" className="shrink-0 text-[#3b5249]">
                      {selected ? <CheckSquare className="w-4 h-4 text-[#3b5249]" /> : <Square className="w-4 h-4 text-gray-300" />}
                    </button>
                    <div className="truncate">
                      <p className="truncate text-[#1c1a18]">{item.name}</p>
                      <span className="block text-[8px] font-mono text-[#8e847a] uppercase">{item.id} | {item.category}</span>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[9px] bg-white border px-1 rounded text-gray-500 font-bold">{item.id}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Printable labels grid */}
        <div className="lg:col-span-8 space-y-4">
          <div className="no-print p-2 bg-[#eae2d0] rounded text-center text-[10px] font-mono italic text-[#5c544d] border border-[#dfd6be]">
            👇 Below are your live rendered labels. Print pages are stripped of all navigation borders. Ideal for standard sticker sheets.
          </div>

          {selectedArtifactsList.length === 0 ? (
            <div className="bg-[#fdfcf7] border border-[#dcd6c8] p-12 text-center rounded text-[#8e847a] no-print">
              <Printer className="w-8 h-8 text-[#beb5a1] mx-auto mb-2" />
              <p className="text-xs">No items checked in your checklist on the left side menu.</p>
            </div>
          ) : (
            <div className="p-4 bg-white rounded border border-[#ece6da] print:border-none print:p-0 grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-6">
              {selectedArtifactsList.map((item) => (
                <div 
                  key={item.id} 
                  className="p-4 bg-white border-2 border-dashed border-[#beb39e] print:border-2 print:border-slate-800 rounded-lg flex items-center justify-between gap-4 relative overflow-hidden break-inside-avoid shadow-sm print:shadow-none"
                >
                  <div className="space-y-1.5 min-w-0 relative">
                    {/* Logo header — small, fits the label width */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <SecludeLogo
                        variant="mark"
                        className="text-[#3b5249]"
                        style={{ height: "14px", width: "14px" }} />
                      <span className="text-[6.5px] font-mono tracking-widest text-[#8e847a] uppercase font-bold leading-none">
                        Heritage Registry
                      </span>
                    </div>
                    <h4 className="font-serif text-xs font-bold text-[#1c1a18] tracking-tight leading-normal line-clamp-2 pr-1">
                      {item.name}
                    </h4>

                    {/* Meta coordinates block */}
                    <div className="space-y-0.5 text-[9px] font-mono leading-none pt-0.5 text-[#5c544d]">
                      <p>CAT: <strong className="text-gray-700">{item.category}</strong></p>
                      <p>ID: <strong className="text-emerald-800 font-bold">{item.id}</strong></p>
                      <p>ORIGIN SITE: <strong className="text-red-700 font-bold">{item.originalLocation}</strong></p>
                    </div>

                    <span className="inline-block bg-[#f7f5f0] border border-[#dfd6be] text-[8px] font-mono px-1 rounded uppercase font-bold text-[#6e645a] leading-none py-0.5 mt-1">
                      LEASE COMPLIANCE TAG
                    </span>
                  </div>

                  {/* High Quality Procedural QR Target matrix code */}
                  <div className="flex flex-col items-center gap-1 shrink-0 bg-white p-1 border border-gray-150 rounded">
                    <div className="w-16 h-16 bg-white flex items-center justify-center p-0.5 relative shrink-0">
                      <QRGenerator value={item.qrCode} className="w-full h-full text-[#1c1a18]" />
                    </div>
                    <span className="text-[7.5px] font-mono tracking-tighter uppercase font-bold text-[#1c1a18] leading-none shrink-0">
                      {item.qrCode}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
