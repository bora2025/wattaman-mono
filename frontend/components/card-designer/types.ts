export interface TextElement {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  fontFamily?: string;
  zIndex?: number;
}

export const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Noto Sans Khmer', value: '"Noto Sans Khmer", sans-serif' },
  { label: 'Battambang', value: 'Battambang, sans-serif' },
  { label: 'Moul', value: 'Moul, serif' },
  { label: 'Siemreap', value: 'Siemreap, sans-serif' },
  { label: 'Hanuman', value: 'Hanuman, serif' },
  { label: 'Bokor', value: 'Bokor, serif' },
  { label: 'Koulen', value: 'Koulen, sans-serif' },
  { label: 'Chenla', value: 'Chenla, sans-serif' },
  { label: 'Content', value: 'Content, sans-serif' },
  { label: 'Khmer', value: 'Khmer, sans-serif' },
];

export interface LogoElement {
  id: string;
  src: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
}

export type ShapeType = 'rectangle' | 'circle' | 'line';

export interface GradientStop {
  offset: number;
  color: string;
}

export interface ShapeElement {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  opacity: number;
  zIndex?: number;
  gradient: {
    enabled: boolean;
    type: 'linear' | 'radial';
    angle: number;
    stops: GradientStop[];
  };
}

export interface PhotoPlaceholder {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
  zIndex?: number;
}

export interface QrPlaceholder {
  x: number;
  y: number;
  size: number;
  width: number;
  height: number;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
  zIndex?: number;
}

export type CardSize = 'credit' | 'id-1' | 'a7' | 'custom';
export type CardType = 'student' | 'staff';

export interface CardDesign {
  cardType: CardType;
  size: CardSize;
  width: number;
  height: number;
  backgroundColor: string;
  frameColor: string;
  frameWidth: number;
  texts: TextElement[];
  logos: LogoElement[];
  shapes: ShapeElement[];
  photo: PhotoPlaceholder | null;
  qr: QrPlaceholder | null;
}

export const CARD_SIZE_PRESETS: Record<Exclude<CardSize, 'custom'>, { width: number; height: number; label: string }> = {
  'credit': { width: 340, height: 215, label: 'Credit Card (85.6 × 53.98 mm)' },
  'id-1': { width: 340, height: 215, label: 'ID-1 Standard' },
  'a7': { width: 298, height: 420, label: 'A7 (74 × 105 mm)' },
};

export const DESIGN_STORAGE_KEY = 'schoolsync-card-designs';
export const TEMPLATES_STORAGE_KEY = 'schoolsync-card-templates';

export interface SavedTemplate {
  id: string;
  name: string;
  cardType: CardType;
  design: CardDesign;
  createdAt: string;
}

export function loadSavedTemplates(): SavedTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTemplate(name: string, design: CardDesign): SavedTemplate {
  const templates = loadSavedTemplates();
  const newTemplate: SavedTemplate = {
    id: Math.random().toString(36).slice(2, 10),
    name,
    cardType: design.cardType,
    design: JSON.parse(JSON.stringify(design)),
    createdAt: new Date().toISOString(),
  };
  templates.push(newTemplate);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  return newTemplate;
}

export function deleteTemplate(id: string): void {
  const templates = loadSavedTemplates().filter((t) => t.id !== id);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

export function loadSavedDesign(type: CardType): CardDesign | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DESIGN_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Record<string, CardDesign>;
    const design = saved[type] ?? null;
    if (design) {
      const template = type === 'student' ? STUDENT_TEMPLATE : STAFF_TEMPLATE;

      // Ensure top-level fields have defaults
      design.backgroundColor = design.backgroundColor ?? template.backgroundColor;
      design.frameColor = design.frameColor ?? template.frameColor;
      design.frameWidth = design.frameWidth ?? template.frameWidth;
      design.shapes = design.shapes ?? [];
      design.logos = design.logos ?? [];
      design.texts = design.texts ?? [];

      // Migrate texts
      for (const t of design.texts) {
        if (t.content === 'Class: {{Class Name}}') {
          t.content = '{{Class Name}}';
        }
        t.fontFamily = t.fontFamily ?? 'Inter, sans-serif';
        t.textAlign = t.textAlign ?? 'left';
        t.fontWeight = t.fontWeight ?? 'normal';
        t.fontStyle = t.fontStyle ?? 'normal';
      }

      // Migrate shapes
      for (const s of design.shapes) {
        s.rotation = s.rotation ?? 0;
        s.opacity = s.opacity ?? 1;
        s.borderColor = s.borderColor ?? '#1e293b';
        s.borderWidth = s.borderWidth ?? 0;
        s.borderRadius = s.borderRadius ?? 0;
        s.gradient = s.gradient ?? {
          enabled: false,
          type: 'linear',
          angle: 90,
          stops: [
            { offset: 0, color: '#4f46e5' },
            { offset: 1, color: '#06b6d4' },
          ],
        };
      }

      // Migrate photo placeholder
      if (design.photo) {
        design.photo.borderRadius = design.photo.borderRadius ?? 6;
        design.photo.borderColor = design.photo.borderColor ?? template.frameColor;
        design.photo.borderWidth = design.photo.borderWidth ?? 2;
      }

      // Migrate QR placeholder
      if (design.qr && !('width' in design.qr)) {
        const qr = design.qr as any;
        design.qr = { ...qr, width: qr.size, height: qr.size, borderRadius: 0, borderColor: '#cbd5e1', borderWidth: 1 };
      }
      if (design.qr) {
        design.qr.borderRadius = design.qr.borderRadius ?? 0;
        design.qr.borderColor = design.qr.borderColor ?? '#cbd5e1';
        design.qr.borderWidth = design.qr.borderWidth ?? 1;
      }
    }
    return design;
  } catch {
    return null;
  }
}

