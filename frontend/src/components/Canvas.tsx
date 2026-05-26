import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy, Plus, EyeOff, Code } from 'lucide-react';
import { usePageStore } from '../store/pageStore';
import { getBlockDef } from '../blocks/blockDefs';
import { Block } from '../types';
import BLOCK_DEFS from '../blocks/blockDefs';
import toast from 'react-hot-toast';

function SortableBlock({ block, selected }: { block: Block; selected: boolean }) {
  const { selectBlock, deleteBlock, duplicateBlock, addBlock, updateBlock } = usePageStore();
  const def = getBlockDef(block.type);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (!def) return null;

  const onUpdate = selected
    ? (key: string, val: string) => updateBlock(block.id, { ...block.data, [key]: val })
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-block-id={block.id}
      className={`relative group canvas-block-enter ${selected ? 'block-selected' : 'hover:block-hover-outline'}`}
      onClick={(e) => { e.stopPropagation(); selectBlock(block.id); }}
    >
      {/* Block Controls */}
      <div className={`absolute top-2 right-2 z-50 flex items-center gap-1 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <div
          {...attributes}
          {...listeners}
          className="p-1.5 bg-slate-800/90 backdrop-blur-sm text-slate-400 hover:text-white rounded-md cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
          className="p-1.5 bg-slate-800/90 backdrop-blur-sm text-slate-400 hover:text-blue-400 rounded-md"
          title="Duplicate"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const html = def.exportHtml(block.data);
            navigator.clipboard.writeText(html).then(() => toast.success('Block HTML copied!'));
          }}
          className="p-1.5 bg-slate-800/90 backdrop-blur-sm text-slate-400 hover:text-green-400 rounded-md"
          title="Copy block HTML"
        >
          <Code size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); selectBlock(null); }}
          className="p-1.5 bg-slate-800/90 backdrop-blur-sm text-slate-400 hover:text-red-400 rounded-md"
          title="Delete (Del)"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Section Label */}
      <div className={`absolute top-2 left-2 z-50 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <span className="px-2 py-1 bg-indigo-600/90 backdrop-blur-sm text-white text-xs rounded-md font-medium">
          {def.emoji} {def.label}
        </span>
      </div>

      {/* Inline edit hint */}
      {selected && (
        <div className="absolute bottom-2 left-2 z-50 pointer-events-none">
          <span className="px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white/70 text-xs rounded">
            Click text to edit inline
          </span>
        </div>
      )}

      {/* Hidden block overlay */}
      {block.hidden && (
        <div className="absolute inset-0 z-40 bg-slate-900/60 flex items-center justify-center pointer-events-none">
          <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded-lg font-medium">
            <EyeOff size={12} /> Hidden — excluded from export
          </span>
        </div>
      )}

      {/* Block Content — pointer events enabled when selected for inline editing */}
      <div className={`${selected ? '' : 'pointer-events-none select-none'} ${block.hidden ? 'opacity-30' : ''}`}>
        {def.renderCanvas(block.data, onUpdate)}
      </div>

      {/* Add Section Button between blocks */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-50 transition-opacity opacity-0 group-hover:opacity-100">
        <div className="relative">
          <div className="w-px h-4 bg-indigo-500 mx-auto" />
          <div className="flex gap-1 bg-slate-900 border border-slate-600 rounded-lg p-1 shadow-lg">
            {['hero', 'features', 'cta', 'pricing', 'steps', 'testimonials'].map((type) => {
              const d = BLOCK_DEFS.find((b) => b.type === type);
              if (!d) return null;
              return (
                <button
                  key={d.type}
                  onClick={(e) => {
                    e.stopPropagation();
                    addBlock(d.type, { ...d.defaultData }, block.id);
                    toast.success(`${d.label} added`);
                  }}
                  title={`Add ${d.label}`}
                  className="p-1 text-base hover:bg-slate-700 rounded"
                >
                  {d.emoji}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Canvas() {
  const { page, selectedBlockId, selectBlock, moveBlock, addBlock, theme } = usePageStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      moveBlock(active.id as string, over.id as string);
    }
  };

  if (page.blocks.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center bg-slate-100 cursor-default"
        onClick={() => selectBlock(null)}
      >
        <div className="text-center max-w-sm p-8">
          <div className="text-6xl mb-4">🏗️</div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Start building your page</h3>
          <p className="text-slate-500 text-sm mb-6">Add sections from the left panel, or use AI to generate a complete page in seconds.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['hero', 'features', 'pricing', 'cta'].map((type) => {
              const def = BLOCK_DEFS.find((b) => b.type === type);
              if (!def) return null;
              return (
                <button
                  key={def.type}
                  onClick={(e) => {
                    e.stopPropagation();
                    addBlock(def.type, { ...def.defaultData });
                    toast.success(`${def.label} added`);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <span>{def.emoji}</span>
                  <span className="font-medium text-slate-700">{def.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto bg-slate-200"
      style={{ '--brand': theme.primaryColor } as React.CSSProperties}
      onClick={() => selectBlock(null)}
    >
      <div className="min-h-full bg-white max-w-5xl mx-auto shadow-xl my-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={page.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-slate-100">
              {page.blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  selected={selectedBlockId === block.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
