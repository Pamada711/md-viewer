import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// ===== Types =====
interface FileMetadata {
  name: string;
  line_count: number;
  modified: number;
}

// ===== State =====
let currentFilePath: string | null = null;
let searchMarks: HTMLElement[] = [];
let searchIndex = -1;
let reloadTimer: ReturnType<typeof setTimeout> | null = null;
let alwaysOnTop = false;
let currentTheme: 'auto' | 'light' | 'dark' = 'auto';
const THEME_LABELS = { auto: 'Auto', light: 'Light', dark: 'Dark' } as const;

// ===== DOM refs =====
const markdownBody = document.getElementById('markdown-body')!;
const tocList = document.getElementById('toc-list')!;
const tocWrapper = document.getElementById('toc-wrapper')!;
const dropOverlay = document.getElementById('drop-overlay')!;
const searchBar = document.getElementById('search-bar')!;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const searchCount = document.getElementById('search-count')!;
const statusFilename = document.getElementById('status-filename')!;
const statusLines = document.getElementById('status-lines')!;
const statusModified = document.getElementById('status-modified')!;
const alwaysOnTopBtn = document.getElementById('btn-always-on-top')!;
const themeBtn = document.getElementById('btn-theme')!;
const contentArea = document.getElementById('content-area')!;

// ===== Markdown rendering =====
marked.setOptions({ gfm: true, breaks: false });

async function openFile(path: string): Promise<void> {
  try {
    const content = await invoke<string>('read_file', { path });
    currentFilePath = path;

    const rawHtml = marked.parse(content) as string;
    markdownBody.innerHTML = DOMPurify.sanitize(rawHtml);

    generateToc();
    addCopyButtons();
    await startWatching(path);
    await updateStatusBar(path);

    localStorage.setItem('lastFile', path);
    const savedScroll = localStorage.getItem(`scroll:${path}`);
    contentArea.scrollTop = savedScroll ? parseInt(savedScroll) : 0;

    const filename = path.replace(/\\/g, '/').split('/').pop() ?? path;
    document.title = `${filename} - MD Viewer`;
  } catch (err) {
    markdownBody.innerHTML = `<div class="error-msg">ファイルを開けませんでした:\n${DOMPurify.sanitize(String(err))}</div>`;
  }
}

// ===== File watching =====
async function startWatching(path: string): Promise<void> {
  try {
    await invoke('watch_file', { path });
  } catch {
    // File watching failure is non-fatal
  }
}

// ===== TOC =====
function generateToc(): void {
  tocList.innerHTML = '';
  const headings = markdownBody.querySelectorAll<HTMLElement>('h1, h2, h3');

  if (headings.length === 0) {
    tocWrapper.style.display = 'none';
    return;
  }
  tocWrapper.style.display = '';

  headings.forEach((h, i) => {
    const id = `h-${i}`;
    h.id = id;

    const a = document.createElement('a');
    a.href = `#${id}`;
    a.textContent = h.textContent ?? '';
    a.dataset.level = h.tagName.toLowerCase();
    a.addEventListener('click', (e) => {
      e.preventDefault();
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    const li = document.createElement('li');
    li.appendChild(a);
    tocList.appendChild(li);
  });
}

// ===== Code copy buttons =====
function addCopyButtons(): void {
  markdownBody.querySelectorAll<HTMLElement>('pre').forEach((pre) => {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'コピー';
    btn.addEventListener('click', () => {
      const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = '完了';
        setTimeout(() => { btn.textContent = 'コピー'; }, 1500);
      });
    });
    pre.appendChild(btn);
  });
}

// ===== Status bar =====
async function updateStatusBar(path: string): Promise<void> {
  try {
    const meta = await invoke<FileMetadata>('get_file_metadata', { path });
    statusFilename.textContent = meta.name;
    statusLines.textContent = `${meta.line_count} 行`;
    const d = new Date(meta.modified * 1000);
    statusModified.textContent = d.toLocaleString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    statusFilename.textContent = path.replace(/\\/g, '/').split('/').pop() ?? path;
  }
}

// ===== Search =====
function showSearch(): void {
  searchBar.classList.remove('hidden');
  searchInput.focus();
  searchInput.select();
}

function hideSearch(): void {
  searchBar.classList.add('hidden');
  clearHighlights();
  searchMarks = [];
  searchIndex = -1;
  searchCount.textContent = '';
}

