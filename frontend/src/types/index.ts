export interface Block {
  id: string;
  type: string;
  data: Record<string, any>;
  hidden?: boolean;
}

export interface Page {
  id: string;
  title: string;
  description?: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  trackingCode?: string;
  customCss?: string;
  blocks: Block[];
}

export interface Field {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'color' | 'url' | 'select' | 'array' | 'number';
  placeholder?: string;
  options?: { value: string; label: string }[];
  arrayItemFields?: Field[];
}

export interface BlockDef {
  type: string;
  label: string;
  emoji: string;
  category: string;
  fields: Field[];
  defaultData: Record<string, any>;
  renderCanvas: (data: Record<string, any>, onUpdate?: (key: string, val: string) => void) => React.ReactElement;
  exportHtml: (data: Record<string, any>) => string;
}

export interface Theme {
  primaryColor: string;
  font?: string;
  spacing?: 'compact' | 'normal' | 'spacious';
}

export type Tone = 'professional' | 'casual' | 'marketing' | 'playful';
export type PreviewMode = 'desktop' | 'tablet' | 'mobile';
