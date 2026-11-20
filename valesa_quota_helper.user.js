// ==UserScript==
// @name         DeepSeek 额度小助手 · Valesa
// @namespace    valesa-quota-helper
// @version      1.2.0
// @description  每次对话后提醒你还剩多少次 DeepSeek 使用机会，由 Valesa 萌宠播报
// @author       jiana2006
// @icon         data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">🐱</text></svg>
// @match        https://chat.deepseek.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  /* ================== 配置 ================== */
  const DEFAULT_TOTAL = 50;          // 默认总额度（次）
  const DEFAULT_EMOJI = '🐱';        // 默认头像（emoji，无版权风险）
  let avatarUrl = GM_getValue('valesa_avatar', '');  // 用户自定义头像（图片 URL 或 base64 data:）
  let avatarSize = GM_getValue('valesa_size', 64);   // 头像大小（px）

  let total = GM_getValue('valesa_total', DEFAULT_TOTAL);
  let used  = GM_getValue('valesa_used', 0);
  const reset = () => { used = 0; GM_setValue('valesa_used', 0); render(); speak('额度已重置啦，今天也要加油哦～'); };

  GM_registerMenuCommand('设置总次数', () => {
    const v = prompt('请输入总对话次数', total);
    if (v !== null && +v > 0) { total = +v; GM_setValue('valesa_total', total); render(); }
  });
  GM_registerMenuCommand('重置计数', reset);
  GM_registerMenuCommand('手动校正已用次数', () => {
    const v = prompt('已使用次数', used);
    if (v !== null && +v >= 0) { used = +v; GM_setValue('valesa_used', used); render(); }
  });
  GM_registerMenuCommand('设置头像（图片URL或base64）', () => {
    const v = prompt('粘贴头像图片的 URL 或 base64 data: 开头字符串\n留空则恢复默认 emoji 头像', avatarUrl);
    if (v !== null) { avatarUrl = v.trim(); GM_setValue('valesa_avatar', avatarUrl); applyAvatar(); }
  });
  GM_registerMenuCommand('恢复默认头像', () => {
    avatarUrl = ''; GM_setValue('valesa_avatar', ''); applyAvatar();
  });

  /* ================== Valesa 悬浮窗 ================== */
  const css = `
    #valesa-widget { position: fixed; right: 16px; bottom: 16px; z-index: 99999;
      display: flex; align-items: flex-end; gap: 8px; font-family: system-ui, sans-serif;
      user-select: none; }
    #valesa-widget.dragging { transition: none; }
    #valesa-widget.hidden { display: none; }
    #valesa-avatar { border-radius: 50%; border: 3px solid #9db4ff;
      box-shadow: 0 4px 14px rgba(90,110,220,.35); cursor: grab; object-fit: cover;
      transition: transform .2s; background: #fff; touch-action: none; }
    #valesa-avatar.dragging { cursor: grabbing; }
    #valesa-avatar:hover { transform: scale(1.08) rotate(-4deg); }
    #valesa-avatar.emoji { display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg,#eef2ff,#e2e9ff); }
    #valesa-tools { position: absolute; top: -14px; left: 50%; transform: translate(-50%, -100%);
      display: none; gap: 6px; background: #fff; border: 1.5px solid #b9c6ff; border-radius: 999px;
      padding: 5px 8px; box-shadow: 0 3px 10px rgba(90,110,220,.25); }
    #valesa-widget:hover #valesa-tools { display: flex; }
    #valesa-tools span { cursor: pointer; font-size: 14px; line-height: 1; padding: 2px 4px; border-radius: 6px; }
    #valesa-tools span:hover { background: #eef2ff; transform: scale(1.15); }
    #valesa-restore { position: fixed; right: 8px; bottom: 8px; z-index: 99999; width: 26px; height: 26px;
      border-radius: 50%; background: rgba(91,111,214,.25); border: 1.5px solid #9db4ff; cursor: pointer;
      display: none; align-items: center; justify-content: center; font-size: 13px; color: #5b6fd6;
      backdrop-filter: blur(2px); }
    #valesa-restore.show { display: flex; }
    #valesa-bubble { background: #fff; border: 1.5px solid #b9c6ff; border-radius: 12px 12px 3px 12px;
      padding: 8px 12px; max-width: 230px; font-size: 13px; color: #333; line-height: 1.5;
      box-shadow: 0 3px 10px rgba(90,110,220,.18); opacity: 0; transform: translateY(6px);
      transition: all .25s; pointer-events: none; }
    #valesa-bubble.show { opacity: 1; transform: translateY(0); }
    #valesa-bubble b { color: #5b6fd6; font-size: 15px; }
    #valesa-bar { height: 6px; background: #e6ebff; border-radius: 3px; margin-top: 6px; overflow: hidden; }
    #valesa-bar > div { height: 100%; background: linear-gradient(90deg,#7f9bff,#5b6fd6); border-radius: 3px; transition: width .4s; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const widget = document.createElement('div');
  widget.id = 'valesa-widget';
  widget.style.position = 'fixed';
  widget.innerHTML = `
    <div id="valesa-bubble"><span id="valesa-text"></span><div id="valesa-bar"><div id="valesa-bar-fill"></div></div></div>
    <div style="position:relative">
      <div id="valesa-avatar" title="点我开关气泡 / 按住拖动" draggable="false"></div>
      <div id="valesa-tools">
        <span id="valesa-tool-hide" title="隐藏 Valesa（点边缘小圆点唤回）">✕</span>
        <span id="valesa-tool-avatar" title="设置头像">🎨</span>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  const restoreBtn = document.createElement('div');
  restoreBtn.id = 'valesa-restore';
  restoreBtn.textContent = '🐱';
  restoreBtn.title = '唤回 Valesa';
  document.body.appendChild(restoreBtn);

  const bubble = document.getElementById('valesa-bubble');
  const textEl = document.getElementById('valesa-text');
  const fill   = document.getElementById('valesa-bar-fill');
  const avatar = document.getElementById('valesa-avatar');

  // 应用头像：优先自定义图片，否则显示 emoji
  function applyAvatar() {
    if (avatarUrl) {
      avatar.classList.remove('emoji');
      avatar.style.backgroundImage = `url("${avatarUrl.replace(/"/g, '\\"')}")`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
      avatar.textContent = '';
    } else {
      avatar.classList.add('emoji');
      avatar.style.backgroundImage = 'none';
      avatar.textContent = DEFAULT_EMOJI;
    }
  }
  // 应用头像大小
  function applySize() {
    avatar.style.width = avatarSize + 'px';
    avatar.style.height = avatarSize + 'px';
    avatar.style.fontSize = Math.round(avatarSize * 0.6) + 'px';
  }
  applyAvatar();
  applySize();

  let hideTimer = null;
  function speak(msg) {
    textEl.innerHTML = msg;
    fill.style.width = Math.max(0, (1 - used / total) * 100) + '%';
    bubble.classList.add('show');
    widget.classList.remove('hidden');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => bubble.classList.remove('show'), 6000);
  }

  function render() {
    const left = Math.max(0, total - used);
    let tone = '';
    if (left <= 0) tone = '<br>呜……额度用完了，快去充值/重置吧 🥺';
    else if (left <= 5) tone = '<br>快用完啦，省着点用哦！';
    else if (left <= 15) tone = '<br>额度过半偏多，注意节制～';
    else tone = '<br>今天状态不错，继续聊吧！';
    speak(`主人，已用 <b>${used}</b> / ${total} 次<br>还剩 <b>${left}</b> 次对话机会${tone}`);
  }

  avatar.addEventListener('click', () => {
    if (bubble.classList.contains('show')) bubble.classList.remove('show');
    else render();
  });

  /* ================== 隐藏 / 唤回 ================== */
  document.getElementById('valesa-tool-hide').addEventListener('click', e => {
    e.stopPropagation();
    widget.classList.add('hidden');
    restoreBtn.classList.add('show');
    bubble.classList.remove('show');
  });
  document.getElementById('valesa-tool-avatar').addEventListener('click', e => {
    e.stopPropagation();
    const v = prompt('粘贴头像图片的 URL 或 base64 data: 开头字符串\n留空则恢复默认 emoji 头像', avatarUrl);
    if (v !== null) { avatarUrl = v.trim(); GM_setValue('valesa_avatar', avatarUrl); applyAvatar(); }
  });
  restoreBtn.addEventListener('click', () => {
    widget.classList.remove('hidden');
    restoreBtn.classList.remove('show');
    render();
  });

  /* ================== 拖拽图片换头像 ================== */
  // 把本地图片文件直接拖到 Valesa 头像上即可换头像
  avatar.addEventListener('dragover', e => { e.preventDefault(); avatar.style.outline = '3px dashed #5b6fd6'; });
  avatar.addEventListener('dragleave', () => { avatar.style.outline = ''; });
  avatar.addEventListener('drop', e => {
    e.preventDefault();
    avatar.style.outline = '';
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file || !/^image\//.test(file.type)) { speak('只支持拖入图片文件哦～'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      avatarUrl = reader.result; // data:image/...;base64,...
      GM_setValue('valesa_avatar', avatarUrl);
      applyAvatar();
      speak('头像换好啦，很好看！✨');
    };
    reader.readAsDataURL(file);
  });

  /* ================== 滚轮缩放头像 ================== */
  avatar.addEventListener('wheel', e => {
    e.preventDefault();
    avatarSize += e.deltaY < 0 ? 4 : -4;
    avatarSize = Math.min(Math.max(24, avatarSize), 160); // 限制 24~160px
    GM_setValue('valesa_size', avatarSize);
    applySize();
  }, { passive: false });

  /* ================== 拖动 ================== */
  let dragging = false, startX = 0, startY = 0, origL = 0, origT = 0, moved = false;
  function onDragStart(e) {
    const p = e.touches ? e.touches[0] : e;
    dragging = true; moved = false;
    startX = p.clientX; startY = p.clientY;
    const r = widget.getBoundingClientRect();
    origL = r.left; origT = r.top;
    widget.classList.add('dragging');
    avatar.classList.add('dragging');
  }
  function onDragMove(e) {
    if (!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - startX, dy = p.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
    if (!moved) return;
    e.preventDefault();
    // 转为 left/top 定位
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
    const w = widget.offsetWidth, h = widget.offsetHeight;
    const nl = Math.min(Math.max(0, origL + dx), window.innerWidth - w);
    const nt = Math.min(Math.max(0, origT + dy), window.innerHeight - h);
    widget.style.left = nl + 'px';
    widget.style.top = nt + 'px';
  }
  function onDragEnd() {
    if (!dragging) return;
    dragging = false;
    widget.classList.remove('dragging');
    avatar.classList.remove('dragging');
    if (!moved) return; // 未移动视为点击，交给 click
  }
  avatar.addEventListener('mousedown', onDragStart);
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
  avatar.addEventListener('touchstart', onDragStart, { passive: false });
  document.addEventListener('touchmove', onDragMove, { passive: false });
  document.addEventListener('touchend', onDragEnd);

  /* ================== 监听发送 ================== */
  // 拦截回车 / 发送按钮点击，判定为一次新对话
  let lastSend = 0;
  function markSend() {
    const now = Date.now();
    if (now - lastSend < 1500) return; // 防抖
    lastSend = now;
    setTimeout(() => {
      used += 1;
      GM_setValue('valesa_used', used);
      render();
    }, 800);
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      const box = e.target.closest('textarea, [contenteditable="true"]');
      if (box) markSend();
    }
  }, true);
  document.addEventListener('click', e => {
    // DeepSeek 发送按钮（按 aria-label / SVG 按钮兜底匹配）
    const btn = e.target.closest('div[role="button"], button');
    if (btn && /send|发送/i.test((btn.getAttribute('aria-label') || '') + (btn.textContent || ''))) markSend();
  }, true);
})();
