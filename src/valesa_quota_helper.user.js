// ==UserScript==
// @name         DeepSeek 额度小助手 · Valesa
// @namespace    valesa-quota-helper
// @version      2.1.0
// @description  每次对话后提醒你还剩多少次 DeepSeek 使用机会；萌宠带物理引擎、台词气泡、自定义头像与大小
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

  const DEFAULT_TIPS = ['喵喵喵~', '今天也要加油聊天哦！', '点我干嘛？(｡･ω･｡)', '还剩几次机会，心里有数嘛？'];
  let tips = JSON.parse(GM_getValue('valesa_tips', JSON.stringify(DEFAULT_TIPS)));
  let tipIndex = parseInt(GM_getValue('valesa_tipIndex', '0'), 10) || 0;

  const reset = () => { used = 0; GM_setValue('valesa_used', 0); showBubble('额度已重置啦，今天也要加油哦～'); };

  GM_registerMenuCommand('设置总次数', () => {
    const v = prompt('请输入总对话次数', total);
    if (v !== null && +v > 0) { total = +v; GM_setValue('valesa_total', total); showQuota(); }
  });
  GM_registerMenuCommand('重置计数', reset);
  GM_registerMenuCommand('手动校正已用次数', () => {
    const v = prompt('已使用次数', used);
    if (v !== null && +v >= 0) { used = +v; GM_setValue('valesa_used', used); showQuota(); }
  });
  GM_registerMenuCommand('恢复默认头像', () => {
    avatarUrl = ''; GM_setValue('valesa_avatar', ''); applyAvatar();
  });

  /* ================== 样式 ================== */
  const css = `
    #valesa-pet { position: fixed; left: 0; top: 0; z-index: 99999; user-select: none;
      will-change: transform; }
    #valesa-avatar { border-radius: 50%; border: 3px solid #9db4ff;
      box-shadow: 0 4px 14px rgba(90,110,220,.35); cursor: grab; object-fit: cover;
      background: #fff; display: flex; align-items: center; justify-content: center;
      background-size: cover; background-position: center; touch-action: none; }
    #valesa-avatar.dragging { cursor: grabbing; }
    #valesa-avatar.emoji { background-image: none;
      background: linear-gradient(135deg,#eef2ff,#e2e9ff); }
    #valesa-bubble { position: absolute; bottom: 100%; left: 50%; transform: translate(-50%, -8px);
      background: #fff; border: 1.5px solid #b9c6ff; border-radius: 12px 12px 3px 12px;
      padding: 8px 12px; max-width: 240px; font-size: 13px; color: #333; line-height: 1.5;
      box-shadow: 0 3px 10px rgba(90,110,220,.18); opacity: 0; pointer-events: none;
      transition: opacity .25s, transform .25s; white-space: nowrap; }
    #valesa-bubble.show { opacity: 1; transform: translate(-50%, -12px); }
    #valesa-bubble b { color: #5b6fd6; font-size: 15px; }
    #valesa-bar { height: 6px; background: #e6ebff; border-radius: 3px; margin-top: 6px; overflow: hidden; }
    #valesa-bar > div { height: 100%; background: linear-gradient(90deg,#7f9bff,#5b6fd6); border-radius: 3px; transition: width .4s; }
    #valesa-controls { position: absolute; top: -8px; right: -8px; display: flex; gap: 4px;
      opacity: 0; transition: opacity .2s; }
    #valesa-pet:hover #valesa-controls { opacity: 1; }
    #valesa-controls button { width: 22px; height: 22px; border-radius: 50%; border: none;
      background: #fff; color: #5b6fd6; font-size: 12px; cursor: pointer; line-height: 1;
      box-shadow: 0 2px 6px rgba(90,110,220,.35); display: flex; align-items: center; justify-content: center; }
    #valesa-controls button:hover { background: #eef2ff; transform: scale(1.15); }
    #valesa-recall { position: fixed; right: 8px; bottom: 8px; z-index: 99999; width: 30px; height: 30px;
      border-radius: 50%; background: rgba(91,111,214,.25); border: 1.5px solid #9db4ff; cursor: pointer;
      display: none; align-items: center; justify-content: center; font-size: 16px; color: #5b6fd6;
      backdrop-filter: blur(2px); }
    #valesa-recall.show { display: flex; }
    #valesa-modal { position: fixed; inset: 0; z-index: 100000; background: rgba(0,0,0,.4);
      display: none; align-items: center; justify-content: center; }
    #valesa-modal.show { display: flex; }
    #valesa-modal .box { background: #fff; border-radius: 14px; padding: 20px; width: 320px;
      font-family: system-ui, sans-serif; box-shadow: 0 10px 40px rgba(0,0,0,.2); }
    #valesa-modal h3 { margin: 0 0 14px; color: #5b6fd6; font-size: 16px; }
    #valesa-modal label { font-size: 13px; color: #666; display: block; margin-bottom: 6px; }
    #valesa-modal input[type=range] { width: 100%; }
    #valesa-tips-list { max-height: 160px; overflow-y: auto; margin: 12px 0; }
    .tip-item { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
    .tip-item input { flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 5px 8px; font-size: 13px; }
    .tip-item .del { cursor: pointer; color: #e05252; border: none; background: none; font-size: 16px; }
    #valesa-modal .actions { display: flex; gap: 8px; justify-content: flex-end; }
    #valesa-modal .actions button { padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; }
    #valesa-add-tip { color: #5b6fd6; background: none; border: none; cursor: pointer; font-size: 13px; padding: 4px 0; }
    #valesa-save { background: #5b6fd6; color: #fff; }
    #valesa-cancel { background: #f0f0f0; color: #666; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ================== DOM 结构 ================== */
  const pet = document.createElement('div');
  pet.id = 'valesa-pet';
  pet.innerHTML = `
    <div id="valesa-bubble"><span id="valesa-text"></span><div id="valesa-bar"><div id="valesa-bar-fill"></div></div></div>
    <div id="valesa-avatar" draggable="false"></div>
    <div id="valesa-controls">
      <button id="valesa-hide" title="隐藏">✕</button>
      <button id="valesa-settings" title="设置">⚙️</button>
      <button id="valesa-change" title="换角色">🎨</button>
    </div>
  `;
  document.body.appendChild(pet);

  const recall = document.createElement('div');
  recall.id = 'valesa-recall';
  recall.textContent = '🐱';
  recall.title = '召唤 Valesa';
  document.body.appendChild(recall);

  const bubble = document.getElementById('valesa-bubble');
  const textEl = document.getElementById('valesa-text');
  const fill = document.getElementById('valesa-bar-fill');
  const avatar = document.getElementById('valesa-avatar');

  /* ================== 头像 / 大小 ================== */
  function applyAvatar() {
    if (avatarUrl) {
      avatar.classList.remove('emoji');
      avatar.style.backgroundImage = `url("${avatarUrl.replace(/"/g, '\\"')}")`;
      avatar.textContent = '';
    } else {
      avatar.classList.add('emoji');
      avatar.style.backgroundImage = 'none';
      avatar.textContent = DEFAULT_EMOJI;
    }
  }
  function applySize() {
    avatar.style.width = avatarSize + 'px';
    avatar.style.height = avatarSize + 'px';
    avatar.style.fontSize = Math.round(avatarSize * 0.6) + 'px';
  }
  applyAvatar();
  applySize();

  /* ================== 音效 ================== */
  let audioCtx = null;
  function playPop() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'sine'; o.frequency.value = 600;
      g.gain.setValueAtTime(0.15, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      o.start(); o.stop(audioCtx.currentTime + 0.12);
    } catch (e) {}
  }

  /* ================== 气泡 ================== */
  let bubbleTimer = null;
  function showBubble(html) {
    textEl.innerHTML = html;
    fill.style.width = Math.max(0, (1 - used / total) * 100) + '%';
    // 强制重触发动画：先移除再添加，保证连点也有反馈
    bubble.classList.remove('show');
    void bubble.offsetWidth; // 强制回流，重启动画
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => {
      bubble.classList.remove('show');
      lastClickWasQuota = false; // 气泡消失后重置：下次点击先弹剩余次数
    }, 3000);
  }
  function showQuota() {
    const left = Math.max(0, total - used);
    let tone = '';
    if (left <= 0) tone = '<br>呜……额度用完了，快去充值/重置吧 🥺';
    else if (left <= 5) tone = '<br>快用完啦，省着点用哦！';
    else if (left <= 15) tone = '<br>额度过半偏多，注意节制～';
    else tone = '<br>今天状态不错，继续聊吧！';
    showBubble(`主人，已用 <b>${used}</b> / ${total} 次<br>还剩 <b>${left}</b> 次对话机会${tone}`);
  }
  function nextTip() {
    if (!tips.length) return '点我干嘛？';
    const t = tips[tipIndex];
    tipIndex = (tipIndex + 1) % tips.length;
    GM_setValue('valesa_tipIndex', tipIndex);
    return t;
  }

  /* ================== 物理引擎（惯性 + 碰撞反弹） ================== */
  let posX = parseInt(GM_getValue('valesa_posX', '20'), 10) || 20;
  let posY = parseInt(GM_getValue('valesa_posY', String(window.innerHeight - avatarSize - 20)), 10);
  let velX = 0, velY = 0;
  let isDragging = false, animating = false;
  const friction = 0.96, bounce = 0.72;

  function updatePhysics() {
    if (isDragging) return;
    velX *= friction; velY *= friction;
    posX += velX; posY += velY;
    const w = avatarSize, h = avatarSize;
    const winW = window.innerWidth, winH = window.innerHeight;
    if (posX < 0) { posX = 0; velX *= -bounce; playPop(); }
    if (posX > winW - w) { posX = winW - w; velX *= -bounce; playPop(); }
    if (posY < 0) { posY = 0; velY *= -bounce; playPop(); }
    if (posY > winH - h) { posY = winH - h; velY *= -bounce; playPop(); }
    pet.style.transform = `translate(${posX}px, ${posY}px)`;
    if (Math.abs(velX) > 0.1 || Math.abs(velY) > 0.1) {
      requestAnimationFrame(updatePhysics);
    } else {
      animating = false;
      GM_setValue('valesa_posX', Math.round(posX));
      GM_setValue('valesa_posY', Math.round(posY));
    }
  }
  pet.style.transform = `translate(${posX}px, ${posY}px)`;

  let dragStartX = 0, dragStartY = 0, lastX = 0, lastY = 0, dragT0 = 0;
  let downX = 0, downY = 0; // 按下初始位置，用于判定"是否移动过"
  let lastClickWasQuota = false; // 上次点击是否弹的额度（实现交替：额度 ↔ 台词）
  function onDown(e) {
    if (e.target.closest('#valesa-controls')) return;
    const p = e.touches ? e.touches[0] : e;
    isDragging = true; animating = false;
    dragT0 = Date.now();
    dragStartX = p.clientX - posX; dragStartY = p.clientY - posY;
    lastX = p.clientX; lastY = p.clientY;
    downX = p.clientX; downY = p.clientY;
    avatar.classList.add('dragging');
  }
  function onMove(e) {
    if (!isDragging) return;
    const p = e.touches ? e.touches[0] : e;
    e.preventDefault();
    posX = p.clientX - dragStartX; posY = p.clientY - dragStartY;
    velX = p.clientX - lastX; velY = p.clientY - lastY;
    lastX = p.clientX; lastY = p.clientY;
    pet.style.transform = `translate(${posX}px, ${posY}px)`;
  }
  function onUp(e) {
    if (!isDragging) return;
    isDragging = false;
    avatar.classList.remove('dragging');
    const p = e.changedTouches ? e.changedTouches[0] : e;
    const dur = Date.now() - dragT0;
    const movedDist = Math.hypot(p.clientX - downX, p.clientY - downY);
    if (dur < 300 && movedDist < 6) {
      // 点击 → 交替弹：剩余次数 ↔ 用户自定义台词
      velX = 0; velY = 0;
      if (!lastClickWasQuota) {
        showQuota();
        lastClickWasQuota = true;
      } else {
        showBubble(nextTip());
        lastClickWasQuota = false;
      }
      playPop();
      avatar.style.transform = 'scale(0.85)';
      setTimeout(() => avatar.style.transform = 'scale(1)', 150);
    } else {
      // 拖拽抛出 → 物理反弹
      animating = true;
      requestAnimationFrame(updatePhysics);
    }
  }
  avatar.addEventListener('mousedown', onDown);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  avatar.addEventListener('touchstart', onDown, { passive: false });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onUp);

  /* ================== 控制按钮 ================== */
  document.getElementById('valesa-hide').addEventListener('click', e => {
    e.stopPropagation();
    pet.style.display = 'none';
    GM_setValue('valesa_hidden', '1');
    recall.classList.add('show');
  });
  document.getElementById('valesa-change').addEventListener('click', e => {
    e.stopPropagation();
    const v = prompt('粘贴头像图片 URL 或 base64（data:image/...）：\n也可直接拖图片文件到 Valesa 身上换头像\n留空则恢复默认 emoji', avatarUrl);
    if (v !== null) { avatarUrl = v.trim(); GM_setValue('valesa_avatar', avatarUrl); applyAvatar(); }
  });
  recall.addEventListener('click', () => {
    pet.style.display = '';
    recall.classList.remove('show');
    GM_setValue('valesa_hidden', '0');
    showQuota();
  });
  if (GM_getValue('valesa_hidden', '0') === '1') {
    pet.style.display = 'none';
    recall.classList.add('show');
  }

  /* ================== 拖图片换头像（全页面可放置） ================== */
  // DeepSeek 页面会拦截拖放，这里在 document 级接管：拖图片到页面任何位置都能换头像
  let dragDepth = 0;
  document.addEventListener('dragenter', e => {
    if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
      dragDepth++;
      avatar.style.outline = '3px dashed #5b6fd6';
      avatar.style.outlineOffset = '3px';
    }
  });
  document.addEventListener('dragleave', () => {
    if (--dragDepth <= 0) { dragDepth = 0; avatar.style.outline = ''; }
  });
  document.addEventListener('dragover', e => {
    if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault();
  });
  document.addEventListener('drop', e => {
    dragDepth = 0;
    avatar.style.outline = '';
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f || !/^image\//.test(f.type)) return; // 非图片：交给页面默认行为
    e.preventDefault();
    e.stopPropagation();
    const r = new FileReader();
    r.onload = () => { avatarUrl = r.result; GM_setValue('valesa_avatar', avatarUrl); applyAvatar(); showBubble('头像换好啦，很好看！✨'); playPop(); };
    r.readAsDataURL(f);
  }, true);

  /* ================== 滚轮缩放 ================== */
  avatar.addEventListener('wheel', e => {
    e.preventDefault();
    avatarSize += e.deltaY < 0 ? 4 : -4;
    avatarSize = Math.min(Math.max(24, avatarSize), 160);
    GM_setValue('valesa_size', avatarSize);
    applySize();
  }, { passive: false });

  /* ================== 设置弹窗 ================== */
  const modal = document.createElement('div');
  modal.id = 'valesa-modal';
  modal.innerHTML = `
    <div class="box">
      <h3>⚙️ Valesa 设置</h3>
      <label>大小调整（px）：<span id="valesa-size-val">${avatarSize}</span></label>
      <input type="range" id="valesa-size-range" min="24" max="160" step="4" value="${avatarSize}">
      <div style="font-size:12px;color:#999;margin-top:6px">台词列表（点击时轮流弹出）：</div>
      <div id="valesa-tips-list"></div>
      <button id="valesa-add-tip">+ 添加台词</button>
      <div class="actions">
        <button id="valesa-cancel">取消</button>
        <button id="valesa-save">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  function renderTipsList() {
    const list = modal.querySelector('#valesa-tips-list');
    list.innerHTML = '';
    tips.forEach(t => {
      const item = document.createElement('div');
      item.className = 'tip-item';
      item.innerHTML = `<input type="text" value="${t.replace(/"/g, '&quot;')}"><button class="del">×</button>`;
      item.querySelector('.del').onclick = () => { item.remove(); };
      list.appendChild(item);
    });
  }
  document.getElementById('valesa-settings').addEventListener('click', e => {
    e.stopPropagation();
    modal.querySelector('#valesa-size-range').value = avatarSize;
    modal.querySelector('#valesa-size-val').textContent = avatarSize;
    renderTipsList();
    modal.classList.add('show');
  });
  modal.querySelector('#valesa-size-range').addEventListener('input', e => {
    modal.querySelector('#valesa-size-val').textContent = e.target.value;
  });
  modal.querySelector('#valesa-add-tip').addEventListener('click', () => {
    const list = modal.querySelector('#valesa-tips-list');
    const item = document.createElement('div');
    item.className = 'tip-item';
    item.innerHTML = `<input type="text" placeholder="编辑内容..."><button class="del">×</button>`;
    item.querySelector('.del').onclick = () => item.remove();
    list.appendChild(item);
    list.scrollTop = list.scrollHeight;
  });
  modal.querySelector('#valesa-cancel').onclick = () => modal.classList.remove('show');
  modal.onclick = e => { if (e.target === modal) modal.classList.remove('show'); };
  modal.querySelector('#valesa-save').onclick = () => {
    const inputs = modal.querySelectorAll('.tip-item input');
    const arr = Array.from(inputs).map(i => i.value.trim()).filter(v => v);
    tips = arr.length ? arr : DEFAULT_TIPS;
    tipIndex = 0;
    GM_setValue('valesa_tips', JSON.stringify(tips));
    GM_setValue('valesa_tipIndex', 0);
    avatarSize = +modal.querySelector('#valesa-size-range').value;
    GM_setValue('valesa_size', avatarSize);
    applySize();
    modal.classList.remove('show');
    showBubble('设置保存好啦～');
  };

  /* ================== 监听发送（额度计数 + 生成结束提醒） ================== */
  let lastSend = 0;
  function markSend() {
    const now = Date.now();
    if (now - lastSend < 1500) return;
    lastSend = now;
    setTimeout(() => {
      used += 1;
      GM_setValue('valesa_used', used);
      showQuota(); // 发送后立即提醒一次
      watchGeneration();
    }, 800);
  }

  // 监测 AI 是否在生成中：发送后开始轮询，生成结束（状态从true变false）时再次提醒剩余次数
  let wasGenerating = false;
  let watchTimer = null;
  function isGenerating() {
    // 线索1：输入框被禁用
    const ta = document.querySelector('textarea');
    if (ta && ta.disabled) return true;
    // 线索2：存在"停止生成"按钮（多种常见命名兜底）
    if (document.querySelector('[class*="stop" i][class*="button" i], [class*="stopButton"], [aria-label*="停止"], [aria-label*="Stop" i], [aria-label*="stop" i]')) return true;
    return false;
  }
  function watchGeneration() {
    if (watchTimer) return;
    watchTimer = setInterval(() => {
      const gen = isGenerating();
      if (gen) {
        wasGenerating = true;
      } else if (wasGenerating) {
        // 生成刚结束
        clearInterval(watchTimer);
        watchTimer = null;
        wasGenerating = false;
        setTimeout(showQuota, 500);
      }
    }, 600);
    // 最长观察 10 分钟，防止状态判断失效导致无限轮询
    setTimeout(() => { if (watchTimer) { clearInterval(watchTimer); watchTimer = null; wasGenerating = false; } }, 600000);
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      const box = e.target.closest('textarea, [contenteditable="true"]');
      if (box) markSend();
    }
  }, true);
  document.addEventListener('click', e => {
    const btn = e.target.closest('div[role="button"], button');
    if (btn && /send|发送/i.test((btn.getAttribute('aria-label') || '') + (btn.textContent || ''))) markSend();
  }, true);
})();
