'use strict';
// ── CTI AI Assistant — floating chat bubble ───────────────────────────────────
// Self-contained IIFE. Drop one <script> tag on any Athena portal page.
// Requires: WORKER_URL defined on the page (or falls back to the default).
// Public API: window.CTIAssistant = { init, open, close, toggle }
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  // ── Config ────────────────────────────────────────────────────────────────
  const WORKER = (typeof WORKER_URL !== 'undefined' ? WORKER_URL : 'https://cti-athena.cti-athena.workers.dev');
  const MAX_HISTORY = 12;
  const GREETING = [
    'Hi! I’m CTI AI. I can help you understand the data on this page.',
    '',
    'You can ask things like:',
    '• “How many deployments this year?”',
    '• “Which cruise line has the most seafarers?”',
    '• “Compare repeater vs new hire”',
    '',
    'What would you like to know?',
  ].join('\n');

  // ── State ─────────────────────────────────────────────────────────────────
  let _open      = false;
  let _tts       = false;
  let _listening = false;
  let _messages  = [];          // {role, content}[]
  let _recog     = null;        // SpeechRecognition instance
  let _utterance = null;        // current SpeechSynthesisUtterance
  let _built     = false;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function escAI(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      // strip markdown formatting
      .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** → plain
      .replace(/\*(.+?)\*/g, '$1')        // *italic* → plain
      .replace(/#{1,6}\s+/g, '')          // ## headings → plain
      .replace(/`(.+?)`/g, '$1')          // `code` → plain
      // newlines → line breaks
      .replace(/\n/g, '<br>');
  }
  function stripMd(s) {
    return String(s || '').replace(/\*\*/g, '').replace(/#+\s/g, '');
  }
  function $id(id) { return document.getElementById(id); }

  // ── Inject CSS ────────────────────────────────────────────────────────────
  function injectStyles() {
    if ($id('cti-ai-styles')) return;
    const style = document.createElement('style');
    style.id = 'cti-ai-styles';
    style.textContent = `
      #cti-ai-btn {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99990;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: #B01A18;
        color: #fff;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(176,26,24,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.18s, box-shadow 0.18s;
        outline: none;
      }
      #cti-ai-btn:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 20px rgba(176,26,24,0.55);
      }
      #cti-ai-btn.cti-ai-pulse {
        animation: ctiPulse 2s ease-in-out 3;
      }
      @keyframes ctiPulse {
        0%,100% { box-shadow: 0 4px 16px rgba(176,26,24,0.4); }
        50%      { box-shadow: 0 0 0 10px rgba(176,26,24,0.15), 0 4px 16px rgba(176,26,24,0.4); transform: scale(1.06); }
      }
      #cti-ai-nudge {
        position: fixed;
        bottom: 86px;
        right: 24px;
        z-index: 99991;
        background: #1A1A1A;
        color: #fff;
        font-size: 12px;
        font-family: inherit;
        padding: 8px 13px;
        border-radius: 10px 10px 2px 10px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transform: translateY(6px);
        transition: opacity 0.25s, transform 0.25s;
        max-width: 240px;
        white-space: normal;
        line-height: 1.4;
      }
      #cti-ai-nudge.cti-nudge-show {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      #cti-ai-panel {
        position: fixed;
        bottom: 86px;
        right: 24px;
        z-index: 99989;
        width: 370px;
        max-height: 520px;
        border-radius: 16px;
        background: var(--card-bg, #fff);
        border: 1px solid var(--border, #e5e7eb);
        box-shadow: 0 8px 32px rgba(0,0,0,0.14);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: translateY(16px) scale(0.97);
        opacity: 0;
        pointer-events: none;
        transition: transform 0.22s cubic-bezier(.22,1,.36,1), opacity 0.18s;
      }
      #cti-ai-panel.cti-ai-open {
        transform: translateY(0) scale(1);
        opacity: 1;
        pointer-events: all;
      }
      #cti-ai-header {
        background: #B01A18;
        padding: 12px 12px 10px 14px;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        flex-shrink: 0;
      }
      #cti-ai-header-text {
        flex: 1;
        min-width: 0;
      }
      #cti-ai-title {
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.2;
      }
      #cti-ai-subtitle {
        color: rgba(255,255,255,0.75);
        font-size: 10.5px;
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cti-ai-hbtn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(255,255,255,0.18);
        border: none;
        color: #fff;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: background 0.15s;
        outline: none;
      }
      .cti-ai-hbtn:hover { background: rgba(255,255,255,0.32); }
      #cti-ai-messages {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px 12px 8px;
        background: var(--bg-page, #fafafa);
      }
      .cti-msg {
        max-width: 82%;
        padding: 7px 11px;
        font-size: 12.5px;
        line-height: 1.55;
        word-break: break-word;
      }
      .cti-msg-user {
        align-self: flex-end;
        background: #B01A18;
        color: #fff;
        border-radius: 12px 12px 2px 12px;
      }
      .cti-msg-assistant {
        align-self: flex-start;
        background: var(--bg-page, #f5f5f5);
        color: var(--text, #1A1A1A);
        border-radius: 12px 12px 12px 2px;
        border: 1px solid var(--border, #e5e7eb);
      }
      .cti-msg-system {
        align-self: center;
        font-size: 11px;
        color: var(--text-muted, #888);
        font-style: italic;
        background: transparent;
        border: none;
        padding: 2px 0;
      }
      #cti-ai-typing {
        align-self: flex-start;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 9px 13px;
        background: var(--bg-page, #f5f5f5);
        border-radius: 12px 12px 12px 2px;
        border: 1px solid var(--border, #e5e7eb);
      }
      .cti-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--text-muted, #888);
        animation: ctiDot 1.2s infinite;
      }
      .cti-dot:nth-child(2) { animation-delay: 0.2s; }
      .cti-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes ctiDot {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
        40%           { transform: translateY(-5px); opacity: 1; }
      }
      #cti-ai-live {
        display: none;
        padding: 6px 12px 4px;
        font-size: 11.5px;
        color: #B01A18;
        font-style: italic;
        background: rgba(176,26,24,0.05);
        border-top: 1px solid rgba(176,26,24,0.12);
        min-height: 28px;
        line-height: 1.5;
        word-break: break-word;
      }
      #cti-ai-input-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        border-top: 1px solid var(--border, #e5e7eb);
        background: var(--card-bg, #fff);
        flex-shrink: 0;
      }
      #cti-ai-mic {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1.5px solid var(--border, #ddd);
        background: var(--card-bg, #fff);
        color: var(--text-muted, #888);
        font-size: 15px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        outline: none;
      }
      #cti-ai-mic.cti-mic-active {
        background: #B01A18;
        color: #fff;
        border-color: #B01A18;
      }
      #cti-ai-mic:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
      #cti-ai-input {
        flex: 1;
        border: 1px solid var(--border, #ddd);
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 12.5px;
        font-family: inherit;
        background: var(--bg-page, #fafafa);
        color: var(--text, #1A1A1A);
        outline: none;
        resize: none;
        min-height: 32px;
        max-height: 80px;
        line-height: 1.5;
      }
      #cti-ai-input:focus { border-color: #B01A18; }
      #cti-ai-send {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #B01A18;
        border: none;
        color: #fff;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: opacity 0.15s;
        outline: none;
      }
      #cti-ai-send:hover { opacity: 0.85; }
      #cti-ai-send:disabled { opacity: 0.45; cursor: not-allowed; }
      @media (max-width: 420px) {
        #cti-ai-panel { width: calc(100vw - 16px); right: 8px; bottom: 80px; }
        #cti-ai-btn   { right: 12px; bottom: 16px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Build DOM ─────────────────────────────────────────────────────────────
  function buildDOM() {
    if (_built) return;
    _built = true;
    injectStyles();

    // Panel
    const panel = document.createElement('div');
    panel.id = 'cti-ai-panel';
    panel.setAttribute('aria-label', 'CTI AI Assistant');
    panel.innerHTML = `
      <div id="cti-ai-header">
        <div id="cti-ai-header-text">
          <div id="cti-ai-title">CTI AI Assistant</div>
          <div id="cti-ai-subtitle">Ask me about this page</div>
        </div>
        <button class="cti-ai-hbtn" id="cti-ai-tts-btn" title="Toggle voice output">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        </button>
        <button class="cti-ai-hbtn" id="cti-ai-clear-btn" title="New conversation">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button class="cti-ai-hbtn" id="cti-ai-close-btn" title="Close">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div id="cti-ai-messages"></div>
      <div id="cti-ai-live"></div>
      <div id="cti-ai-input-row">
        <button id="cti-ai-mic" title="Voice input">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </button>
        <textarea id="cti-ai-input" placeholder="Ask about this page…" rows="1"></textarea>
        <button id="cti-ai-send" title="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    `;

    // Floating button
    const btn = document.createElement('button');
    btn.id = 'cti-ai-btn';
    btn.title = 'CTI AI Assistant';
    btn.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12,0 C12,8 16,12 24,12 C16,12 12,16 12,24 C12,16 8,12 0,12 C8,12 12,8 12,0 Z"/></svg>';
    btn.setAttribute('aria-label', 'Open CTI AI Assistant');

    document.body.appendChild(panel);
    document.body.appendChild(btn);

    // Wire events
    btn.addEventListener('click', toggle);
    $id('cti-ai-close-btn').addEventListener('click', close);
    $id('cti-ai-clear-btn').addEventListener('click', clearConversation);
    $id('cti-ai-tts-btn').addEventListener('click', toggleTTS);
    $id('cti-ai-send').addEventListener('click', sendMessage);
    $id('cti-ai-mic').addEventListener('click', toggleMic);

    const inp = $id('cti-ai-input');
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    inp.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 80) + 'px';
    });

    // Set up voice recognition
    setupRecognition();

    // Show greeting
    appendAssistantMsg(GREETING);
  }

  // ── Panel open / close ────────────────────────────────────────────────────
  function open() {
    if (!_built) buildDOM();
    _open = true;
    const panel = $id('cti-ai-panel');
    if (panel) panel.classList.add('cti-ai-open');
    updateSubtitle();
  }

  function close() {
    _open = false;
    const panel = $id('cti-ai-panel');
    if (panel) panel.classList.remove('cti-ai-open');
    if (_listening) stopListening();
  }

  function toggle() {
    if (_open) close(); else open();
  }

  function updateSubtitle() {
    const el = $id('cti-ai-subtitle');
    if (!el) return;
    const page = window.CTI_PAGE_CONTEXT?.page;
    el.textContent = page ? 'Answering about: ' + page : 'Ask me about this page';
  }

  // ── Messages ──────────────────────────────────────────────────────────────
  function scrollToBottom() {
    const el = $id('cti-ai-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function appendUserMsg(text) {
    const el = $id('cti-ai-messages');
    if (!el) return;
    const div = document.createElement('div');
    div.className = 'cti-msg cti-msg-user';
    div.innerHTML = escAI(text);
    el.appendChild(div);
    scrollToBottom();
  }

  function appendAssistantMsg(text) {
    const el = $id('cti-ai-messages');
    if (!el) return;
    const div = document.createElement('div');
    div.className = 'cti-msg cti-msg-assistant';
    div.innerHTML = escAI(text);
    el.appendChild(div);
    scrollToBottom();
    if (_tts) speakText(text);
  }

  function showTyping() {
    removeTyping();
    const el = $id('cti-ai-messages');
    if (!el) return;
    const div = document.createElement('div');
    div.id = 'cti-ai-typing';
    div.innerHTML = '<div class="cti-dot"></div><div class="cti-dot"></div><div class="cti-dot"></div>';
    el.appendChild(div);
    scrollToBottom();
  }

  function removeTyping() {
    const el = $id('cti-ai-typing');
    if (el) el.remove();
  }

  function clearConversation() {
    _messages = [];
    const el = $id('cti-ai-messages');
    if (el) el.innerHTML = '';
    removeTyping();
    appendAssistantMsg(GREETING);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  // ── TTS ───────────────────────────────────────────────────────────────────
  function toggleTTS() {
    _tts = !_tts;
    const btn = $id('cti-ai-tts-btn');
    if (btn) {
      btn.innerHTML = _tts
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
      btn.title = _tts ? 'Voice on — click to mute' : 'Toggle voice output';
    }
    if (!_tts && window.speechSynthesis) window.speechSynthesis.cancel();
  }

  function speakText(text) {
    if (!window.speechSynthesis) return;
    if (_utterance) window.speechSynthesis.cancel();
    const clean = stripMd(text);
    _utterance = new SpeechSynthesisUtterance(clean);
    _utterance.rate = 1.0;
    _utterance.pitch = 1.0;
    window.speechSynthesis.speak(_utterance);
  }

  // ── Voice input ───────────────────────────────────────────────────────────
  let _finalTranscript = '';   // accumulated confirmed words

  function setLiveText(interim) {
    const el = $id('cti-ai-live');
    if (!el) return;
    el.textContent = _finalTranscript + (interim ? ' ' + interim : '') || 'Listening…';
  }

  function setupRecognition() {
    const SRCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const micBtn = $id('cti-ai-mic');
    if (!SRCtor) {
      if (micBtn) {
        micBtn.disabled = true;
        micBtn.title = 'Voice input not supported in this browser';
      }
      return;
    }
    _recog = new SRCtor();
    _recog.continuous     = true;   // keep recording until user clicks mic again
    _recog.interimResults = true;   // show live words as they come in
    _recog.lang = 'en-US';

    _recog.onresult = function (e) {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) _finalTranscript += t + ' ';
        else interim += t;
      }
      setLiveText(interim);
    };

    _recog.onerror = function () { stopListening(); };
    _recog.onend   = function () {
      // Browser stopped on its own (timeout) — restart if still toggled on
      if (_listening) { try { _recog.start(); } catch (_) { stopListening(); } }
    };
  }

  function toggleMic() {
    if (_listening) stopListening(); else startListening();
  }

  function startListening() {
    if (!_recog) return;
    _listening = true;
    _finalTranscript = '';
    const btn = $id('cti-ai-mic');
    if (btn) btn.classList.add('cti-mic-active');
    const live = $id('cti-ai-live');
    if (live) { live.textContent = 'Listening…'; live.style.display = 'block'; }
    try { _recog.start(); } catch (_) { stopListening(); }
  }

  function stopListening() {
    _listening = false;
    const btn = $id('cti-ai-mic');
    if (btn) btn.classList.remove('cti-mic-active');
    const live = $id('cti-ai-live');
    if (live) live.style.display = 'none';
    try { if (_recog) _recog.stop(); } catch (_) {}
    // Put finalized transcript into input and auto-send
    const text = _finalTranscript.trim();
    _finalTranscript = '';
    if (text) {
      const inp = $id('cti-ai-input');
      if (inp) { inp.value = text; inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 80) + 'px'; }
      sendMessage();
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage() {
    const inp = $id('cti-ai-input');
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;

    inp.value = '';
    inp.style.height = 'auto';

    const sendBtn = $id('cti-ai-send');
    if (sendBtn) sendBtn.disabled = true;

    // Append to history
    _messages.push({ role: 'user', content: text });
    appendUserMsg(text);
    showTyping();

    // Update subtitle in case page context changed
    updateSubtitle();

    try {
      const res = await fetch(WORKER + '/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: _messages.slice(-MAX_HISTORY),
          context:  window.CTI_PAGE_CONTEXT?.summary || '',
        }),
      });

      const data = await res.json();

      if (data.error) {
        removeTyping();
        appendAssistantMsg('Sorry, I encountered an error: ' + data.error);
        // Remove last user message from history on error
        _messages.pop();
      } else {
        const reply = data.response || '(no response)';
        _messages.push({ role: 'assistant', content: reply });
        removeTyping();
        appendAssistantMsg(reply);
        // Trim history to MAX_HISTORY pairs
        if (_messages.length > MAX_HISTORY * 2) {
          _messages = _messages.slice(-MAX_HISTORY * 2);
        }
      }
    } catch (err) {
      removeTyping();
      appendAssistantMsg('Network error: ' + err.message + '. Please check your connection.');
      _messages.pop();
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      if (inp) inp.focus();
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.CTIAssistant = {
    init:   function () { if (!_built) buildDOM(); },
    open:   open,
    close:  close,
    toggle: toggle,
  };

  // ── Nudge bubble: greeting + periodic data facts ──────────────────────────
  const NUDGE_INTERVAL = 5 * 60 * 1000; // 5 minutes

  function getNudgeText() {
    const ctx = window.CTI_PAGE_CONTEXT;
    const page = ctx?.page || '';
    const summary = ctx?.summary || '';

    // Try to extract a useful fact from the current page context
    const facts = [];

    // Extract numbers from summary lines
    const lines = summary.split('\n').filter(l => l.trim() && l.includes(':'));
    lines.forEach(line => {
      const m = line.match(/:\s*([\d,]+)/);
      if (m && +m[1].replace(/,/g,'') > 0) facts.push(line.trim());
    });

    if (facts.length > 0) {
      // Pick a random fact
      const fact = facts[Math.floor(facts.length * 0.3)]; // deterministic-ish
      return '💡 ' + fact;
    }
    if (page) return `👋 Hi! Ask me anything about ${page}.`;
    return '👋 Hi! I can answer questions about the data on this page.';
  }

  function showNudge(text) {
    if (_open) return; // don't show when chat is open
    let nudge = document.getElementById('cti-ai-nudge');
    if (!nudge) {
      nudge = document.createElement('div');
      nudge.id = 'cti-ai-nudge';
      document.body.appendChild(nudge);
    }
    nudge.textContent = text;
    nudge.classList.add('cti-nudge-show');

    // Pulse the button
    const btn = document.getElementById('cti-ai-btn');
    if (btn) {
      btn.classList.remove('cti-ai-pulse');
      void btn.offsetWidth; // reflow to restart animation
      btn.classList.add('cti-ai-pulse');
    }

    // Auto-dismiss after 6 seconds
    clearTimeout(nudge._timer);
    nudge._timer = setTimeout(() => nudge.classList.remove('cti-nudge-show'), 6000);

    // Click nudge to open chat
    nudge.onclick = () => { nudge.classList.remove('cti-nudge-show'); open(); };
  }

  function scheduleNudges() {
    // First nudge: 3 seconds after page load
    setTimeout(() => showNudge(getNudgeText()), 3000);
    // Then every 5 minutes
    setInterval(() => showNudge(getNudgeText()), NUDGE_INTERVAL);
  }

  // ── Auto-init on DOMContentLoaded ─────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      buildDOM();
      scheduleNudges();
    });
  } else {
    buildDOM();
    scheduleNudges();
  }

}());
