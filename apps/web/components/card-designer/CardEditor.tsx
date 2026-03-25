'use client';

import { useCallback, useEffect, useRef, useState, MouseEvent as ReactMouseEvent } from 'react';
import { CardDesign, CardType, PhotoPlaceholder, QrPlaceholder, ShapeElement, STUDENT_TEMPLATE, STAFF_TEMPLATE, BLANK_TEMPLATE, loadSavedDesign, saveDesign, SavedTemplate, loadSavedTemplates, saveTemplate, deleteTemplate } from './types';
import { renderDesignToCanvas } from './renderDesignToCanvas';
import { downloadSingleCardPDF } from './generateCardPDF';
import CardCanvas from './CardCanvas';
import Toolbar from './Toolbar';

const TEMPLATES: Record<CardType, CardDesign> = {
  student: STUDENT_TEMPLATE,
  staff: STAFF_TEMPLATE,
};

export default function CardEditor() {
  const [design, setDesign] = useState<CardDesign>(STUDENT_TEMPLATE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);

  // Template management
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [templatePreviews, setTemplatePreviews] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null);

  const handleResizeStart = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (ev: globalThis.MouseEvent) => {
      if (!isResizing.current) return;
      const delta = startX - ev.clientX;
      const newWidth = Math.min(600, Math.max(200, startWidth + delta));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth]);

  // Load saved design on mount
  useEffect(() => {
    const savedStudent = loadSavedDesign('student');
    if (savedStudent) setDesign(savedStudent);
  }, []);

  // Refresh template list and generate previews when picker opens
  useEffect(() => {
    if (!showTemplatePicker) return;
    const templates = loadSavedTemplates();
    setSavedTemplates(templates);

    // Generate preview thumbnails for built-in + saved templates
    const allDesigns: { key: string; design: CardDesign }[] = [
      { key: '__builtin_blank', design: BLANK_TEMPLATE },
      { key: '__builtin_student', design: STUDENT_TEMPLATE },
      { key: '__builtin_staff', design: STAFF_TEMPLATE },
      ...templates.map((t) => ({ key: t.id, design: t.design })),
    ];
    let cancelled = false;
    (async () => {
      const previews: Record<string, string> = {};
      for (const item of allDesigns) {
        if (cancelled) break;
        try {
          const canvas = await renderDesignToCanvas(item.design, { scale: 1 });
          previews[item.key] = canvas.toDataURL('image/png');
        } catch {
          // skip failed previews
        }
      }
      if (!cancelled) setTemplatePreviews(previews);
    })();
    return () => { cancelled = true; };
  }, [showTemplatePicker]);

  const handleSaveAsTemplate = () => {
    const name = templateName.trim();
    if (!name) return;
    saveTemplate(name, design);
    setTemplateName('');
    setShowSaveTemplate(false);
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2000);
  };

  const handleLoadTemplate = (tpl: SavedTemplate) => {
    const d = JSON.parse(JSON.stringify(tpl.design)) as CardDesign;
    setDesign(d);
    setSelectedId(null);
    setShowTemplatePicker(false);
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id);
    setSavedTemplates(loadSavedTemplates());
  };

  const handleCardTypeChange = (type: CardType) => {
    const savedDesign = loadSavedDesign(type);
    setDesign(savedDesign ?? TEMPLATES[type]);
    setSelectedId(null);
  };

  const handleMoveText = useCallback(
    (id: string, x: number, y: number) => {
      setDesign((prev) => ({
        ...prev,
        texts: prev.texts.map((t) => (t.id === id ? { ...t, x, y } : t)),
      }));
    },
    []
  );

  const handleMoveLogo = useCallback(
    (id: string, x: number, y: number) => {
      setDesign((prev) => ({
        ...prev,
        logos: prev.logos.map((l) => (l.id === id ? { ...l, x, y } : l)),
      }));
    },
    []
  );

  const handleMoveShape = useCallback(
    (id: string, x: number, y: number) => {
      setDesign((prev) => ({
        ...prev,
        shapes: (prev.shapes ?? []).map((s) => (s.id === id ? { ...s, x, y } : s)),
      }));
    },
    []
  );

  const handleResizeShape = useCallback(
    (id: string, changes: Partial<ShapeElement>) => {
      setDesign((prev) => ({
        ...prev,
        shapes: (prev.shapes ?? []).map((s) => (s.id === id ? { ...s, ...changes } : s)),
      }));
    },
    []
  );

  const handleMovePhoto = useCallback(
    (x: number, y: number) => {
      setDesign((prev) => prev.photo ? { ...prev, photo: { ...prev.photo, x, y } } : prev);
    },
    []
  );

  const handleResizePhoto = useCallback(
    (changes: Partial<PhotoPlaceholder>) => {
      setDesign((prev) => prev.photo ? { ...prev, photo: { ...prev.photo, ...changes } } : prev);
    },
    []
  );

  const handleMoveQr = useCallback(
    (x: number, y: number) => {
      setDesign((prev) => prev.qr ? { ...prev, qr: { ...prev.qr, x, y } } : prev);
    },
    []
  );

  const handleResizeQr = useCallback(
    (changes: Partial<QrPlaceholder>) => {
      setDesign((prev) => prev.qr ? { ...prev, qr: { ...prev.qr, ...changes } } : prev);
    },
    []
  );

  const handleExportPNG = async () => {
    setExporting('png');
    try {
      const canvas = await renderDesignToCanvas(design);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
      if (!blob) { alert('Failed to generate image.'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${design.cardType}-card-design.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PNG export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      await downloadSingleCardPDF(design, {
        name: `${design.cardType}-card-design`,
        fieldValues: {},
      });
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const handleSave = () => {
    saveDesign(design);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setDesign(TEMPLATES[design.cardType]);
    setSelectedId(null);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-sm">
        {/* Card Type Switcher */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden mr-1">
          <button
            onClick={() => handleCardTypeChange('student')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              design.cardType === 'student'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            🎓 Student
          </button>
          <button
            onClick={() => handleCardTypeChange('staff')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-slate-200 ${
              design.cardType === 'staff'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            👨‍🏫 Staff
          </button>
        </div>

        <div className="w-px h-7 bg-slate-200 mx-1 hidden sm:block" />

        {/* Template */}
        <button onClick={() => setShowTemplatePicker(true)} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors">
          📂 Template
        </button>

        <div className="w-px h-7 bg-slate-200 mx-1 hidden sm:block" />

        {/* Save group */}
        <button onClick={handleSave} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
          {saved ? '✅ Saved!' : '💾 Save'}
        </button>
        <button onClick={() => setShowSaveTemplate(true)} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors">
          {templateSaved ? '✅ Saved!' : '📋 Save as Template'}
        </button>

        <div className="w-px h-7 bg-slate-200 mx-1 hidden sm:block" />

        {/* Export */}
        <button onClick={handleExportPNG} disabled={!!exporting} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-wait">
          {exporting === 'png' ? '⏳ Exporting…' : '🖼️ Export PNG'}
        </button>
        <button onClick={handleExportPDF} disabled={!!exporting} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-wait">
          {exporting === 'pdf' ? '⏳ Exporting…' : '📄 Export PDF'}
        </button>

        {/* Spacer + Reset */}
        <div className="flex-1" />
        <button onClick={handleReset} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors">
          🗑️ Reset
        </button>
      </div>

      {/* Save Template Modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowSaveTemplate(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-4">💾 Save as Template</h3>
            <p className="text-sm text-slate-500 mb-3">Save the current <span className="font-medium text-slate-700">{design.cardType}</span> card design as a reusable template.</p>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveAsTemplate()}
              placeholder="Template name (e.g. Blue Modern Student Card)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSaveTemplate(false)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSaveAsTemplate} disabled={!templateName.trim()} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Save Template</button>
            </div>
          </div>
        </div>
      )}

      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowTemplatePicker(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">📂 Choose Template</h3>
              <button onClick={() => setShowTemplatePicker(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>

            {/* Built-in Templates */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Built-in Templates</h4>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => { setDesign({ ...BLANK_TEMPLATE }); setSelectedId(null); setShowTemplatePicker(false); }}
                  className="rounded-xl border-2 border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all text-left group overflow-hidden"
                >
                  <div className="bg-slate-50 flex items-center justify-center p-3 border-b border-slate-100">
                    {templatePreviews['__builtin_blank'] ? (
                      <img src={templatePreviews['__builtin_blank']} alt="Blank Card Preview" className="rounded-lg shadow-sm max-h-36 object-contain" />
                    ) : (
                      <div className="h-28 w-full flex items-center justify-center text-slate-400 text-sm">Loading...</div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">📄</span>
                      <span className="font-semibold text-slate-800">Blank Card</span>
                    </div>
                    <div className="text-xs text-slate-500">Empty card — start from scratch with a clean canvas</div>
                    <div className="mt-2 inline-block px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-500 font-medium">Built-in</div>
                  </div>
                </button>
                <button
                  onClick={() => { setDesign({ ...STUDENT_TEMPLATE }); setSelectedId(null); setShowTemplatePicker(false); }}
                  className="rounded-xl border-2 border-indigo-200 bg-indigo-50/50 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group overflow-hidden"
                >
                  <div className="bg-slate-100 flex items-center justify-center p-3 border-b border-indigo-100">
                    {templatePreviews['__builtin_student'] ? (
                      <img src={templatePreviews['__builtin_student']} alt="Student Card Preview" className="rounded-lg shadow-sm max-h-36 object-contain" />
                    ) : (
                      <div className="h-28 w-full flex items-center justify-center text-slate-400 text-sm">Loading...</div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🎓</span>
                      <span className="font-semibold text-slate-800">Student Card</span>
                    </div>
                    <div className="text-xs text-slate-500">Default student ID card with photo, QR code, name, class and ID fields</div>
                    <div className="mt-2 inline-block px-2 py-0.5 text-[10px] rounded-full bg-indigo-100 text-indigo-600 font-medium">Built-in</div>
                  </div>
                </button>
                <button
                  onClick={() => { setDesign({ ...STAFF_TEMPLATE }); setSelectedId(null); setShowTemplatePicker(false); }}
                  className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left group overflow-hidden"
                >
                  <div className="bg-slate-100 flex items-center justify-center p-3 border-b border-emerald-100">
                    {templatePreviews['__builtin_staff'] ? (
                      <img src={templatePreviews['__builtin_staff']} alt="Staff Card Preview" className="rounded-lg shadow-sm max-h-36 object-contain" />
                    ) : (
                      <div className="h-28 w-full flex items-center justify-center text-slate-400 text-sm">Loading...</div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">👨‍🏫</span>
                      <span className="font-semibold text-slate-800">Staff Card</span>
                    </div>
                    <div className="text-xs text-slate-500">Default staff ID card with photo, QR code, name, department and role fields</div>
                    <div className="mt-2 inline-block px-2 py-0.5 text-[10px] rounded-full bg-emerald-100 text-emerald-600 font-medium">Built-in</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Saved Templates */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Your Saved Templates</h4>
              {savedTemplates.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <span className="text-3xl block mb-2">📭</span>
                  <p className="text-sm text-slate-400">No saved templates yet. Design a card and click &ldquo;Save as Template&rdquo; to save it here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {savedTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="rounded-xl border-2 border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 transition-all text-left relative group overflow-hidden"
                    >
                      <button
                        onClick={() => handleLoadTemplate(tpl)}
                        className="w-full text-left"
                      >
                        <div className="bg-slate-50 flex items-center justify-center p-3 border-b border-slate-100">
                          {templatePreviews[tpl.id] ? (
                            <img src={templatePreviews[tpl.id]} alt={tpl.name} className="rounded-lg shadow-sm max-h-36 object-contain" />
                          ) : (
                            <div className="h-28 w-full flex items-center justify-center">
                              <div className="rounded-lg border-2 border-dashed border-slate-200 w-full h-full flex items-center justify-center text-slate-300 text-xs">Preview</div>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{tpl.cardType === 'student' ? '🎓' : '👨‍🏫'}</span>
                            <span className="font-semibold text-slate-800 truncate">{tpl.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-block px-2 py-0.5 text-[10px] rounded-full font-medium ${
                              tpl.cardType === 'student' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>{tpl.cardType}</span>
                            <span className="text-[10px] text-slate-400">{new Date(tpl.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{tpl.design.width}×{tpl.design.height}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{tpl.design.texts.length} texts</span>
                            {tpl.design.photo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Photo</span>}
                            {tpl.design.qr && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">QR</span>}
                            {(tpl.design.shapes?.length ?? 0) > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{tpl.design.shapes.length} shapes</span>}
                            {(tpl.design.logos?.length ?? 0) > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{tpl.design.logos.length} logos</span>}
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete template"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor Layout */}
      <div className="flex gap-4 items-start" ref={canvasRef}>
        {/* Canvas */}
        <div className="flex-1 min-w-0">
          <CardCanvas
            design={design}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMoveText={handleMoveText}
            onMoveLogo={handleMoveLogo}
            onMoveShape={handleMoveShape}
            onResizeShape={handleResizeShape}
            onMovePhoto={handleMovePhoto}
            onResizePhoto={handleResizePhoto}
            onMoveQr={handleMoveQr}
            onResizeQr={handleResizeQr}
          />
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleResizeStart}
          className="w-1.5 shrink-0 cursor-col-resize rounded-full hover:bg-indigo-400 bg-slate-300 transition-colors self-stretch"
          title="Drag to resize sidebar"
        />

        {/* Properties sidebar */}
        <Toolbar
          design={design}
          selectedId={selectedId}
          onDesignChange={setDesign}
          onSelect={setSelectedId}
          width={sidebarWidth}
        />
      </div>
    </div>
  );
}
