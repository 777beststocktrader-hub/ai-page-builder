import React, { useState } from 'react';
import { Sparkles, Loader2, Zap, Shuffle, FlaskConical, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Block, BlockDef, Tone } from '../types';
import { usePageStore } from '../store/pageStore';
import { generateBlockContent, abTestHeadlines } from '../lib/api';
import toast from 'react-hot-toast';

interface Props {
  block: Block;
  def: BlockDef;
}

const TONES: { value: Tone; label: string; emoji: string }[] = [
  { value: 'marketing', label: 'Marketing', emoji: '📣' },
  { value: 'professional', label: 'Pro', emoji: '💼' },
  { value: 'casual', label: 'Casual', emoji: '😊' },
  { value: 'playful', label: 'Playful', emoji: '🎉' },
];

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian',
  'Dutch', 'Japanese', 'Korean', 'Chinese', 'Arabic', 'Hindi',
];

const QUICK_PROMPTS = [
  { label: 'More compelling', prompt: 'Make this more compelling and benefit-focused' },
  { label: 'Add urgency', prompt: 'Add urgency and scarcity to drive action now' },
  { label: 'Simplify', prompt: 'Simplify the language so anyone can understand it' },
  { label: 'Stronger CTA', prompt: 'Make the call-to-action stronger and more action-oriented' },
  { label: 'Social proof', prompt: 'Add trust signals and social proof elements' },
  { label: 'Rewrite fresh', prompt: 'Completely rewrite with fresh copy and new angle' },
];

interface ABVariant {
  label: string;
  angle: string;
  headline: string;
  subheadline: string;
  primaryBtn: string;
  improvement: string;
}