function clearHighlights(): void {
  markdownBody.querySelectorAll('mark[data-search]').forEach((mark) => {
    const text = document.createTextNode(mark.textContent ?? '');
    mark.parentNode?.replaceChild(text, mark);
  });
  markdownBody.normalize();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function doSearch(term: string): void {
  clearHighlights();
  searchMarks = [];
  searchIndex = -1;

  if (!term.trim()) {
    searchCount.textContent = '';
    return;
  }

  const regex = new RegExp(escapeRegex(term), 'gi');
  const walker = document.createTreeWalker(markdownBody, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (regex.test(node.textContent ?? '')) textNodes.push(node);
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? '';
    const fragment = document.createDocumentFragment();
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    regex.lastIndex = 0;

    while ((m = regex.exec(text)) !== null) {
      if (m.index > lastIdx) {
        fragment.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
      }
      const mark = document.createElement('mark');
      mark.dataset.search = '';
      mark.textContent = m[0];
      fragment.appendChild(mark);
      searchMarks.push(mark);
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  if (searchMarks.length > 0) {
    navigateSearch(0);
  } else {
    searchCount.textContent = '見つかりません';
  }
}

function navigateSearch(idx: number): void {
  if (searchMarks.length === 0) return;
  searchMarks[searchIndex]?.classList.remove('current');
  searchIndex = ((idx % searchMarks.length) + searchMarks.length) % searchMarks.length;
  searchMarks[searchIndex].classList.add('current');
  searchMarks[searchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  searchCount.textContent = `${searchIndex + 1} / ${searchMarks.length}`;
}

// ===== Theme =====
function applyTheme(theme: 'auto' | 'light' | 'dark'): void {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = THEME_LABELS[theme];
  localStorage.setItem('theme', theme);
}

// ===== Init =====
async function init(): Promise<void> {
  // Restore theme
  const savedTheme = localStorage.getItem('theme') as 'auto' | 'light' | 'dark' | null;
  applyTheme(savedTheme ?? 'auto');

  // Persist scroll position
  contentArea.addEventListener('scroll', () => {
    if (currentFilePath) {
      localStorage.setItem(`scroll:${currentFilePath}`, String(contentArea.scrollTop));
    }
  });

  // Auto-reload when file changes on disk
  await listen<string>('file-changed', () => {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(async () => {
      if (!currentFilePath) return;
      const scrollBefore = contentArea.scrollTop;
      await openFile(currentFilePath);
      contentArea.scrollTop = scrollBefore;
    }, 250);
  });

  // Drag & drop via Tauri window event
  const appWindow = getCurrentWebviewWindow();
  await appWindow.onDragDropEvent((event) => {
    const { type } = event.payload;
    if (type === 'enter' || type === 'over') {
      dropOverlay.classList.add('active');
    } else if (type === 'leave') {
      dropOverlay.classList.remove('active');
    } else if (type === 'drop') {
      dropOverlay.classList.remove('active');
      const paths = (event.payload as { type: string; paths?: string[] }).paths ?? [];
      const mdPath = paths.find(p => /\.(md|markdown|txt)$/i.test(p));
      if (mdPath) openFile(mdPath);
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      showSearch();
    } else if (e.key === 'Escape' && !searchBar.classList.contains('hidden')) {
      hideSearch();
    }
  });

  // Search events
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  searchInput.addEventListener('input', () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => doSearch(searchInput.value), 150);
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigateSearch(e.shiftKey ? searchIndex - 1 : searchIndex + 1);
    }
  });
  document.getElementById('search-prev')!.addEventListener('click', () => navigateSearch(searchIndex - 1));
  document.getElementById('search-next')!.addEventListener('click', () => navigateSearch(searchIndex + 1));
  document.getElementById('search-close')!.addEventListener('click', hideSearch);

  // Always-on-top toggle
  alwaysOnTopBtn.addEventListener('click', async () => {
    alwaysOnTop = !alwaysOnTop;
    alwaysOnTopBtn.classList.toggle('active', alwaysOnTop);
    try {
      await appWindow.setAlwaysOnTop(alwaysOnTop);
    } catch {
      // Not available in dev mode — ignore
    }
  });

  // Theme cycle
  const themeOrder: Array<'auto' | 'light' | 'dark'> = ['auto', 'light', 'dark'];
  themeBtn.addEventListener('click', () => {
    const next = themeOrder[(themeOrder.indexOf(currentTheme) + 1) % themeOrder.length];
    applyTheme(next);
  });

  // Welcome screen
  markdownBody.innerHTML = `
    <div class="welcome">
      <h2>MD Viewer</h2>
      <p>ファイルをドラッグ&amp;ドロップするか、CLI から起動してください。</p>
      <p style="margin-top:8px; font-size:12px;">例: <code>md-viewer README.md</code></p>
    </div>`;

  // Open file from CLI arg, or restore last opened file
  const startupFile = await invoke<string | null>('get_startup_file');
  if (startupFile) {
    await openFile(startupFile);
  } else {
    const lastFile = localStorage.getItem('lastFile');
    if (lastFile) await openFile(lastFile);
  }
}

document.addEventListener('DOMContentLoaded', init);