export function saveDesign(design: CardDesign): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(DESIGN_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    saved[design.cardType] = design;
    localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // ignore storage errors
  }
}

export const BLANK_TEMPLATE: CardDesign = {
  cardType: 'student',
  size: 'credit',
  width: 340,
  height: 215,
  backgroundColor: '#ffffff',
  frameColor: '#cbd5e1',
  frameWidth: 0,
  photo: null,
  qr: null,
  texts: [],
  logos: [],
  shapes: [],
};

export const STUDENT_TEMPLATE: CardDesign = {
  cardType: 'student',
  size: 'credit',
  width: 340,
  height: 215,
  backgroundColor: '#eef2ff',
  frameColor: '#4f46e5',
  frameWidth: 3,
  photo: { x: 15, y: 55, width: 70, height: 85, borderRadius: 6, borderColor: '#4f46e5', borderWidth: 2, zIndex: 5 },
  qr: { x: 250, y: 55, size: 80, width: 80, height: 80, borderRadius: 0, borderColor: '#cbd5e1', borderWidth: 1, zIndex: 5 },
  texts: [
    { id: 'st-school', content: 'SchoolSync Academy', x: 90, y: 12, fontSize: 14, color: '#312e81', fontWeight: 'bold', fontStyle: 'normal', textAlign: 'left' },
    { id: 'st-title', content: 'STUDENT ID CARD', x: 90, y: 32, fontSize: 11, color: '#4f46e5', fontWeight: 'bold', fontStyle: 'normal', textAlign: 'left' },
    { id: 'st-name', content: '{{Student Name}}', x: 100, y: 65, fontSize: 15, color: '#1e293b', fontWeight: 'bold', fontStyle: 'normal', textAlign: 'left' },
    { id: 'st-id', content: 'ID: {{Student ID}}', x: 100, y: 88, fontSize: 11, color: '#475569', fontWeight: 'normal', fontStyle: 'normal', textAlign: 'left' },
    { id: 'st-class', content: '{{Class Name}}', x: 100, y: 106, fontSize: 11, color: '#475569', fontWeight: 'normal', fontStyle: 'normal', textAlign: 'left' },
    { id: 'st-year', content: 'Academic Year: 2025-2026', x: 100, y: 124, fontSize: 10, color: '#64748b', fontWeight: 'normal', fontStyle: 'italic', textAlign: 'left' },
    { id: 'st-valid', content: 'Valid Until: June 2026', x: 15, y: 185, fontSize: 9, color: '#94a3b8', fontWeight: 'normal', fontStyle: 'normal', textAlign: 'left' },
  ],
  logos: [],
  shapes: [],
};

export const STAFF_TEMPLATE: CardDesign = {
  cardType: 'staff',
  size: 'credit',
  width: 340,
  height: 215,
  backgroundColor: '#ecfdf5',
  frameColor: '#059669',
  frameWidth: 3,
  photo: { x: 15, y: 55, width: 70, height: 85, borderRadius: 6, borderColor: '#059669', borderWidth: 2, zIndex: 5 },
  qr: { x: 250, y: 55, size: 80, width: 80, height: 80, borderRadius: 0, borderColor: '#cbd5e1', borderWidth: 1, zIndex: 5 },
  texts: [
    { id: 'sf-school', content: 'SchoolSync Academy', x: 90, y: 12, fontSize: 14, color: '#064e3b', fontWeight: 'bold', fontStyle: 'normal', textAlign: 'left' },
    { id: 'sf-title', content: 'OFFICER ID CARD', x: 90, y: 32, fontSize: 11, color: '#059669', fontWeight: 'bold', fontStyle: 'normal', textAlign: 'left' },
    { id: 'sf-name', content: '{{Staff Name}}', x: 100, y: 65, fontSize: 15, color: '#1e293b', fontWeight: 'bold', fontStyle: 'normal', textAlign: 'left' },
    { id: 'sf-id', content: 'Employee ID: {{Emp ID}}', x: 100, y: 88, fontSize: 11, color: '#475569', fontWeight: 'normal', fontStyle: 'normal', textAlign: 'left' },
    { id: 'sf-dept', content: 'Position: {{Position}}', x: 100, y: 106, fontSize: 11, color: '#475569', fontWeight: 'normal', fontStyle: 'normal', textAlign: 'left' },
    { id: 'sf-valid', content: 'Valid Until: June 2026', x: 15, y: 185, fontSize: 9, color: '#94a3b8', fontWeight: 'normal', fontStyle: 'normal', textAlign: 'left' },
  ],
  logos: [],
  shapes: [],
};
