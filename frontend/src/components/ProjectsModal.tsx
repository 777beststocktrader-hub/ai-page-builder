import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FolderOpen, Clock, Copy } from 'lucide-react';
import { getAllProjects, loadProject, deleteProject, duplicateProject, getBlockEmoji, ProjectMeta } from '../lib/projects';
import { usePageStore } from '../store/pageStore';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

export default function ProjectsModal({ onClose }: Props) {
  const { loadProject: loadIntoStore, newProject } = usePageStore();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);

  useEffect(() => {
    setProjects(getAllProjects());
  }, []);

  const handleOpen = (id: string) => {
    const data = loadProject(id);
    if (!data) { toast.error('Could not load project'); return; }
    loadIntoStore(data.page, data.pageGoal, data.theme);
    toast.success(`Opened "${data.page.title}"`);
    onClose();
  };

  const handleDelete = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    deleteProject(id);
    setProjects(getAllProjects());
    toast.success('Project deleted');
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = duplicateProject(id);
    if (newId) {
      setProjects(getAllProjects());
      toast.success('Page duplicated!');
    } else {
      toast.error('Could not duplicate page');
    }
  };

  const handleNew = () => {
    newProject();
    toast.success('New page started');
    onClose();
  };

  const timeAgo = (ms: number): string => {
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-indigo-400" />
            <h2 className="text-white font-semibold text-lg">My Pages</h2>
            <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">{projects.length}</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* New page button */}
        <div className="px-6 py-3 border-b border-slate-700">
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all"
          >
            <Plus size={16} /> New Blank Page
          </button>
        </div>

        {/* Project list */}
        <div className="overflow-y-auto max-h-[420px] p-4">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-slate-400 text-sm">No saved pages yet.</p>
              <p className="text-slate-600 text-xs mt-1">Build a page and it saves automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleOpen(p.id)}
                  className="text-left p-4 rounded-xl border border-slate-700 hover:border-indigo-500 hover:bg-indigo-950/20 transition-all group relative"
                >
                  {/* Preview emoji grid */}
                  <div className="flex gap-1 mb-3 flex-wrap">
                    <span className="text-2xl">{getBlockEmoji(p.firstBlockType)}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-200 group-hover:text-white truncate pr-6">{p.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.blockCount} section{p.blockCount !== 1 ? 's' : ''}</p>
                  {p.pageGoal && <p className="text-xs text-slate-600 mt-1 truncate">{p.pageGoal}</p>}
                  <div className="flex items-center gap-1 mt-2 text-xs text-slate-600">
                    <Clock size={10} />
                    {timeAgo(p.updatedAt)}
                  </div>
                  <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => handleDuplicate(p.id, e)}
                      className="p-1.5 text-slate-600 hover:text-blue-400 rounded-md hover:bg-blue-950/30"
                      title="Duplicate page"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(p.id, p.title, e)}
                      className="p-1.5 text-slate-600 hover:text-red-400 rounded-md hover:bg-red-950/30"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
