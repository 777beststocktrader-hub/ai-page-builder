# AI Page Builder

A production-ready AI-powered page builder — build beautiful landing pages in minutes using Claude Haiku 4.5.

## Features

- **8 Section Types** — Hero, Features, Pricing, Testimonials, CTA, FAQ, Stats, Footer
- **AI Content Generation** — Generate copy for any section using Claude Haiku 4.5
- **AI Page Generator** — Describe your page goal, AI builds the entire structure
- **Drag-to-Reorder** — Rearrange sections with smooth drag-and-drop
- **Live Property Editing** — Edit all section fields in real-time
- **Responsive Preview** — Desktop, tablet, and mobile preview modes
- **Clean HTML Export** — Download dependency-free HTML/CSS
- **Undo / Redo** — Full history with keyboard shortcuts (Ctrl+Z / Ctrl+Y)

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/ai-page-builder.git
cd ai-page-builder
npm run install:all
```

### 2. Set up your Anthropic API key

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and add your ANTHROPIC_API_KEY
```

Get your key at: https://console.anthropic.com

### 3. Run

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| State | Zustand |
| Backend | Node.js, Express, TypeScript |
| AI | Claude Haiku 4.5 (claude-haiku-4-5-20251001) |

## Project Structure

```
ai-page-builder/
├── backend/
│   └── src/index.ts          # Express server + AI endpoints
└── frontend/
    └── src/
        ├── blocks/
        │   └── blockDefs.tsx  # All 8 section block definitions
        ├── components/
        │   ├── Canvas.tsx     # Drag-and-drop canvas
        │   ├── BlockLibrary.tsx
        │   ├── PropertiesPanel.tsx
        │   ├── AIPanel.tsx    # Per-section AI generator
        │   └── Toolbar.tsx
        ├── store/pageStore.ts # Zustand state + history
        └── lib/
            ├── api.ts         # Backend API calls
            └── htmlExport.ts  # HTML export logic
```

## AI Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/ai/generate` | Generate content for a specific section |
| `POST /api/ai/suggest` | AI suggests which sections to use for a page goal |

## License

MIT
