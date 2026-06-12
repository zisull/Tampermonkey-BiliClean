// ==UserScript==
// @name         B站清理工具
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @date         2025-07-17
// @description  B站清理工具,一键清理B站私信,点赞,回复,系统通知等功能。
// @author       zisull@qq.com
// @match        *://*.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @updateURL    https://raw.githubusercontent.com/zisull/Tampermonkey-BiliClean/main/src/biliclean.js
// @downloadURL  https://raw.githubusercontent.com/zisull/Tampermonkey-BiliClean/main/src/biliclean.js
// @license      GNU GPLv3
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // --------- 可配置常量 ---------
  const DONATE_QR_URL = 'https://raw.githubusercontent.com/zisull/Tampermonkey-BiliClean/main/img/zsm.jpg';

  // --------- 日志工具 ---------
  function log(msg) {
    const logArea = document.getElementById('bili-debug-log');
    if (logArea) {
      logArea.value += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
      logArea.scrollTop = logArea.scrollHeight;
    }
  }

  // --------- 公共工具函数 ---------
  function getCsrf() {
    return document.cookie.match(/bili_jct=([0-9a-zA-Z]+)/)?.[1] || '';
  }

  async function biliPost(url, params, isJson, retries) {
    retries = retries || 3;
    const csrf = getCsrf();
    if (!csrf) {
      log('未找到CSRF令牌，可能未登录');
      return { ok: false, msg: '未找到CSRF令牌' };
    }
    const body = isJson ? JSON.stringify({ ...params, csrf }) : `${params}&csrf_token=${csrf}&csrf=${csrf}`;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const text = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': isJson ? 'application/json' : 'application/x-www-form-urlencoded; charset=UTF-8',
            'Referer': 'https://www.bilibili.com/'
          },
          body
        }).then(r => r.text());
        const json = JSON.parse(text);
        if (json.code === -412) {
          const wait = Math.min(5000 * Math.pow(2, attempt), 30000);
          log(`触发频率限制(-412)，${wait / 1000}秒后重试(${attempt + 1}/${retries})`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        return { ok: json.code === 0, msg: json.message || '' };
      } catch (e) {
        return { ok: false, msg: '请求异常: ' + e };
      }
    }
    return { ok: false, msg: '重试次数已用完' };
  }

  async function biliGet(url, retries) {
    retries = retries || 3;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(url, { credentials: 'include' }).then(r => r.json());
        if (res.code === -412) {
          const wait = Math.min(5000 * Math.pow(2, attempt), 30000);
          log(`触发频率限制(-412)，${wait / 1000}秒后重试(${attempt + 1}/${retries})`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        return res;
      } catch (e) {
        log('请求异常: ' + e);
        return null;
      }
    }
    log('重试次数已用完');
    return null;
  }

  // --------- 樱花悬浮可拖动按钮 ---------
  const floatBtn = document.createElement('div');
  floatBtn.id = 'bili-float-btn';
  floatBtn.innerHTML = `
      <svg width="42" height="42" viewBox="0 0 48 48" fill="none" style="filter:drop-shadow(0 2px 6px var(--bili-sakura-glow,rgba(253,164,175,.5)));transition:filter .3s">
        <g transform="translate(24,22)">
          <g opacity=".9">
            <g>
              <animateTransform attributeName="transform" type="rotate" values="0;360" dur="8s" repeatCount="indefinite"/>
              <path d="M0,-10 C3,-8 3,-4 0,-2 C-3,-4 -3,-8 0,-10 Z" fill="var(--bili-sakura-petal,#fda4af)"/>
              <path d="M0,-10 C3,-8 3,-4 0,-2 C-3,-4 -3,-8 0,-10 Z" fill="var(--bili-sakura-petal,#fda4af)" transform="rotate(72)"/>
              <path d="M0,-10 C3,-8 3,-4 0,-2 C-3,-4 -3,-8 0,-10 Z" fill="var(--bili-sakura-petal,#fda4af)" transform="rotate(144)"/>
              <path d="M0,-10 C3,-8 3,-4 0,-2 C-3,-4 -3,-8 0,-10 Z" fill="var(--bili-sakura-petal,#fda4af)" transform="rotate(216)"/>
              <path d="M0,-10 C3,-8 3,-4 0,-2 C-3,-4 -3,-8 0,-10 Z" fill="var(--bili-sakura-petal,#fda4af)" transform="rotate(288)"/>
            </g>
            <circle cx="0" cy="0" r="2" fill="var(--bili-sakura-center,#f43f5e)" opacity=".6"/>
          </g>
          <circle cx="8" cy="10" r="1.5" fill="var(--bili-sakura-petal,#fda4af)" opacity=".4">
            <animate attributeName="opacity" values=".4;.1;.4" dur="3s" repeatCount="indefinite"/>
            <animateTransform attributeName="transform" type="translate" values="0,0;3,6;0,0" dur="3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="-6" cy="12" r="1" fill="var(--bili-sakura-petal,#fda4af)" opacity=".3">
            <animate attributeName="opacity" values=".3;.1;.3" dur="3.5s" begin=".5s" repeatCount="indefinite"/>
            <animateTransform attributeName="transform" type="translate" values="0,0;-2,8;0,0" dur="3.5s" begin=".5s" repeatCount="indefinite"/>
          </circle>
        </g>
      </svg>
    `;
  document.body.appendChild(floatBtn);
  let dragging = false, dragStartX = 0, dragStartY = 0, isDragged = false, offsetX = 0, offsetY = 0;

  function onBtnDragMove(e) {
    if (!dragging) return;
    floatBtn.style.left = (e.clientX - offsetX) + 'px';
    floatBtn.style.top = (e.clientY - offsetY) + 'px';
  }

  function onBtnDragEnd() {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onBtnDragMove);
    document.removeEventListener('mouseup', onBtnDragEnd);

    const moved = Math.abs(floatBtn.offsetLeft - dragStartX) + Math.abs(floatBtn.offsetTop - dragStartY);
    if (moved > 5) isDragged = true;

    const winW = window.innerWidth, winH = window.innerHeight;
    const btnW = floatBtn.offsetWidth, btnH = floatBtn.offsetHeight;
    const left = Math.max(0, Math.min(floatBtn.offsetLeft, winW - btnW));
    const top = Math.max(0, Math.min(floatBtn.offsetTop, winH - btnH));

    floatBtn.style.transition = 'left 0.3s cubic-bezier(.5,1.8,.5,1), top 0.3s cubic-bezier(.5,1.8,.5,1)';
    floatBtn.style.left = left + 'px';
    floatBtn.style.top = top + 'px';

    if (menuVisible) {
      setTimeout(() => updateMenuPosition(), 300);
    }
  }

  floatBtn.addEventListener('mousedown', function (e) {
    dragging = true;
    isDragged = false;
    dragStartX = floatBtn.offsetLeft;
    dragStartY = floatBtn.offsetTop;
    offsetX = e.clientX - floatBtn.offsetLeft;
    offsetY = e.clientY - floatBtn.offsetTop;
    document.body.style.userSelect = 'none';
    floatBtn.style.transition = 'none';
    document.addEventListener('mousemove', onBtnDragMove);
    document.addEventListener('mouseup', onBtnDragEnd);
  });
  floatBtn.style.position = 'fixed';
  floatBtn.style.right = '20px';
  floatBtn.style.bottom = '20px';
  floatBtn.style.width = '42px';
  floatBtn.style.height = '42px';
  floatBtn.style.zIndex = '100000';
  floatBtn.style.cursor = 'grab';
  floatBtn.style.display = 'flex';
  floatBtn.style.alignItems = 'center';
  floatBtn.style.justifyContent = 'center';
  floatBtn.style.background = 'none';
  floatBtn.style.transition = 'transform 0.3s cubic-bezier(.34,1.56,.64,1), filter 0.3s';
  floatBtn.style.animation = 'biliFloat 3s ease-in-out infinite';
  floatBtn.onmouseenter = () => {
    floatBtn.style.animation = 'none';
    floatBtn.style.transform = 'scale(1.18) rotate(-8deg)';
    floatBtn.style.filter = 'brightness(1.15) saturate(1.3)';
    const svg = floatBtn.querySelector('svg');
    if (svg) {
      svg.style.filter = `drop-shadow(0 4px 12px ${getComputedStyle(floatBtn).getPropertyValue('--bili-sakura-glow') || 'rgba(253,164,175,.7)'})`;
      svg.unpauseAnimations();
    }
  };
  floatBtn.onmouseleave = () => {
    floatBtn.style.transform = '';
    floatBtn.style.filter = '';
    floatBtn.style.animation = 'biliFloat 3s ease-in-out infinite';
    const svg = floatBtn.querySelector('svg');
    if (svg) svg.style.filter = '';
  };

  // --------- 动态美观悬停弹出菜单 ---------
  const menu = document.createElement('div');
  menu.id = 'bili-float-menu';
  menu.innerHTML = `
      <div class="bili-float-menu-item" data-win="clean"><span>🧹</span> 清理窗口</div>
      <div class="bili-float-menu-item" data-win="settings"><span>⚙️</span> 自动设置</div>
      <div class="bili-float-menu-item" data-win="debug"><span>💻</span> 调试日志</div>
      <div class="bili-float-menu-item" data-win="author"><span>🏠</span> 作者主页</div>
      <div class="bili-float-menu-item" data-win="donate"><span>🎁</span> 赞赏作者</div>
    `;
  document.body.appendChild(menu);
  menu.style.display = 'none';

  // 菜单位置计算函数
  function updateMenuPosition() {
    // 先显示菜单以获取准确的尺寸（包括主题栏）
    const wasHidden = menu.style.display === 'none';
    if (wasHidden) {
      menu.style.display = 'block';
      menu.style.visibility = 'hidden'; // 临时隐藏但保持布局
    }

    const btnRect = floatBtn.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const centerX = winW / 2;

    // 恢复菜单状态
    if (wasHidden) {
      menu.style.display = 'none';
      menu.style.visibility = 'visible';
    }

    // 计算按钮中心点
    const btnCenterX = btnRect.left + btnRect.width / 2;

    // 判断按钮相对于屏幕中心的位置
    const isLeft = btnCenterX < centerX;

    let left, top;
    const offset = 50; // 增加菜单与按钮的间距，确保完全不重叠

    if (isLeft) {
      // 按钮在左侧，菜单显示在右侧
      left = btnRect.right + offset;
    } else {
      // 按钮在右侧，菜单显示在左侧
      left = btnRect.left - menuRect.width - offset;
    }

    // 优化的垂直定位逻辑：确保菜单完全显示且与按钮对齐（包含主题栏高度）
    const btnCenterY = btnRect.top + btnRect.height / 2;
    const centerY = winH / 2;
    const safeMargin = 20; // 增加安全边距
    const themeBarHeight = 50; // 主题栏预估高度
    const totalMenuHeight = menuRect.height + themeBarHeight; // 菜单总高度

    if (btnCenterY < centerY) {
      // 按钮在屏幕上半部分，菜单顶部与按钮顶部对齐
      top = btnRect.top;
      // 检查是否会超出底部（考虑主题栏高度）
      if (top + totalMenuHeight > winH - safeMargin) {
        top = winH - totalMenuHeight - safeMargin;
      }
    } else {
      // 按钮在屏幕下半部分，菜单底部与按钮底部对齐
      top = btnRect.bottom - totalMenuHeight;
      // 检查是否会超出顶部
      if (top < safeMargin) {
        top = safeMargin;
      }
    }

    // 水平边界检查
    left = Math.max(safeMargin, Math.min(left, winW - menuRect.width - safeMargin));

    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.right = 'auto';
    menu.style.bottom = 'auto';
  }

  // 点击切换菜单显示/隐藏
  let menuVisible = false;
  floatBtn.addEventListener('click', (e) => {
    if (isDragged) { isDragged = false; return; }

    e.stopPropagation();
    menuVisible = !menuVisible;

    if (menuVisible) {
      menu.style.display = 'block';
      updateMenuPosition();
      menu.classList.add('bili-menu-animate-in');
      // 添加打开时的震动反馈
      floatBtn.style.animation = 'biliButtonPulse 0.3s ease-out';
      setTimeout(() => floatBtn.style.animation = '', 300);
    } else {
      menu.style.display = 'none';
      menu.classList.remove('bili-menu-animate-in');
    }
  });

  // 点击页面其他地方关闭菜单
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !floatBtn.contains(e.target)) {
      menuVisible = false;
      menu.style.display = 'none';
    }
  });

  // 窗口大小改变时更新菜单位置
  window.addEventListener('resize', () => {
    if (menuVisible && menu.style.display === 'block') {
      updateMenuPosition();
    }
  });

  menu.style.position = 'fixed';
  menu.style.zIndex = '100001';
  menu.style.background = 'rgba(255,255,255,0.98)';
  menu.style.borderRadius = '18px';
  menu.style.boxShadow = '0 6px 32px #a18cd144, 0 1.5px 8px #fff8';
  menu.style.padding = '12px 0';
  menu.style.minWidth = '120px';
  menu.style.fontFamily = 'Microsoft Yahei,Arial,sans-serif';
  menu.style.userSelect = 'none';
  menu.style.backdropFilter = 'blur(6px)';
  Array.from(menu.children).forEach((item, i) => {
    item.style.padding = '12px 28px';
    item.style.cursor = 'pointer';
    item.style.fontSize = '1.08rem';
    item.style.borderRadius = '12px';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '10px';
    item.style.transition = 'background 0.18s, transform 0.18s';
    item.onmouseenter = () => {
      item.style.background = 'linear-gradient(135deg, #f3e6ff 0%, #e8d5ff 100%)';
      item.style.transform = 'translateX(4px) scale(1.06)';
      item.style.boxShadow = '0 4px 12px rgba(161, 140, 209, 0.3)';
      item.style.borderRadius = '12px';
    };
    item.onmouseleave = () => {
      item.style.background = '';
      item.style.transform = '';
      item.style.boxShadow = '';
      item.style.borderRadius = '12px';
    };
    item.style.animation = `biliMenuPop 0.3s cubic-bezier(.5,1.8,.5,1) ${i * 0.06}s both`;
  });

  // --------- 3D立体清理窗口 ---------
  const cleanWin = document.createElement('div');
  cleanWin.id = 'bili-clean-panel';

  // 添加拖拽功能变量
  let cleanWinDragging = false, cleanWinOffsetX = 0, cleanWinOffsetY = 0;
  cleanWin.innerHTML = `
      <div class="bili-clean-title bili-clean-drag-handle">B站清理工具</div>
      <div class="bili-clean-sub bili-clean-toggle">一键清理，焕然一新</div>
      <div class="bili-clean-options">
        <div class="bili-clean-row">
          <label><input type="checkbox" id="clean-reply"> 回复</label>
          <label><input type="checkbox" id="clean-like"> 赞我</label>
          <label><input type="checkbox" id="clean-at"> 艾特</label>
        </div>
        <div class="bili-clean-row">
          <label><input type="checkbox" id="clean-pm"> 私信</label>
          <label><input type="checkbox" id="clean-history"> 历史</label>
          <label><input type="checkbox" id="clean-system"> 系统</label>
        </div>
      </div>
      <button class="bili-clean-btn" id="bili-clean-start"><span class="bili-btn-glow"></span><span class="bili-btn-text">开始清理</span></button>
      <div class="bili-clean-table">
        <div class="bili-clean-thead"><span>项目</span><span>状态</span><span>结果</span></div>
        <div class="bili-clean-tbody">
          <div><span>回复</span><span id="clean-status-reply"></span><span id="clean-res-reply"></span></div>
          <div><span>赞我</span><span id="clean-status-like"></span><span id="clean-res-like"></span></div>
          <div><span>艾特</span><span id="clean-status-at"></span><span id="clean-res-at"></span></div>
          <div><span>私信</span><span id="clean-status-pm"></span><span id="clean-res-pm"></span></div>
          <div><span>历史</span><span id="clean-status-history"></span><span id="clean-res-history"></span></div>
          <div><span>系统</span><span id="clean-status-system"></span><span id="clean-res-system"></span></div>
        </div>
      </div>
      <button class="bili-clean-close">关闭</button>
    `;
  document.body.appendChild(cleanWin);
  cleanWin.style.display = 'none';

  // 添加全选/反选功能
  const toggleSubtitle = cleanWin.querySelector('.bili-clean-toggle');
  toggleSubtitle.style.cursor = 'pointer';
  toggleSubtitle.style.userSelect = 'none';
  toggleSubtitle.style.transition = 'color 0.2s, transform 0.2s';

  toggleSubtitle.onclick = function () {
    const checkboxes = cleanWin.querySelectorAll('input[type="checkbox"]');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    const shouldCheckAll = checkedCount < checkboxes.length;

    // 切换所有复选框状态
    checkboxes.forEach(checkbox => {
      checkbox.checked = shouldCheckAll;
    });

    // 添加点击反馈动画
    toggleSubtitle.style.transform = 'scale(0.95)';
    setTimeout(() => {
      toggleSubtitle.style.transform = '';
    }, 150);

    // 更新提示文本
    const statusText = shouldCheckAll ? '已全选' : '已取消';
    toggleSubtitle.textContent = `一键清理，焕然一新 (${statusText})`;
    setTimeout(() => {
      toggleSubtitle.textContent = '一键清理，焕然一新';
    }, 1500);
  };

  // 添加悬停效果
  toggleSubtitle.onmouseenter = () => {
    toggleSubtitle.style.color = '#fff';
    toggleSubtitle.style.transform = 'scale(1.02)';
  };
  toggleSubtitle.onmouseleave = () => {
    toggleSubtitle.style.color = '';
    toggleSubtitle.style.transform = '';
  };

  // 清理窗口拖拽功能
  const cleanWinTitle = cleanWin.querySelector('.bili-clean-drag-handle');
  cleanWinTitle.style.cursor = 'move';
  cleanWinTitle.style.userSelect = 'none';

  function onCleanWinDragMove(e) {
    if (!cleanWinDragging) return;
    const newLeft = e.clientX - cleanWinOffsetX;
    const newTop = e.clientY - cleanWinOffsetY;
    const maxLeft = window.innerWidth - cleanWin.offsetWidth - 10;
    const maxTop = window.innerHeight - cleanWin.offsetHeight - 10;
    cleanWin.style.left = Math.max(10, Math.min(newLeft, maxLeft)) + 'px';
    cleanWin.style.top = Math.max(10, Math.min(newTop, maxTop)) + 'px';
    cleanWin.style.right = 'auto';
    cleanWin.style.bottom = 'auto';
  }

  function onCleanWinDragEnd() {
    if (!cleanWinDragging) return;
    cleanWinDragging = false;
    document.body.style.userSelect = '';
    cleanWin.style.transition = '';
    cleanWinTitle.style.opacity = '';
    document.removeEventListener('mousemove', onCleanWinDragMove);
    document.removeEventListener('mouseup', onCleanWinDragEnd);
  }

  cleanWinTitle.addEventListener('mousedown', function (e) {
    cleanWinDragging = true;
    cleanWinOffsetX = e.clientX - cleanWin.offsetLeft;
    cleanWinOffsetY = e.clientY - cleanWin.offsetTop;
    document.body.style.userSelect = 'none';
    cleanWin.style.transition = 'none';
    cleanWinTitle.style.opacity = '0.8';
    document.addEventListener('mousemove', onCleanWinDragMove);
    document.addEventListener('mouseup', onCleanWinDragEnd);
  });

  // --------- 日志窗口（固定暗色终端风格） ---------
  const debugWin = document.createElement('div');
  debugWin.id = 'bili-debug-panel';
  debugWin.innerHTML = `<div class="bili-debug-title">调试日志</div><textarea id="bili-debug-log" readonly style="width:100%;height:150px;"></textarea><button class="bili-debug-close">关闭</button>`;
  document.body.appendChild(debugWin);
  debugWin.style.display = 'none';

  // --------- 自动清理设置面板 ---------
  const SETTINGS_KEY = 'bili-auto-clean-settings';
  const defaultSettings = { enabled: false, types: { reply: true, like: true, at: true, pm: false, history: false, system: false }, delay: 5 };
  function loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      return { ...defaultSettings, ...stored, types: { ...defaultSettings.types, ...stored?.types } };
    } catch (e) { return { ...defaultSettings }; }
  }
  function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

  const settingsWin = document.createElement('div');
  settingsWin.id = 'bili-settings-panel';
  const st = loadSettings();
  settingsWin.innerHTML = `
      <div class="bili-settings-title bili-settings-drag-handle">自动清理设置</div>
      <div class="bili-settings-sub">页面加载时自动清理指定消息</div>
      <div class="bili-settings-body">
        <div class="bili-settings-row bili-settings-toggle-row">
          <label class="bili-settings-toggle">
            <input type="checkbox" id="bili-auto-enable" ${st.enabled ? 'checked' : ''}>
            <span class="bili-toggle-track"><span class="bili-toggle-thumb"></span></span>
          </label>
          <span class="bili-toggle-label">${st.enabled ? '已启用' : '已关闭'}</span>
        </div>
        <div class="bili-settings-divider"></div>
        <div class="bili-settings-section-title">清理项目</div>
        <div class="bili-settings-types">
          <label class="bili-type-chip"><input type="checkbox" class="bili-auto-type" data-type="reply" ${st.types.reply ? 'checked' : ''}> 回复</label>
          <label class="bili-type-chip"><input type="checkbox" class="bili-auto-type" data-type="like" ${st.types.like ? 'checked' : ''}> 赞我</label>
          <label class="bili-type-chip"><input type="checkbox" class="bili-auto-type" data-type="at" ${st.types.at ? 'checked' : ''}> 艾特</label>
          <label class="bili-type-chip"><input type="checkbox" class="bili-auto-type" data-type="pm" ${st.types.pm ? 'checked' : ''}> 私信</label>
          <label class="bili-type-chip"><input type="checkbox" class="bili-auto-type" data-type="history" ${st.types.history ? 'checked' : ''}> 历史</label>
          <label class="bili-type-chip"><input type="checkbox" class="bili-auto-type" data-type="system" ${st.types.system ? 'checked' : ''}> 系统</label>
        </div>
        <div class="bili-settings-divider"></div>
        <div class="bili-settings-row bili-settings-delay-row">
          <span class="bili-settings-section-title" style="margin:0">延迟启动</span>
          <select id="bili-auto-delay">
            <option value="3" ${st.delay===3?'selected':''}>3 秒</option>
            <option value="5" ${st.delay===5?'selected':''}>5 秒</option>
            <option value="10" ${st.delay===10?'selected':''}>10 秒</option>
            <option value="30" ${st.delay===30?'selected':''}>30 秒</option>
          </select>
        </div>
      </div>
      <button class="bili-settings-save"><span class="bili-btn-glow"></span>保存设置</button>
      <button class="bili-settings-close">关闭</button>
    `;
  document.body.appendChild(settingsWin);
  settingsWin.style.display = 'none';

  const toggleEnable = settingsWin.querySelector('#bili-auto-enable');
  const toggleLabel = settingsWin.querySelector('.bili-toggle-label');
  toggleEnable.addEventListener('change', () => {
    toggleLabel.textContent = toggleEnable.checked ? '已启用' : '已关闭';
  });

  settingsWin.querySelector('.bili-settings-save').onclick = () => {
    const s = {
      enabled: toggleEnable.checked,
      types: {},
      delay: parseInt(settingsWin.querySelector('#bili-auto-delay').value)
    };
    settingsWin.querySelectorAll('.bili-auto-type').forEach(cb => { s.types[cb.dataset.type] = cb.checked; });
    saveSettings(s);
    log('自动清理设置已保存');
    settingsWin.style.display = 'none';
  };
  settingsWin.querySelector('.bili-settings-close').onclick = () => { settingsWin.style.display = 'none'; };

  // --------- 菜单点击切换窗口 ---------
  menu.onclick = function (e) {
    const item = e.target.closest('[data-win]');
    if (!item) return;
    const win = item.dataset.win;
    cleanWin.style.display = 'none';
    debugWin.style.display = 'none';
    settingsWin.style.display = 'none';
    if (win === 'clean') cleanWin.style.display = 'block';
    if (win === 'debug') debugWin.style.display = 'block';
    if (win === 'settings') settingsWin.style.display = 'block';
    if (win === 'author') window.open('https://space.bilibili.com/210900168', '_blank');
    if (win === 'donate') donateWin.style.display = 'block';
    menuVisible = false;
    menu.style.display = 'none';
  };
  cleanWin.querySelector('.bili-clean-close').onclick = () => {
    cleanWin.style.display = 'none';
  };
  debugWin.querySelector('.bili-debug-close').onclick = () => {
    debugWin.style.display = 'none';
  };

  // --------- 批量清理逻辑 ---------
  async function cleanType(type, statusId, resultId) {
    let succ = 0;
    let last_id = '', last_time = '', isEnd = false; // renamed is_end → isEnd
    let api, getItems, getCursor;
    if (type === 0) {
      api = (id, time) => `https://api.bilibili.com/x/msgfeed/like?id=${id}&like_time=${time}&platform=web&build=0&mobi_app=web`;
      getItems = res => res.data?.total?.items || [];
      getCursor = res => res.data?.total?.cursor || {};
    } else if (type === 1) {
      api = (id, time) => `https://api.bilibili.com/x/msgfeed/reply?id=${id}&like_time=${time}&platform=web&build=0&mobi_app=web`;
      getItems = res => res.data?.items || [];
      getCursor = res => res.data?.cursor || {};
    } else if (type === 2) {
      api = (id, time) => `https://api.bilibili.com/x/msgfeed/at?id=${id}&like_time=${time}&platform=web&build=0&mobi_app=web`;
      getItems = res => res.data?.items || [];
      getCursor = res => res.data?.cursor || {};
    } else if (type === 3) {
      // 私信删除特殊处理
      return await cleanPrivateMessages(statusId, resultId);
    } else if (type === 4) {
      // 历史记录清空特殊处理
      return await clearHistory(statusId, resultId);
    } else if (type === 5) {
      // 系统消息清空特殊处理
      return await clearSystemMessages(statusId, resultId);
    }
    let total = 0, done = 0;
    progressBarWrap.style.display = 'block';
    progressBar.style.width = '0';
    const firstRes = await biliGet(api(last_id, last_time));
    if (firstRes && firstRes.code === 0) {
      total = getItems(firstRes).length * 10;
    }
    while (!isEnd) {
      if (cleanCancelled) { log('用户取消清理'); break; }
      const url = api(last_id, last_time);
      log(`获取消息列表: ${url}`);
      const pageRes = await biliGet(url);
      if (!pageRes || pageRes.code !== 0) {
        log(`接口返回异常: ${pageRes ? pageRes.message : '无响应'}`);
        break;
      }
      const items = getItems(pageRes);
      if (!items.length) {
        log('接口items为空，记录已清空或无待清理项目');
        document.getElementById(resultId).textContent = '记录为空';
        break;
      }
      for (let i = 0; i < items.length; i++) {
        let id = items[i].id;
        let delRes = await testDeleteMsg(id, type);
        log(`删除id=${id} 结果: ${delRes.ok ? '成功' : '失败'} ${delRes.msg}`);
        if (delRes.ok) succ++;
        document.getElementById(statusId).textContent = `${succ}`;
        animateRowStatus(statusId.replace('clean-status-', '')); // make animateRowStatus used
        done++;
        progressBar.style.width = total ? Math.min(100, Math.round(done / total * 100)) + '%' : '30%';
        await new Promise(r => setTimeout(r, 150));
      }
      const cursor = getCursor(pageRes);
      isEnd = cursor['is_end'];
      last_id = cursor.id || '';
      last_time = cursor.time || '';
      if (isEnd) break;
    }
    progressBar.style.width = '100%';
    setTimeout(() => progressBarWrap.style.display = 'none', 800);

    // 优化结果显示逻辑
    const currentResult = document.getElementById(resultId).textContent;
    if (currentResult !== '记录为空') {
      document.getElementById(resultId).textContent = succ > 0 ? '清理完成' : '清理失败';
    }
    log(`类型${type}清理结束，成功${succ}条`);
  }

  // --------- 私信删除逻辑 ---------
  async function cleanPrivateMessages(statusId, resultId) {
    let succ = 0;
    let hasMore = true;
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILS = 3;
    while (hasMore) {
      if (cleanCancelled) { log('用户取消私信清理'); break; }
      try {
        const res = await biliGet('https://api.vc.bilibili.com/session_svr/v1/session_svr/get_sessions?session_type=1');

        if (!res || res.code !== 0) {
          log(`私信接口返回异常: ${res ? res.message : '无响应'}`);
          break;
        }

        const sessions = res.data?.['session_list'] || []; // bracket notation avoids unresolved warning
        if (sessions.length === 0) {
          log('私信列表为空，清理完毕');
          // 如果是第一次检查就发现为空，说明本来就没有私信，应该显示"记录为空"
          if (succ === 0) {
            document.getElementById(resultId).textContent = '记录为空';
          }
          break;
        }

        let batchFails = 0;
        for (let i = 0; i < sessions.length; i++) {
          if (cleanCancelled) break;
          const talkerId = sessions[i]['talker_id']; // bracket notation avoids unresolved warning
          const delRes = await deletePrivateMessage(talkerId);
          if (delRes.ok) { succ++; consecutiveFailures = 0; }
          else { batchFails++; consecutiveFailures++; }
          document.getElementById(statusId).textContent = `${succ}`;
          animateRowStatus(statusId.replace('clean-status-', '')); // animate row
          await new Promise(r => setTimeout(r, 150));
        }

        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILS) {
          log(`连续${consecutiveFailures}次删除失败，可能无权限，停止私信清理`);
          break;
        }

        if (sessions.length < 20 || batchFails === sessions.length) {
          hasMore = false;
        }

        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        log(`私信清理异常: ${e}`);
        break;
      }
    }
    // 优化结果显示逻辑
    const currentResult = document.getElementById(resultId).textContent;
    if (currentResult !== '记录为空') {
      document.getElementById(resultId).textContent = succ > 0 ? '清理完成' : '清理失败';
    }
    log(`私信清理结束，成功${succ}条`);
  }

  // --------- 历史记录清空逻辑 ---------
  async function clearHistory(statusId, resultId) {
    try {
      log('开始清空历史记录');
      document.getElementById(statusId).textContent = '处理中...';

      const csrf = getCsrf();
      const res = await biliPost('https://api.bilibili.com/x/v2/history/clear', `jsonp=jsonp&csrf=${csrf}`);

      document.getElementById(statusId).textContent = res.ok ? '1' : '0';
      document.getElementById(resultId).textContent = res.ok ? '清理完成' : '清理失败';
      log(`历史记录清空结果: ${res.msg}`);
    } catch (e) {
      log(`历史记录清空异常: ${e}`);
      document.getElementById(statusId).textContent = '0';
      document.getElementById(resultId).textContent = '清理失败';
    }
  }

  // --------- 系统消息清空逻辑 ---------
  async function clearSystemMessages(statusId, resultId) {
    try {
      log('开始清空系统消息');
      document.getElementById(statusId).textContent = '处理中...';

      const csrf = getCsrf();
      const url = `https://message.bilibili.com/x/sys-msg/del_notify_list?build=7650400&mobi_app=android&csrf=${csrf}`;
      const res = await biliPost(url, { type: 4, build: 7650400, mobi_app: "android" }, true);

      document.getElementById(statusId).textContent = res.ok ? '1' : '0';
      document.getElementById(resultId).textContent = res.ok ? '清理完成' : '清理失败';
      log(`系统消息清空结果: ${res.msg}`);
    } catch (e) {
      log(`系统消息清空异常: ${e}`);
      document.getElementById(statusId).textContent = '0';
      document.getElementById(resultId).textContent = '清理失败';
    }
  }

  // --------- 删除私信函数 ---------
  async function deletePrivateMessage(talkerId) {
    if (!talkerId) {
      log(`私信删除参数不完整，跳过删除操作: talkerId=${talkerId}`);
      return { ok: false, msg: '参数不完整，跳过操作' };
    }

    const csrf = getCsrf();
    const params = `talker_id=${talkerId}&session_type=1&build=0&mobi_app=web&csrf_token=${csrf}&csrf=${csrf}`;
    return await biliPost('https://api.vc.bilibili.com/session_svr/v1/session_svr/remove_session', params);
  }

  let cleanCancelled = false, isCleaning = false;
  const cleanBtn = cleanWin.querySelector('#bili-clean-start');
  const cleanBtnText = cleanBtn.querySelector('.bili-btn-text');

  function setCleanBtnState(running) {
    isCleaning = running;
    cleanBtnText.textContent = running ? '停止清理' : '开始清理';
    cleanBtn.classList.toggle('cleaning', running);
  }

  cleanBtn.onclick = async function () {
    if (isCleaning) {
      cleanCancelled = true;
      cleanBtnText.textContent = '正在停止...';
      return;
    }
    cleanCancelled = false;
    setCleanBtnState(true);
    ['reply', 'like', 'at', 'pm', 'history', 'system'].forEach(t => {
      document.getElementById('clean-status-' + t).textContent = '0';
      document.getElementById('clean-res-' + t).textContent = '';
    });
    const tasks = [
      { id: 'clean-reply', type: 1, status: 'clean-status-reply', result: 'clean-res-reply' },
      { id: 'clean-like', type: 0, status: 'clean-status-like', result: 'clean-res-like' },
      { id: 'clean-at', type: 2, status: 'clean-status-at', result: 'clean-res-at' },
      { id: 'clean-pm', type: 3, status: 'clean-status-pm', result: 'clean-res-pm' },
      { id: 'clean-history', type: 4, status: 'clean-status-history', result: 'clean-res-history' },
      { id: 'clean-system', type: 5, status: 'clean-status-system', result: 'clean-res-system' }
    ];
    for (const task of tasks) {
      if (cleanCancelled) break;
      if (document.getElementById(task.id).checked) {
        document.getElementById(task.status).textContent = '0';
        await cleanType(task.type, task.status, task.result);
      }
    }
    if (cleanCancelled) log('清理已被用户取消');
    setCleanBtnState(false);
  };

  // --------- 获取消息id和单条删除函数 ---------
  async function testDeleteMsg(id, type) {
    if (!id || type === undefined || type === null) {
      log(`参数不完整，跳过删除操作: id=${id}, type=${type}`);
      return { ok: false, msg: '参数不完整，跳过操作' };
    }

    const csrf = getCsrf();
    const params = `tp=${type}&id=${encodeURIComponent(id)}&build=0&mobi_app=web&csrf_token=${csrf}&csrf=${csrf}`;
    return await biliPost('https://api.bilibili.com/x/msgfeed/del', params);
  }

  // --------- 清理进度条 ---------
  const progressBarWrap = document.createElement('div');
  progressBarWrap.id = 'bili-clean-progress';
  progressBarWrap.style.height = '8px';
  progressBarWrap.style.background = '#fff3';
  progressBarWrap.style.borderRadius = '4px';
  progressBarWrap.style.overflow = 'hidden';
  progressBarWrap.style.margin = '10px 0';
  progressBarWrap.style.display = 'none';
  const progressBar = document.createElement('div');
  progressBar.id = 'bili-clean-progress-bar';
  progressBar.style.height = '100%';
  progressBar.style.width = '0';
  progressBar.style.background = 'linear-gradient(90deg,#a18cd1,#fbc2eb)';
  progressBar.style.transition = 'width 0.3s';
  progressBarWrap.appendChild(progressBar);
  cleanWin.insertBefore(progressBarWrap, cleanWin.querySelector('.bili-clean-table'));

  // --------- 样式（美化升级+缩小+终端风格日志） ---------
  const style = document.createElement('style');
  style.innerHTML = `
      @keyframes biliButtonPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.15); }
        100% { transform: scale(1); }
      }
      @keyframes biliFloat {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-6px); }
      }
      #bili-float-btn svg {
        transition: filter 0.3s;
      }
      #bili-float-btn { transition: transform 0.2s; }
      @keyframes biliGlow {
        0% { opacity: 0.5; }
        100% { opacity: 0.9; }
      }
      #bili-float-menu {
        box-shadow: 0 6px 24px #a18cd144;
        animation: biliMenuPop 0.3s cubic-bezier(.5,1.8,.5,1) both;
        backdrop-filter: blur(10px) saturate(1.2);
        background: rgba(255,255,255,0.85);
        border: 1.2px solid #fff4;
        border-radius: 16px;
        min-width: 90px;
        font-size: 0.95rem;
        padding: 8px 0;
      }
      #bili-clean-panel {
        position: fixed; right: 60px; bottom: 30px; width: 320px;
        background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
        border-radius: 20px; box-shadow: 0 10px 40px #a18cd144, 0 2px 8px #fff8;
        padding: 20px 18px 14px 18px; z-index: 100002;
        font-family: 'Microsoft Yahei', 'SimSun', Arial, sans-serif; color: #fff;
        transform-style: preserve-3d;
        animation: biliPanelIn 0.5s cubic-bezier(.5,1.8,.5,1);
        backdrop-filter: blur(10px) saturate(1.2);
        border: 1.5px solid #fff4;
      }
      @keyframes biliPanelIn {
        0% { opacity:0; transform:rotateY(30deg) scale(0.7) translateY(24px); }
        100% { opacity:1; transform:rotateY(0) scale(1) translateY(0); }
      }
      .bili-clean-title { 
        font-size: 1.35rem; 
        font-weight: bold; 
        letter-spacing: 1px; 
        text-align: center; 
        text-shadow: 0 2px 8px #a18cd1cc; 
        padding: 4px 0;
        border-radius: 12px 12px 0 0;
        transition: background 0.2s, opacity 0.2s;
      }
      .bili-clean-drag-handle:hover {
        background: rgba(255,255,255,0.1);
        cursor: move;
      }
      .bili-clean-drag-handle:active {
        background: rgba(255,255,255,0.2);
        opacity: 0.8;
      }
      .bili-clean-sub { font-size: 0.95rem; margin-top: 2px; color: #f3e6ff; text-align: center; margin-bottom: 10px; }
      .bili-clean-options { margin: 10px 0 10px 0; }
      .bili-clean-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
      .bili-clean-row label { background: rgba(255,255,255,0.13); border-radius: 8px; padding: 5px 10px; font-size: 0.98rem; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow:0 1px 2px #fff2; transition: background 0.18s, box-shadow 0.18s; }
      .bili-clean-row label:hover { 
        background: #f3e6ff; 
        color: #a18cd1; 
        box-shadow: 0 2px 6px #a18cd1aa; 
        transform: translateY(-1px) scale(1.02);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .bili-clean-row input[type="checkbox"] { accent-color: #a18cd1; width: 15px; height: 15px; }
      .bili-clean-btn { width: 100%; margin: 10px 0 10px 0; padding: 10px 0; background: linear-gradient(90deg, #7f7fd5 0%, #86a8e7 50%, #91eac9 100%); border: none; border-radius: 12px; font-size: 1.05rem; font-weight: bold; color: #fff; cursor: pointer; box-shadow: 0 2px 8px #a18cd110; transition: background 0.2s, box-shadow 0.2s; position:relative; overflow:hidden; }
      .bili-btn-glow { position:absolute; left:0; top:0; width:100%; height:100%; border-radius:12px; box-shadow:0 0 16px 4px #fbc2eb88, 0 0 6px 1px #a18cd1cc; pointer-events:none; opacity:0.5; animation:biliGlow 2.2s infinite alternate cubic-bezier(.5,1.8,.5,1); z-index:0; }
      .bili-clean-btn span { z-index:1; position:relative; }
      .bili-clean-btn:hover { 
        background: linear-gradient(90deg, #91eac9 0%, #86a8e7 50%, #7f7fd5 100%); 
        box-shadow: 0 6px 18px #a18cd1cc; 
        transform: translateY(-2px) scale(1.02);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .bili-clean-table { background: rgba(255,255,255,0.13); border-radius: 10px; padding: 6px 0 0 0; margin-top: 6px; box-shadow:0 1px 4px #fff2; }
      .bili-clean-thead, .bili-clean-tbody > div { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 0.98rem; }
      .bili-clean-thead { font-weight: bold; color: #e0d7ff; border-bottom: 1px solid rgba(255,255,255,0.18); }
      .bili-clean-tbody > div { border-bottom: 1px solid rgba(255,255,255,0.09); color: #fff; transition: background 0.18s; }
      .bili-clean-tbody > div:last-child { border-bottom: none; }
      .bili-clean-tbody > div[data-anim] { animation: biliRowAnim 0.5s cubic-bezier(.5,1.8,.5,1); }
      @keyframes biliRowAnim { 0%{background:#fbc2eb44;} 100%{background:transparent;} }
      .bili-clean-close { width: 100%; margin: 10px 0 0 0; padding: 7px 0; background: rgba(255,255,255,0.22); border: none; border-radius: 8px; font-size: 0.98rem; color: #fff; cursor: pointer; transition: background 0.18s; }
      .bili-clean-close:hover { 
        background: rgba(255,255,255,0.32); 
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(161, 140, 209, 0.3);
      }
      #bili-debug-panel {
        position: fixed; right: 60px; bottom: 30px; width: 340px; background: #181c20; border-radius: 10px; box-shadow: 0 8px 24px #000a, 0 2px 8px #2228; z-index: 100002; color: #e0e0e0; font-family: 'Fira Mono', 'Consolas', 'Menlo', 'monospace'; padding: 14px 14px 10px 14px; animation: biliPanelIn 0.5s cubic-bezier(.5,1.8,.5,1); border: 1.5px solid #222; }
      .bili-debug-title { font-size: 1.05rem; font-weight: bold; margin-bottom: 10px; text-align: center; color: #7fffd4; letter-spacing: 1px; }
      #bili-debug-log {
        background: #181c20;
        border-radius: 6px;
        border: 1px solid #222;
        color: #e0e0e0;
        font-size: 0.92rem;
        font-family: 'Fira Mono', 'Consolas', 'Menlo', 'monospace';
        box-shadow: 0 2px 8px #0004 inset;
        padding: 8px;
        outline: none;
        resize: none;
        line-height: 1.5;
        transition: border 0.2s;
      }
      #bili-debug-log::-webkit-scrollbar { width: 6px; background: #222; }
      #bili-debug-log::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
      .bili-debug-close {
        width: 100%; margin: 10px 0 0 0; padding: 7px 0; background: #23272e; border: none; border-radius: 8px; font-size: 0.98rem; color: #7fffd4; cursor: pointer; transition: background 0.18s, color 0.18s;
      }
      .bili-debug-close:hover { 
        background: #222; 
        color: #fff176; 
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(127, 255, 212, 0.3);
      }
      #bili-clean-progress { box-shadow: 0 2px 6px #a18cd1aa; background: rgba(255,255,255,0.22); border: 1px solid #fff4; height: 5px !important; border-radius: 3px !important; }
      #bili-clean-progress-bar { border-radius: 3px; }
      /* 主题切换动画 */
      #bili-clean-panel, #bili-float-menu {
        transition: background 0.4s, color 0.4s, box-shadow 0.4s;
      }
      /* 悬浮按钮/菜单动效增强 */
      #bili-float-btn:hover {
        transform: scale(1.18) rotate(-8deg);
      }
      @keyframes biliMenuPop {
        0% { opacity:0; transform:scale(0.7) translateY(16px);}
        80% { transform:scale(1.08) translateY(-4px);}
        100% { opacity:1; transform:scale(1) translateY(0);}
      }
      /* 菜单关闭淡出动画 */
      @keyframes biliMenuFadeOut {
        0% { opacity:1; }
        100% { opacity:0; }
      }
      /* 进度条美化 */
      #bili-clean-progress-bar {
        background: linear-gradient(90deg,#a18cd1,#fbc2eb,#a18cd1);
        background-size: 200% 100%;
        animation: biliProgressMove 1.2s linear infinite;
        box-shadow: 0 2px 8px #a18cd1aa;
      }
      @keyframes biliProgressMove {
        0% { background-position: 0 0; }
        100% { background-position: 100% 0; }
      }
      /* 进度条完成闪光 */
      #bili-clean-progress-bar.flash {
        animation: biliProgressMove 1.2s linear infinite, biliProgressFlash 0.6s;
      }
      @keyframes biliProgressFlash {
        0% { filter: brightness(1.2) drop-shadow(0 0 8px #fff8); }
        60% { filter: brightness(2.2) drop-shadow(0 0 24px #fff8); }
        100% { filter: brightness(1) drop-shadow(0 0 0 #fff0); }
      }
      /* 主题色块选中动画 */
      .bili-theme-dot.active{
        box-shadow:0 0 0 3px #fbc2eb,0 2px 8px #a18cd1cc;border:2.5px solid #f78ca2;transform:scale(1.18);transition:transform 0.18s, box-shadow 0.18s, border 0.18s;
      }
      /* 清理按钮loading动画 */
      .bili-clean-btn.cleaning { background: linear-gradient(90deg, #ef4444, #f97316); animation: biliButtonPulse 1.5s ease-in-out infinite; }
      .bili-clean-btn.cleaning:hover { background: linear-gradient(90deg, #dc2626, #ea580c); box-shadow: 0 6px 18px rgba(239,68,68,0.4); }
      .bili-btn-text { position: relative; z-index: 1; }
      .bili-clean-btn.loading { pointer-events:none; opacity:0.7; position:relative; }
      .bili-clean-btn .bili-btn-loading {
        display:inline-block; width:18px; height:18px; vertical-align:middle; margin-right:6px;
        border:2.5px solid #fff4; border-top:2.5px solid #a18cd1; border-radius:50%; animation: biliBtnSpin 0.8s linear infinite;
      }
      @keyframes biliBtnSpin { 100% { transform: rotate(360deg); } }
      /* 表格三列对齐优化 */
      .bili-clean-thead span, .bili-clean-tbody > div > span {
        display: inline-block;
        text-align: center;
      }
      .bili-clean-thead span:nth-child(1), .bili-clean-tbody > div > span:nth-child(1) { width: 60px; text-align: left; }
      .bili-clean-thead span:nth-child(2), .bili-clean-tbody > div > span:nth-child(2) { width: 50px; }
      .bili-clean-thead span:nth-child(3), .bili-clean-tbody > div > span:nth-child(3) { width: 80px; text-align: right; }
      /* 选项按钮对齐优化 */
      .bili-clean-row label {
        flex: 1 1 0;
        text-align: center;
        min-width: 0;
        margin: 0 4px;
        justify-content: center;
      }
      .bili-clean-row {
        gap: 0;
      }
      #bili-donate-panel {
        position: fixed; right: 50%; bottom: 50%; transform: translate(50%,50%);
        background: #fff; border-radius: 18px; box-shadow: 0 8px 32px #a18cd1aa, 0 2px 8px #fff8;
        z-index: 100003; padding: 28px 28px 18px 28px; text-align: center; min-width: 260px;
        font-family: 'Microsoft Yahei', Arial, sans-serif; color: #333;
        animation: biliPanelIn 0.5s cubic-bezier(.5,1.8,.5,1);
      }
      .bili-donate-title { font-size: 1.18rem; font-weight: bold; margin-bottom: 10px; color: #a18cd1; }
      .bili-donate-img { width: 180px; height: 180px; border-radius: 12px; box-shadow: 0 2px 16px #a18cd1aa; margin-bottom: 10px; }
      .bili-donate-tip { color: #888; font-size: 0.98rem; margin-bottom: 12px; }
      .bili-donate-close { padding: 7px 0; width: 100%; border: none; border-radius: 8px; background: #f3e6ff; color: #a18cd1; font-size: 1rem; cursor: pointer; transition: background 0.18s; }
      .bili-donate-close:hover { 
        background: #a18cd1; 
        color: #fff; 
        transform: translateY(-1px) scale(1.02);
        box-shadow: 0 4px 12px rgba(161, 140, 209, 0.4);
      }
      #bili-settings-panel {
        position: fixed; right: 60px; bottom: 30px; width: 320px;
        background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
        border-radius: 20px; box-shadow: 0 10px 40px #a18cd144, 0 2px 8px #fff8;
        padding: 20px 18px 14px 18px; z-index: 100002;
        font-family: 'Microsoft Yahei', 'SimSun', Arial, sans-serif; color: #fff;
        animation: biliPanelIn 0.5s cubic-bezier(.5,1.8,.5,1);
        backdrop-filter: blur(10px) saturate(1.2);
        border: 1.5px solid #fff4;
      }
      .bili-settings-title {
        font-size: 1.35rem; font-weight: bold; letter-spacing: 1px; text-align: center;
        text-shadow: 0 2px 8px #a18cd1cc; padding: 4px 0; border-radius: 12px 12px 0 0;
        transition: background 0.2s, opacity 0.2s;
      }
      .bili-settings-drag-handle { cursor: move; }
      .bili-settings-drag-handle:hover { background: rgba(255,255,255,0.1); }
      .bili-settings-drag-handle:active { background: rgba(255,255,255,0.2); opacity: 0.8; }
      .bili-settings-sub { font-size: 0.88rem; color: #f3e6ff; text-align: center; margin-bottom: 12px; }
      .bili-settings-body { background: rgba(255,255,255,0.13); border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
      .bili-settings-divider { height: 1px; background: rgba(255,255,255,0.15); margin: 10px 0; }
      .bili-settings-section-title { font-size: 0.85rem; color: #e0d7ff; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 8px; }
      .bili-settings-row { display: flex; align-items: center; justify-content: space-between; }
      .bili-settings-toggle-row { gap: 10px; }
      .bili-settings-toggle { position: relative; display: inline-block; width: 40px; height: 22px; cursor: pointer; }
      .bili-settings-toggle input { opacity: 0; width: 0; height: 0; }
      .bili-toggle-track { position: absolute; inset: 0; background: rgba(255,255,255,0.2); border-radius: 11px; transition: background 0.25s; }
      .bili-settings-toggle input:checked + .bili-toggle-track { background: rgba(76,175,80,0.7); }
      .bili-toggle-thumb { position: absolute; left: 2px; top: 2px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: transform 0.25s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
      .bili-settings-toggle input:checked + .bili-toggle-track .bili-toggle-thumb { transform: translateX(18px); }
      .bili-toggle-label { font-size: 0.92rem; color: #fff; }
      .bili-settings-types { display: flex; flex-wrap: wrap; gap: 6px; }
      .bili-type-chip {
        background: rgba(255,255,255,0.13); border-radius: 8px; padding: 5px 12px; font-size: 0.92rem;
        cursor: pointer; display: flex; align-items: center; gap: 5px; transition: background 0.18s, transform 0.18s;
      }
      .bili-type-chip:hover { background: rgba(255,255,255,0.25); transform: translateY(-1px) scale(1.02); }
      .bili-type-chip input[type="checkbox"] { accent-color: #a18cd1; width: 14px; height: 14px; }
      .bili-settings-delay-row { margin-top: 2px; }
      .bili-settings-delay-row select {
        padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.3);
        background: rgba(255,255,255,0.15); color: #fff; font-size: 0.88rem; cursor: pointer;
        backdrop-filter: blur(4px);
      }
      .bili-settings-delay-row select option { background: #333; color: #fff; }
      .bili-settings-save {
        width: 100%; margin: 8px 0 6px 0; padding: 10px 0; background: linear-gradient(90deg, #7f7fd5 0%, #86a8e7 50%, #91eac9 100%);
        border: none; border-radius: 12px; font-size: 1.02rem; font-weight: bold; color: #fff;
        cursor: pointer; position: relative; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;
      }
      .bili-settings-save:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 6px 18px #a18cd1cc; }
      .bili-settings-close {
        width: 100%; margin: 0; padding: 7px 0; background: rgba(255,255,255,0.22); border: none;
        border-radius: 8px; font-size: 0.95rem; color: #fff; cursor: pointer; transition: background 0.18s;
      }
      .bili-settings-close:hover { background: rgba(255,255,255,0.32); transform: translateY(-1px); }
    `;
  document.head.appendChild(style);

  // --------- 清理窗口动效输出优化 ---------
  function animateRowStatus(type) {
    const row = document.querySelector(`#clean-status-${type}`)?.parentElement;
    if (row) {
      row.setAttribute('data-anim', '1');
      setTimeout(() => row.removeAttribute('data-anim'), 600);
    }
  }

  // 在批量清理和单条清理时调用 animateRowStatus(type)
  // 例如: animateRowStatus('reply');

  // --------- ESC关闭窗口 ---------
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      [cleanWin, debugWin, settingsWin, donateWin].forEach(win => {
        if (win.style.display === 'block') win.style.display = 'none';
      });
    }
  });

  // --------- 主题切换 ---------
  const THEMES = {
    dark: {
      name: '酷雅黑',
      main: '#181c20',
      btn: '#23272e',
      shadow: '#000a',
      accent: '#7fffd4',
      font: '#e0e0e0',
      table: '#23272e',
      label: '#23272e',
      hover: '#23272e',
      border: '#222',
      dot: 'linear-gradient(135deg,#23272e,#7fffd4)',
      sakura: '#7fffd4',
      sakuraCenter: '#4de8c2'
    },
    pink: {
      name: '可爱粉',
      main: '#fdf2f8',
      btn: '#ec4899',
      shadow: '#ec489933',
      accent: '#ec4899',
      font: '#831843',
      table: '#fce7f3',
      label: '#fce7f3',
      hover: '#fbcfe8',
      border: '#ec4899',
      dot: '#ec4899',
      sakura: '#fb7185',
      sakuraCenter: '#e11d48'
    },
    blue: {
      name: '清新蓝',
      main: '#eff6ff',
      btn: '#2563eb',
      shadow: '#2563eb33',
      accent: '#2563eb',
      font: '#1e3a5f',
      table: '#dbeafe',
      label: '#dbeafe',
      hover: '#bfdbfe',
      border: '#2563eb',
      dot: '#2563eb',
      sakura: '#60a5fa',
      sakuraCenter: '#1d4ed8'
    },
    green: {
      name: '治愈绿',
      main: '#ecfdf5',
      btn: '#059669',
      shadow: '#05966933',
      accent: '#059669',
      font: '#064e3b',
      table: '#d1fae5',
      label: '#d1fae5',
      hover: '#a7f3d0',
      border: '#059669',
      dot: '#059669',
      sakura: '#34d399',
      sakuraCenter: '#047857'
    },
    high: {
      name: '高对比',
      main: '#f5f3ff',
      btn: '#7c3aed',
      shadow: '#7c3aed33',
      accent: '#7c3aed',
      font: '#3b0764',
      table: '#ede9fe',
      label: '#ede9fe',
      hover: '#ddd6fe',
      border: '#7c3aed',
      dot: '#7c3aed',
      sakura: '#a78bfa',
      sakuraCenter: '#6d28d9'
    }
  };
  let currentTheme = localStorage.getItem('bili-theme') || 'dark';
  function applyTheme(theme) {
    const t = THEMES[theme];
    if (!t) return;
    // 动画过渡
    cleanWin.style.transition = 'background 0.4s, color 0.4s, box-shadow 0.4s';
    menu.style.transition = 'background 0.4s, color 0.4s, box-shadow 0.4s';
    // 樱花悬浮按钮主题配色
    floatBtn.style.setProperty('--bili-sakura-petal', t.sakura);
    floatBtn.style.setProperty('--bili-sakura-center', t.sakuraCenter);
    floatBtn.style.setProperty('--bili-sakura-glow', t.sakura + '80');
    // 主面板
    if (theme === 'dark') {
      cleanWin.style.background = '#181c20';
      cleanWin.style.boxShadow = '0 8px 24px #000a, 0 2px 8px #2228';
      cleanWin.style.color = '#e0e0e0';
      cleanWin.style.borderRadius = '10px';
      cleanWin.style.border = '1.5px solid #222';
      cleanWin.style.fontFamily = "'Microsoft Yahei', Arial, sans-serif";
      cleanWin.querySelector('.bili-clean-title').style.color = '#7fffd4';
      cleanWin.querySelector('.bili-clean-title').style.letterSpacing = '1px';
      cleanWin.querySelector('.bili-clean-title').style.fontWeight = 'bold';
      cleanWin.querySelector('.bili-clean-sub').style.color = '#b2dfdb';
      cleanWin.querySelector('.bili-clean-btn').style.background = '#23272e';
      cleanWin.querySelector('.bili-clean-btn').style.color = '#7fffd4';
      cleanWin.querySelector('.bili-clean-btn').style.borderRadius = '8px';
      cleanWin.querySelector('.bili-clean-btn').style.fontWeight = 'bold';
      cleanWin.querySelector('.bili-clean-close').style.background = '#23272e';
      cleanWin.querySelector('.bili-clean-close').style.color = '#7fffd4';
      cleanWin.querySelector('.bili-clean-close').style.borderRadius = '8px';
      cleanWin.querySelector('.bili-clean-close').style.fontWeight = 'bold';
      cleanWin.querySelectorAll('.bili-clean-row label').forEach(lab => {
        lab.style.background = '#23272e';
        lab.style.color = '#e0e0e0';
        lab.style.borderRadius = '6px';
        lab.style.fontFamily = "'Microsoft Yahei', Arial, sans-serif";
      });
      cleanWin.querySelector('.bili-clean-table').style.background = '#23272e';
      cleanWin.querySelectorAll('.bili-clean-thead').forEach(th => th.style.color = '#7fffd4');
      cleanWin.querySelectorAll('.bili-clean-tbody > div').forEach(row => {
        row.style.borderBottom = '1px solid #222';
        row.style.color = '#e0e0e0';
      });
    } else {
      cleanWin.style.background = t.main;
      cleanWin.style.boxShadow = `0 12px 48px ${t.shadow}, 0 2px 12px #fff8`;
      cleanWin.style.color = t.font;
      cleanWin.style.borderRadius = '20px';
      cleanWin.style.border = '';
      cleanWin.style.fontFamily = "'Microsoft Yahei', Arial, sans-serif";
      cleanWin.querySelector('.bili-clean-title').style.color = '';
      cleanWin.querySelector('.bili-clean-title').style.letterSpacing = '';
      cleanWin.querySelector('.bili-clean-title').style.fontWeight = 'bold';
      cleanWin.querySelector('.bili-clean-sub').style.color = t.font;
      cleanWin.querySelector('.bili-clean-btn').style.background = t.btn;
      cleanWin.querySelector('.bili-clean-btn').style.color = t.font;
      cleanWin.querySelector('.bili-clean-btn').style.borderRadius = '12px';
      cleanWin.querySelector('.bili-clean-btn').style.fontWeight = 'bold';
      cleanWin.querySelector('.bili-clean-close').style.background = t.label;
      cleanWin.querySelector('.bili-clean-close').style.color = t.font;
      cleanWin.querySelector('.bili-clean-close').style.borderRadius = '8px';
      cleanWin.querySelector('.bili-clean-close').style.fontWeight = 'bold';
      cleanWin.querySelectorAll('.bili-clean-row label').forEach(lab => {
        lab.style.background = t.label;
        lab.style.color = t.font;
        lab.style.borderRadius = '8px';
        lab.style.fontFamily = "'Microsoft Yahei', Arial, sans-serif";
      });
      cleanWin.querySelector('.bili-clean-table').style.background = t.table;
      cleanWin.querySelectorAll('.bili-clean-thead').forEach(th => th.style.color = t.border);
      cleanWin.querySelectorAll('.bili-clean-tbody > div').forEach(row => {
        row.style.borderBottom = `1px solid ${t.table}`;
        row.style.color = t.font;
      });
    }
    // 设置面板主题
    if (theme === 'dark') {
      settingsWin.style.background = '#181c20';
      settingsWin.style.boxShadow = '0 8px 24px #000a, 0 2px 8px #2228';
      settingsWin.style.color = '#e0e0e0';
      settingsWin.style.borderRadius = '10px';
      settingsWin.style.border = '1.5px solid #222';
      settingsWin.querySelector('.bili-settings-title').style.color = '#7fffd4';
      settingsWin.querySelector('.bili-settings-sub').style.color = '#b2dfdb';
      settingsWin.querySelector('.bili-settings-body').style.background = '#23272e';
      settingsWin.querySelector('.bili-settings-divider').style.background = '#333';
      settingsWin.querySelectorAll('.bili-settings-section-title').forEach(el => el.style.color = '#7fffd4');
      settingsWin.querySelector('.bili-toggle-track').style.background = '#333';
      settingsWin.querySelectorAll('.bili-type-chip').forEach(chip => {
        chip.style.background = '#23272e';
        chip.style.color = '#e0e0e0';
      });
      settingsWin.querySelector('.bili-settings-delay-row select').style.background = '#23272e';
      settingsWin.querySelector('.bili-settings-delay-row select').style.borderColor = '#444';
      settingsWin.querySelector('.bili-settings-delay-row select').style.color = '#e0e0e0';
      settingsWin.querySelector('.bili-settings-save').style.background = '#23272e';
      settingsWin.querySelector('.bili-settings-save').style.color = '#7fffd4';
      settingsWin.querySelector('.bili-settings-close').style.background = '#23272e';
      settingsWin.querySelector('.bili-settings-close').style.color = '#7fffd4';
    } else {
      settingsWin.style.background = t.main;
      settingsWin.style.boxShadow = `0 12px 48px ${t.shadow}, 0 2px 12px #fff8`;
      settingsWin.style.color = t.font;
      settingsWin.style.borderRadius = '20px';
      settingsWin.style.border = '';
      settingsWin.querySelector('.bili-settings-title').style.color = '';
      settingsWin.querySelector('.bili-settings-sub').style.color = t.font;
      settingsWin.querySelector('.bili-settings-body').style.background = t.table;
      settingsWin.querySelector('.bili-settings-divider').style.background = '';
      settingsWin.querySelectorAll('.bili-settings-section-title').forEach(el => el.style.color = t.border);
      settingsWin.querySelector('.bili-toggle-track').style.background = '';
      settingsWin.querySelectorAll('.bili-type-chip').forEach(chip => {
        chip.style.background = t.label;
        chip.style.color = t.font;
      });
      settingsWin.querySelector('.bili-settings-delay-row select').style.background = t.label;
      settingsWin.querySelector('.bili-settings-delay-row select').style.borderColor = '';
      settingsWin.querySelector('.bili-settings-delay-row select').style.color = t.font;
      settingsWin.querySelector('.bili-settings-save').style.background = t.btn;
      settingsWin.querySelector('.bili-settings-save').style.color = t.font;
      settingsWin.querySelector('.bili-settings-close').style.background = t.label;
      settingsWin.querySelector('.bili-settings-close').style.color = t.font;
    }
    // 菜单
    menu.style.background = t.main;
    menu.style.boxShadow = cleanWin.style.boxShadow;
    menu.style.borderRadius = cleanWin.style.borderRadius;
    menu.style.border = cleanWin.style.border;
    menu.style.opacity = '0.9';
    menu.style.fontFamily = "'Microsoft Yahei', Arial, sans-serif";
    menu.style.color = t.font;
    Array.from(menu.children).forEach(item => {
      if (item.classList && item.classList.contains('bili-float-menu-item')) {
        item.style.background = 'none';
        item.style.color = t.font;
        item.style.fontFamily = "'Microsoft Yahei', Arial, sans-serif";
        item.style.fontWeight = 'bold';
      }
    });
    // 主题高亮
    document.querySelectorAll('.bili-theme-dot').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    currentTheme = theme;
    localStorage.setItem('bili-theme', theme);
  }

  // --------- 主题切换菜单（色块按钮） ---------
  const themeBar = document.createElement('div');
  themeBar.id = 'bili-theme-bar';
  themeBar.style.display = 'flex';
  themeBar.style.justifyContent = 'space-around';
  themeBar.style.margin = '8px 0 0 0';
  themeBar.style.gap = '6px';
  themeBar.style.padding = '8px 12px 12px 12px'; // 增加底部内边距确保完全显示
  themeBar.style.borderTop = '1px solid rgba(255,255,255,0.2)';
  themeBar.style.fontSize = '0.98rem';
  themeBar.style.userSelect = 'none';
  themeBar.style.minHeight = '40px'; // 确保有足够高度
  themeBar.style.alignItems = 'center'; // 垂直居中对齐
  // 色块按钮生成
  Object.entries(THEMES).forEach(([k, v]) => {
    const dot = document.createElement('span');
    dot.className = 'bili-theme-dot';
    dot.dataset.theme = k;
    dot.title = v.name;
    dot.style.display = 'inline-block';
    dot.style.width = '26px';
    dot.style.height = '26px';
    dot.style.borderRadius = '50%';
    dot.style.margin = '0 2px';
    dot.style.background = v.dot;
    dot.style.cursor = 'pointer';
    dot.style.border = '2.5px solid #fff';
    dot.style.boxShadow = '0 2px 8px #0002';
    dot.style.transition = 'box-shadow 0.18s, border 0.18s, transform 0.18s';
    dot.onmouseenter = () => {
      if (!dot.classList.contains('active')) {
        dot.style.transform = 'scale(1.1)';
        dot.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
      }
    };
    dot.onmouseleave = () => {
      if (!dot.classList.contains('active')) {
        dot.style.transform = '';
        dot.style.boxShadow = '0 2px 8px #0002';
      }
    };
    dot.onclick = () => applyTheme(k);
    themeBar.appendChild(dot);
  });
  menu.appendChild(themeBar);
  // 初始化主题
  setTimeout(() => applyTheme(currentTheme), 100);

  // --------- 赞赏二维码弹窗 ---------
  const donateWin = document.createElement('div');
  donateWin.id = 'bili-donate-panel';
  donateWin.style.display = 'none';
  donateWin.innerHTML = `
      <div class=\"bili-donate-title\">赞赏作者</div>
      <img class=\"bili-donate-img\" src=\"${DONATE_QR_URL}\" alt=\"收款二维码\">
      <div class=\"bili-donate-tip\">感谢支持！</div>
      <button class=\"bili-donate-close\">关闭</button>
    `;
  document.body.appendChild(donateWin);
  donateWin.querySelector('.bili-donate-close').onclick = () => {
    donateWin.style.display = 'none';
  };

  // --------- 自动清理触发 ---------
  (function autoCleanTrigger() {
    const s = loadSettings();
    if (!s.enabled) return;
    const selectedTypes = Object.entries(s.types).filter(([, v]) => v).map(([k]) => k);
    if (!selectedTypes.length) return;
    const typeMap = { reply: 1, like: 0, at: 2, pm: 3, history: 4, system: 5 };
    const statusMap = { reply: 'clean-status-reply', like: 'clean-status-like', at: 'clean-status-at', pm: 'clean-status-pm', history: 'clean-status-history', system: 'clean-status-system' };
    const resultMap = { reply: 'clean-res-reply', like: 'clean-res-like', at: 'clean-res-at', pm: 'clean-res-pm', history: 'clean-res-history', system: 'clean-res-system' };
    log(`自动清理已启用，${s.delay}秒后开始清理: ${selectedTypes.join(', ')}`);
    setTimeout(async () => {
      log('自动清理开始');
      for (const t of selectedTypes) {
        await cleanType(typeMap[t], statusMap[t], resultMap[t]);
      }
      log('自动清理完成');
    }, s.delay * 1000);
  })();

})();