export default function AIPanel({ block, def }: Props) {
  const { updateBlock, pageGoal } = usePageStore();
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<Tone>('marketing');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Record<string, any> | null>(null);
  const [language, setLanguage] = useState('English');
  const [showAB, setShowAB] = useState(false);
  const [abLoading, setAbLoading] = useState(false);
  const [abVariants, setAbVariants] = useState<ABVariant[]>([]);

  const isHero = block.type === 'hero';

  const handleGenerate = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim()) return;
    setLoading(true);
    try {
      const newData = await generateBlockContent(block.type, finalPrompt, block.data, tone, pageGoal || undefined, language === 'English' ? undefined : language);
      setLastGenerated(block.data);
      updateBlock(block.id, { ...block.data, ...newData });
      toast.success('Content updated ✨');
      if (!customPrompt) setPrompt('');
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVariant = async () => {
    setLoading(true);
    try {
      const newData = await generateBlockContent(
        block.type,
        'Generate a completely different angle and approach for this section — different hook, different benefit focus, different tone',
        block.data,
        tone,
        pageGoal || undefined,
        language === 'English' ? undefined : language
      );
      setLastGenerated(block.data);
      updateBlock(block.id, { ...block.data, ...newData });
      toast.success('Alternative version generated ✨');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleABTest = async () => {
    setAbLoading(true);
    setAbVariants([]);
    try {
      const variants = await abTestHeadlines(
        block.data.headline || '',
        block.data.subheadline,
        block.data.primaryBtn,
        pageGoal || undefined
      );
      setAbVariants(variants);
      if (variants.length === 0) toast.error('No variants returned — try again');
    } catch (err: any) {
      toast.error(err.message || 'A/B test failed');
    } finally {
      setAbLoading(false);
    }
  };

  const applyVariant = (variant: ABVariant) => {
    setLastGenerated(block.data);
    updateBlock(block.id, {
      ...block.data,
      headline: variant.headline,
      subheadline: variant.subheadline,
      primaryBtn: variant.primaryBtn,
    });
    toast.success(`Variant ${variant.label} applied!`);
    setAbVariants([]);
    setShowAB(false);
  };

  const variantColor: Record<string, string> = {
    A: 'border-indigo-500/60 bg-indigo-950/40',
    B: 'border-emerald-500/60 bg-emerald-950/30',
    C: 'border-amber-500/60 bg-amber-950/30',
  };

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-all ${open ? 'text-indigo-400 bg-indigo-950/80' : 'text-slate-400 hover:text-slate-200'}`}
      >
        <span className="flex items-center gap-1.5">
          <Sparkles size={12} className={open ? 'text-indigo-400' : ''} />
          AI Writer
        </span>
        <span className="text-slate-600 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-3 bg-indigo-950/40 space-y-2.5 border-t border-indigo-900/50">
          {/* Quick action chips */}
          <div>
            <p className="text-xs text-slate-600 mb-1.5 flex items-center gap-1"><Zap size={10} /> Quick actions</p>
            <div className="flex gap-1 flex-wrap">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => handleGenerate(q.prompt)}
                  disabled={loading}
                  className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 hover:bg-indigo-800 hover:text-white transition-all disabled:opacity-50 border border-slate-700 hover:border-indigo-600"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Or describe what you want...`}
            rows={2}
            className="w-full bg-slate-900 text-slate-200 text-xs px-2 py-2 rounded border border-indigo-900 focus:border-indigo-500 focus:outline-none resize-none placeholder-slate-600"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
          />

          {/* Tone selector */}
          <div className="flex gap-1">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                title={t.label}
                className={`flex-1 text-xs py-1 rounded transition-all ${tone === t.value ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300 bg-slate-800/50 border border-slate-700'}`}
              >
                {t.emoji}
              </button>
            ))}
          </div>

          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-slate-900 text-slate-300 text-xs px-2 py-1.5 rounded border border-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => handleGenerate()}
              disabled={loading || !prompt.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-all"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {loading ? 'Writing…' : 'Generate'}
            </button>
            <button
              onClick={handleVariant}
              disabled={loading}
              title="Generate a completely different version"
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
            >
              <Shuffle size={12} />
              Variant
            </button>
          </div>

          {/* A/B Headline Testing — hero blocks only */}
          {isHero && (
            <div className="border-t border-indigo-900/60 pt-2.5">
              <button
                onClick={() => setShowAB(!showAB)}
                className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-all"
              >
                <span className="flex items-center gap-1.5">
                  <FlaskConical size={11} className="text-amber-400" />
                  <span className="font-medium text-slate-300">A/B Headline Test</span>
                  <span className="text-slate-600">3 variants</span>
                </span>
                {showAB ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>

              {showAB && (
                <div className="mt-2 space-y-2">
                  <button
                    onClick={handleABTest}
                    disabled={abLoading || !block.data.headline}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-all"
                  >
                    {abLoading ? <Loader2 size={12} className="animate-spin" /> : <FlaskConical size={12} />}
                    {abLoading ? 'Generating variants…' : 'Generate 3 A/B Variants'}
                  </button>

                  {abVariants.length > 0 && (
                    <div className="space-y-2 mt-1">
                      <p className="text-xs text-slate-500">Click a variant to apply it:</p>
                      {abVariants.map((v) => (
                        <div
                          key={v.label}
                          className={`rounded-lg border p-2.5 cursor-pointer hover:opacity-90 transition-all ${variantColor[v.label] || 'border-slate-600 bg-slate-800/40'}`}
                          onClick={() => applyVariant(v)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-300">Variant {v.label}</span>
                            <span className="text-xs text-slate-500 italic truncate max-w-[120px]">{v.angle}</span>
                          </div>
                          <p className="text-xs font-semibold text-white mb-0.5">{v.headline}</p>
                          {v.subheadline && <p className="text-xs text-slate-400 mb-1 line-clamp-2">{v.subheadline}</p>}
                          {v.primaryBtn && (
                            <span className="inline-block text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                              CTA: {v.primaryBtn}
                            </span>
                          )}
                          <p className="text-xs text-emerald-400 mt-1.5 flex items-start gap-1">
                            <CheckCircle2 size={10} className="mt-0.5 flex-shrink-0" />
                            {v.improvement}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {lastGenerated && (
            <button
              onClick={() => { updateBlock(block.id, lastGenerated); setLastGenerated(null); }}
              className="w-full text-xs text-slate-500 hover:text-slate-300 py-1 transition-all"
            >
              ↩ Restore previous version
            </button>
          )}
        </div>
      )}
    </div>
  );
}
