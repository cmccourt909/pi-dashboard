import { LABEL_WIDTH } from "./types";

/**
 * Gantt chart styles — extracted from roadmap page to keep the main component lean.
 */
export const ROADMAP_CSS = `
  :root {
    --blue: #2563eb; --blue-light: #dbeafe; --blue-mid: #93c5fd;
    --green: #16a34a; --red: #dc2626; --amber: #d97706;
    --gray-50: #f8fafc; --gray-100: #f1f5f9; --gray-200: #e2e8f0;
    --gray-400: #94a3b8; --gray-600: #475569; --gray-800: #1e293b;
    --text: #1e293b; --border: #e2e8f0; --radius: 6px;
    --font: -apple-system, "Segoe UI", system-ui, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .roadmap-page { padding: 24px; max-width: 100%; margin: 0 auto; font-family: var(--font); font-size: 15px; color: var(--text); }

  /* Header */
  .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
  .page-title { font-size: 24px; font-weight: 700; color: var(--gray-800); }
  .page-subtitle { font-size: 14px; color: var(--gray-600); margin-top: 2px; }

  /* Buttons */
  .export-group { display: flex; gap: 8px; }
  .btn { padding: 8px 16px; border-radius: var(--radius); border: 1px solid var(--border); background: white; font-size: 14px; font-weight: 500; cursor: pointer; color: var(--gray-800); transition: background .15s; }
  .btn:hover { background: var(--gray-100); }
  .btn-primary { background: var(--blue); color: white; border-color: var(--blue); }
  .btn-primary:hover { background: #1d4ed8; }
  .btn:disabled { opacity: .5; cursor: default; }

  /* Controls */
  .controls { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
  .control-group { display: flex; align-items: center; gap: 6px; }
  .control-label { font-size: 13px; font-weight: 600; color: var(--gray-600); text-transform: uppercase; letter-spacing: .04em; }
  select { padding: 7px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; color: var(--text); background: white; cursor: pointer; }

  /* Pills */
  .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
  .pill { padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border); background: white; font-size: 13px; font-weight: 500; cursor: pointer; color: var(--gray-600); transition: all .15s; }
  .pill:hover { border-color: var(--blue); color: var(--blue); }
  .pill.active { background: var(--blue); color: white; border-color: var(--blue); }
  .pill-count { background: rgba(255,255,255,.25); border-radius: 10px; padding: 1px 7px; margin-left: 4px; font-size: 12px; }
  .pill.active .pill-count { background: rgba(255,255,255,.3); }

  /* Gantt container */
  .gantt-container { background: white; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  .gantt-inner { display: flex; }

  /* Fixed label column */
  .gantt-labels-col { flex-shrink: 0; width: ${LABEL_WIDTH}px; border-right: 2px solid var(--border); z-index: 10; background: white; }
  .gantt-label-header { height: 80px; padding: 0 14px; display: flex; align-items: center; font-size: 13px; font-weight: 600; color: var(--gray-600); border-bottom: 2px solid var(--border); }
  .gantt-label { padding: 10px 14px; display: flex; flex-direction: column; justify-content: center; gap: 3px; overflow: hidden; border-bottom: 1px solid var(--gray-100); min-height: 56px; }
  .feature-key { font-size: 12px; font-weight: 600; color: var(--blue); font-family: monospace; }
  .feature-summary { font-size: 14px; color: var(--gray-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .feature-assignee { font-size: 12px; color: var(--gray-400); }

  /* Scrollable track column */
  .gantt-scroll-col { flex: 1; overflow-x: auto; overflow-y: hidden; }
  .gantt-scroll-col::-webkit-scrollbar { height: 8px; }
  .gantt-scroll-col::-webkit-scrollbar-track { background: var(--gray-100); }
  .gantt-scroll-col::-webkit-scrollbar-thumb { background: var(--gray-400); border-radius: 4px; }
  .gantt-canvas { position: relative; }

  /* Month ruler */
  .month-ruler { height: 28px; position: relative; border-bottom: 1px solid var(--border); background: #1e3a5f; }
  .month-band { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #e2eaf4; border-right: 1px solid rgba(255,255,255,0.15); white-space: nowrap; overflow: hidden; letter-spacing: 0.04em; text-transform: uppercase; }

  /* Timeline band header */
  .timeline-header-row { height: 80px; position: relative; border-bottom: 2px solid var(--border); display: flex; align-items: stretch; overflow: hidden; background: linear-gradient(to right, #eff6ff 0%, #eff6ff 50%, #dbeafe 50%, #dbeafe 100%); background-size: 280px 100%; }
  .timeline-header-row.sprint-mode { background: #f8fafc; overflow: visible; }
  .timeline-band { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--gray-800); border-right: 1px solid var(--border); overflow: hidden; padding: 0 4px; text-align: center; }
  .timeline-band.sprint { overflow: visible; z-index: 2; background: transparent !important; padding: 0; }
  .timeline-band.sprint span { position: absolute; bottom: 8px; left: 50%; display: inline-block; transform: rotate(-45deg); transform-origin: left bottom; font-size: 11px; font-weight: 600; color: var(--gray-800); white-space: nowrap; line-height: 1; }
  .timeline-band:nth-child(odd) { background: #eff6ff; }
  .timeline-band:nth-child(even) { background: #dbeafe; }

  /* Today line */
  .today-line { position: absolute; top: 0; bottom: 0; width: 2px; background: #E8622A; opacity: 0.9; z-index: 5; pointer-events: none; }

  /* Gantt rows */
  .gantt-row { display: flex; border-bottom: 1px solid var(--gray-100); min-height: 56px; }
  .gantt-row:hover { background: var(--gray-50); }
  .gantt-row.row-overdue { background: #fff5f5; }
  .gantt-row.row-risk { background: #fffbeb; }
  .gantt-row.row-overdue:hover { background: #fee2e2; }
  .gantt-row.row-risk:hover { background: #fef3c7; }

  /* Group headers */
  .group-label-row { padding: 8px 14px; font-size: 13px; font-weight: 700; color: var(--blue); border-bottom: 1px solid var(--border); border-top: 2px solid var(--blue); background: var(--gray-100); min-height: 40px; display: flex; align-items: center; }
  .group-track-row { padding: 8px 14px; font-size: 12px; color: var(--gray-600); display: flex; align-items: center; background: var(--gray-100); border-bottom: 1px solid var(--border); }

  /* Track */
  .gantt-track { position: relative; flex-shrink: 0; padding: 6px 0; display: flex; align-items: center; overflow: visible; }
  .gantt-bar-row { position: relative; display: flex; align-items: center; overflow: visible; }
  .gantt-bar-track { position: relative; height: 32px; overflow: visible; }

  /* Bar */
  .gantt-bar { position: absolute; top: 4px; height: 24px; border-radius: 4px; border: 2px solid var(--blue); overflow: hidden; display: flex; align-items: center; min-width: 8px; cursor: pointer; }
  .gantt-bar.overdue { border-color: var(--red) !important; }
  .gantt-bar.at-risk { border-color: var(--amber) !important; }
  .gantt-progress { position: absolute; left: 0; top: 0; bottom: 0; opacity: .25; }
  .gantt-bar-label { position: relative; z-index: 2; font-size: 11px; font-weight: 700; color: var(--gray-800); padding: 0 6px; white-space: nowrap; }
  .risk-badge { position: absolute; right: -8px; top: -6px; width: 16px; height: 16px; border-radius: 50%; background: var(--red); color: white; font-size: 10px; font-weight: 900; display: flex; align-items: center; justify-content: center; z-index: 10; }

  /* No dates */
  .no-dates { font-size: 13px; color: var(--gray-400); font-style: italic; padding: 4px 8px; position: absolute; left: 8px; }

  /* Tooltip */
  .gantt-tooltip { position: absolute; top: 36px; z-index: 100; background: white; border: 1px solid var(--border); border-radius: 8px; padding: 14px; width: 300px; box-shadow: 0 8px 24px rgba(0,0,0,.12); pointer-events: none; }
  .tt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .tt-key { font-size: 12px; font-weight: 700; font-family: monospace; color: var(--blue); }
  .tt-status { font-size: 12px; font-weight: 600; }
  .tt-summary { font-size: 14px; font-weight: 600; color: var(--gray-800); margin-bottom: 8px; }
  .tt-meta { display: flex; flex-direction: column; gap: 3px; font-size: 13px; color: var(--gray-600); margin-bottom: 8px; }
  .tt-progress-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .tt-progress-track { flex: 1; height: 7px; background: var(--gray-100); border-radius: 3px; overflow: hidden; }
  .tt-progress-fill { height: 100%; border-radius: 3px; transition: width .3s; }
  .tt-stories { display: flex; flex-direction: column; gap: 5px; }
  .tt-story { display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .tt-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .tt-dot.done { background: var(--green); }
  .tt-dot.blocked { background: var(--red); }
  .tt-dot.active { background: var(--blue); }
  .tt-story-key { font-family: monospace; font-weight: 600; color: var(--blue); flex-shrink: 0; }
  .tt-story-sum { color: var(--gray-600); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tt-story-sprint { font-size: 11px; color: var(--gray-400); flex-shrink: 0; background: var(--gray-100); padding: 1px 5px; border-radius: 3px; }
  .tt-more { font-size: 12px; color: var(--gray-400); padding-top: 2px; }

  /* Loading */
  .loading { padding: 48px; text-align: center; color: var(--gray-600); font-size: 16px; }

  /* Legend */
  .legend { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; padding: 12px 14px; background: var(--gray-50); border-top: 1px solid var(--border); font-size: 13px; color: var(--gray-600); }
  .legend-item { display: flex; align-items: center; gap: 5px; }
  .legend-dot { width: 11px; height: 11px; border-radius: 2px; border: 2px solid; }

  /* Scroll hint */
  .scroll-hint { font-size: 12px; color: var(--gray-400); text-align: right; margin-bottom: 4px; }
`;
