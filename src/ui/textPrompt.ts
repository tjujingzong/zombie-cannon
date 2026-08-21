import { FONT } from './helpers';

export interface TextPromptOptions {
  title: string;
  confirmLabel?: string;
  cancelLabel?: string;
  placeholder?: string;
  initial?: string;
  readOnly?: boolean;
}

// 用 DOM 弹层替代 window.prompt：原生 prompt 在 Android WebView 中确认按钮常被遮挡，iOS WKWebView 完全不支持。
export function showTextPrompt(opts: TextPromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    Object.assign(root.style, {
      position: 'fixed',
      zIndex: '2147483647',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(4, 8, 12, 0.82)',
      touchAction: 'auto',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    } as Partial<CSSStyleDeclaration>);

    const syncRect = () => {
      const rect = document.querySelector<HTMLCanvasElement>('#app canvas')?.getBoundingClientRect();
      if (rect && rect.width > 0) {
        root.style.left = `${rect.left}px`;
        root.style.top = `${rect.top}px`;
        root.style.width = `${rect.width}px`;
        root.style.height = `${rect.height}px`;
      } else {
        root.style.left = '0';
        root.style.top = '0';
        root.style.width = '100%';
        root.style.height = '100%';
      }
    };
    syncRect();

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: 'min(88%, 430px)',
      maxHeight: '72%',
      padding: '18px 16px',
      borderRadius: '14px',
      background: '#141c24',
      border: '1px solid rgba(143, 191, 143, 0.35)',
      boxShadow: '0 10px 36px rgba(0, 0, 0, 0.6)',
      boxSizing: 'border-box',
    } as Partial<CSSStyleDeclaration>);

    const title = document.createElement('div');
    title.textContent = opts.title;
    Object.assign(title.style, {
      fontFamily: FONT,
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#ffd54a',
      textAlign: 'center',
    } as Partial<CSSStyleDeclaration>);

    const textarea = document.createElement('textarea');
    textarea.placeholder = opts.placeholder ?? '';
    textarea.value = opts.initial ?? '';
    textarea.readOnly = opts.readOnly === true;
    Object.assign(textarea.style, {
      flex: '1 1 auto',
      minHeight: '120px',
      maxHeight: '38vh',
      padding: '10px',
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '14px',
      lineHeight: '1.45',
      color: '#e8f0e8',
      background: '#0b1116',
      border: '1px solid rgba(255, 255, 255, 0.16)',
      borderRadius: '8px',
      resize: 'none',
      outline: 'none',
      touchAction: 'auto',
      userSelect: 'text',
      WebkitUserSelect: 'text',
      boxSizing: 'border-box',
    } as Partial<CSSStyleDeclaration>);

    const buttons = document.createElement('div');
    Object.assign(buttons.style, {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
    } as Partial<CSSStyleDeclaration>);

    const makeButton = (label: string, background: string): HTMLButtonElement => {
      const btn = document.createElement('button');
      btn.textContent = label;
      Object.assign(btn.style, {
        minWidth: '110px',
        padding: '12px 20px',
        fontFamily: FONT,
        fontSize: '17px',
        fontWeight: 'bold',
        color: '#ffffff',
        background,
        border: 'none',
        borderRadius: '10px',
        touchAction: 'manipulation',
      } as Partial<CSSStyleDeclaration>);
      buttons.appendChild(btn);
      return btn;
    };

    const cancelBtn = makeButton(opts.cancelLabel ?? '取消', '#4a5560');
    const confirmBtn = makeButton(opts.confirmLabel ?? '确认', '#2e7d32');

    panel.append(title, textarea, buttons);
    root.appendChild(panel);
    document.body.appendChild(root);

    let closed = false;
    const close = (value: string | null) => {
      if (closed) return;
      closed = true;
      window.removeEventListener('resize', syncRect);
      window.removeEventListener('orientationchange', syncRect);
      root.remove();
      resolve(value);
    };

    cancelBtn.addEventListener('click', () => close(null));
    confirmBtn.addEventListener('click', () => close(textarea.value.trim()));
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close(null);
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') close(textarea.value.trim());
    });

    window.addEventListener('resize', syncRect);
    window.addEventListener('orientationchange', syncRect);

    textarea.focus();
    if (opts.readOnly) textarea.select();
    else textarea.setSelectionRange(0, textarea.value.length);
  });
}
