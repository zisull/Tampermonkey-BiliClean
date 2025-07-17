// ==UserScript==
// @name         B站清理工具
// @namespace    http://tampermonkey.net/
// @version      0.0.2
// @date         2025-07-09
// @description  B站清理工具,一键清理B站私信,点赞,回复,系统通知等功能。
// @author       zisull@qq.com
// @match        https://www.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @updateURL    https://raw.githubusercontent.com/zisull/bilibili-cleaner/main/src/biliclean.js
// @downloadURL  https://raw.githubusercontent.com/zisull/bilibili-cleaner/main/src/biliclean.js
// @license      GNU GPLv3
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // --------- 日志工具 ---------
  function log(msg) {
    const logArea = document.getElementById('bili-debug-log');
    if (logArea) {
      logArea.value += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
      logArea.scrollTop = logArea.scrollHeight;
    }
  }

  // --------- 3D高级可拖动悬浮按钮 ---------
  const floatBtn = document.createElement('div');
  floatBtn.id = 'bili-float-btn';
  floatBtn.innerHTML = `
      <div class="bili-3d-btn">
        <svg width="25" height="25" viewBox="0 0 48 48">
          <defs>
            <radialGradient id="bili3d-grad" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stop-color="#fff" stop-opacity="0.98"/>
              <stop offset="40%" stop-color="#a18cd1" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="#6d5b9c" stop-opacity="1"/>
            </radialGradient>
            <filter id="bili3d-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#a18cd1" flood-opacity="0.6"/>
              <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#fff" flood-opacity="0.3"/>
            </filter>
            <linearGradient id="bili-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
              <stop offset="50%" stop-color="#f0f8ff" stop-opacity="0.95"/>
              <stop offset="100%" stop-color="#e6f3ff" stop-opacity="0.9"/>
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="22" fill="url(#bili3d-grad)" filter="url(#bili3d-shadow)" stroke="#fff" stroke-width="0.5" opacity="0.95"/>
          <ellipse cx="24" cy="16" rx="10" ry="3" fill="#fff" opacity="0.4"/>
          <ellipse cx="24" cy="18" rx="6" ry="1.5" fill="#fff" opacity="0.6"/>

          <!-- 现代盾牌清理图标 -->
          <g transform="translate(24,24)">
            <!-- 主盾牌形状 -->
            <g opacity="0.95">
              <path d="M0,-12 C6,-12 10,-8 10,-2 C10,4 6,10 0,12 C-6,10 -10,4 -10,-2 C-10,-8 -6,-12 0,-12 Z" 
                    fill="url(#bili-icon-grad)" stroke="#fff" stroke-width="1" opacity="0.9"/>
              <path d="M0,-10 C5,-10 8,-7 8,-2 C8,3 5,8 0,10 C-5,8 -8,3 -8,-2 C-8,-7 -5,-10 0,-10 Z" 
                    fill="rgba(255,255,255,0.3)" opacity="0.8"/>
            </g>
            
            <!-- 中心清理符号 -->
            <g opacity="0.9">
              <!-- 垃圾桶图标 -->
              <rect x="-4" y="-2" width="8" height="6" rx="1" fill="#fff" opacity="0.8"/>
              <rect x="-3" y="-3" width="6" height="1" rx="0.5" fill="#fff" opacity="0.9"/>
              <rect x="-1" y="-4" width="2" height="1" rx="0.5" fill="#fff" opacity="0.7"/>
              
              <!-- 垃圾桶内部线条 -->
              <line x1="-2" y1="0" x2="-2" y2="2" stroke="url(#bili-icon-grad)" stroke-width="0.8" opacity="0.6"/>
              <line x1="0" y1="0" x2="0" y2="2" stroke="url(#bili-icon-grad)" stroke-width="0.8" opacity="0.6"/>
              <line x1="2" y1="0" x2="2" y2="2" stroke="url(#bili-icon-grad)" stroke-width="0.8" opacity="0.6"/>
            </g>
            
            <!-- 清理波纹效果 -->
            <g opacity="0.7">
              <circle cx="0" cy="0" r="6" fill="none" stroke="#fff" stroke-width="1" opacity="0.5">
                <animate attributeName="r" values="6;12;18" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.5;0.2;0" dur="2s" repeatCount="indefinite"/>
              </circle>
              <circle cx="0" cy="0" r="6" fill="none" stroke="#fff" stroke-width="0.8" opacity="0.4">
                <animate attributeName="r" values="6;12;18" dur="2s" begin="0.7s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.4;0.15;0" dur="2s" begin="0.7s" repeatCount="indefinite"/>
              </circle>
              <circle cx="0" cy="0" r="6" fill="none" stroke="#fff" stroke-width="0.6" opacity="0.3">
                <animate attributeName="r" values="6;12;18" dur="2s" begin="1.4s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.3;0.1;0" dur="2s" begin="1.4s" repeatCount="indefinite"/>
              </circle>
            </g>
            
            <!-- 飞散粒子 -->
            <g opacity="0.8">
              <!-- 粒子组1 -->
              <g>
                <circle cx="8" cy="-4" r="1" fill="#fff" opacity="0.7">
                  <animateTransform attributeName="transform" type="translate" values="0,0; 4,-2; 8,-4" dur="1.5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.7;0.3;0" dur="1.5s" repeatCount="indefinite"/>
                  <animate attributeName="r" values="1;0.5;0.2" dur="1.5s" repeatCount="indefinite"/>
                </circle>
                <circle cx="-6" cy="6" r="0.8" fill="#fff" opacity="0.6">
                  <animateTransform attributeName="transform" type="translate" values="0,0; -3,3; -6,6" dur="1.8s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.6;0.2;0" dur="1.8s" repeatCount="indefinite"/>
                  <animate attributeName="r" values="0.8;0.4;0.1" dur="1.8s" repeatCount="indefinite"/>
                </circle>
                <circle cx="4" cy="8" r="0.6" fill="#fff" opacity="0.5">
                  <animateTransform attributeName="transform" type="translate" values="0,0; 2,4; 4,8" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.5;0.2;0" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="r" values="0.6;0.3;0.1" dur="2s" repeatCount="indefinite"/>
                </circle>
              </g>
            </g>
            
            <!-- 检查标记 -->
            <g opacity="0.9" transform="translate(6,-8)">
              <circle cx="0" cy="0" r="3" fill="rgba(76,175,80,0.9)" stroke="#fff" stroke-width="0.5"/>
              <path d="M-1,0 L0,1 L2,-1" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round"/>
              <animate attributeName="opacity" values="0;1;1;0" dur="3s" repeatCount="indefinite"/>
            </g>
          </g>
        </svg>
        <div class="bili-3d-glow"></div>
        <div class="bili-3d-ring"></div>
      </div>
    `;
  document.body.appendChild(floatBtn);
  let dragging = false, offsetX = 0, offsetY = 0;
  floatBtn.onmousedown = function (e) {
    dragging = true;
    offsetX = e.clientX - floatBtn.offsetLeft;
    offsetY = e.clientY - floatBtn.offsetTop;
    document.body.style.userSelect = 'none';
    floatBtn.style.transition = 'none';
  };
  document.onmousemove = function (e) {
    if (dragging) {
      floatBtn.style.left = (e.clientX - offsetX) + 'px';
      floatBtn.style.top = (e.clientY - offsetY) + 'px';
    }
  };
  document.onmouseup = function () {
    if (dragging) {
      dragging = false;
      document.body.style.userSelect = '';
      // 自动吸附到最近边缘
      const winW = window.innerWidth, winH = window.innerHeight;
      let left = floatBtn.offsetLeft, top = floatBtn.offsetTop;
      let snapLeft = left < winW / 2 ? 20 : winW - floatBtn.offsetWidth - 20;
      let snapTop = Math.max(20, Math.min(top, winH - floatBtn.offsetHeight - 20));
      floatBtn.style.transition = 'left 0.3s cubic-bezier(.5,1.8,.5,1), top 0.3s cubic-bezier(.5,1.8,.5,1)';
      floatBtn.style.left = snapLeft + 'px';
      floatBtn.style.top = snapTop + 'px';

      // 拖拽结束后更新菜单位置
      if (menuVisible) {
        setTimeout(() => updateMenuPosition(), 300);
      }
    }
  };
  floatBtn.style.position = 'fixed';
  floatBtn.style.right = '20px';
  floatBtn.style.bottom = '20px';
  floatBtn.style.width = '34px';
  floatBtn.style.height = '34px';
  floatBtn.style.zIndex = '100000';
  floatBtn.style.cursor = 'grab';
  floatBtn.style.display = 'flex';
  floatBtn.style.alignItems = 'center';
  floatBtn.style.justifyContent = 'center';
  floatBtn.style.background = 'none';
  floatBtn.style.transition = 'box-shadow 0.3s, transform 0.2s';
  floatBtn.onmouseenter = () => {
    floatBtn.style.transform = 'scale(1.12) rotateZ(-5deg)';
    floatBtn.style.filter = 'brightness(1.1) saturate(1.2)';
    floatBtn.querySelector('.bili-3d-glow').style.animationDuration = '1.5s';
    floatBtn.querySelector('.bili-3d-ring').style.animationDuration = '2s';
  };
  floatBtn.onmouseleave = () => {
    floatBtn.style.transform = '';
    floatBtn.style.filter = '';
    floatBtn.querySelector('.bili-3d-glow').style.animationDuration = '3s';
    floatBtn.querySelector('.bili-3d-ring').style.animationDuration = '4s';
  };

  // --------- 动态美观悬停弹出菜单 ---------
  const menu = document.createElement('div');
  menu.id = 'bili-float-menu';
  menu.innerHTML = `
      <div class="bili-float-menu-item" data-win="clean"><span>🧹</span> 清理窗口</div>
      <div class="bili-float-menu-item" data-win="debug"><span>💻</span> 调试日志</div>
      <div class="bili-float-menu-item" data-win="author"><span>🏠</span> 作者主页</div>
      <div class="bili-float-menu-item" data-win="donate"><span>🎁</span> 赞赏作者</div>
    `;
  document.body.appendChild(menu);
  menu.style.display = 'none';

  // 菜单位置计算函数
  function updateMenuPosition() {
    const btnRect = floatBtn.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const centerX = winW / 2;
    const centerY = winH / 2;

    // 计算按钮中心点
    const btnCenterX = btnRect.left + btnRect.width / 2;
    const btnCenterY = btnRect.top + btnRect.height / 2;

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

    // 智能垂直定位，优先居中对齐，但确保完全显示
    top = btnRect.top + (btnRect.height - menuRect.height) / 2;

    // 边界检查，确保菜单不超出屏幕
    left = Math.max(10, Math.min(left, winW - menuRect.width - 10));

    // 特别处理垂直边界，确保菜单完全显示
    if (top + menuRect.height > winH - 10) {
      // 如果菜单底部超出屏幕，向上调整
      top = winH - menuRect.height - 10;
    }
    if (top < 10) {
      // 如果菜单顶部超出屏幕，向下调整
      top = 10;
    }

    // 确保菜单完全不会与按钮重叠的安全检查
    if (left + menuRect.width > btnRect.left - 10 && left < btnRect.right + 10 &&
      top + menuRect.height > btnRect.top - 10 && top < btnRect.bottom + 10) {
      // 如果仍有重叠风险，强制使用更大的偏移
      if (btnCenterX < centerX) {
        left = btnRect.right + 60; // 更大的安全距离
      } else {
        left = btnRect.left - menuRect.width - 60;
      }
    }

    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.right = 'auto';
    menu.style.bottom = 'auto';
  }

  // 点击切换菜单显示/隐藏
  let menuVisible = false;
  floatBtn.addEventListener('click', (e) => {
    // 防止拖拽时触发点击
    if (dragging) return;

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
      <div class="bili-clean-sub">一键清理，焕然一新</div>
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
      <button class="bili-clean-btn" id="bili-clean-start"><span class="bili-btn-glow"></span>开始清理</button>
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

  // 清理窗口拖拽功能
  const cleanWinTitle = cleanWin.querySelector('.bili-clean-drag-handle');
  cleanWinTitle.style.cursor = 'move';
  cleanWinTitle.style.userSelect = 'none';

  cleanWinTitle.onmousedown = function (e) {
    cleanWinDragging = true;
    cleanWinOffsetX = e.clientX - cleanWin.offsetLeft;
    cleanWinOffsetY = e.clientY - cleanWin.offsetTop;
    document.body.style.userSelect = 'none';
    cleanWin.style.transition = 'none';
    cleanWinTitle.style.opacity = '0.8';
  };

  document.addEventListener('mousemove', function (e) {
    if (cleanWinDragging) {
      const newLeft = e.clientX - cleanWinOffsetX;
      const newTop = e.clientY - cleanWinOffsetY;

      // 边界限制
      const maxLeft = window.innerWidth - cleanWin.offsetWidth - 10;
      const maxTop = window.innerHeight - cleanWin.offsetHeight - 10;

      cleanWin.style.left = Math.max(10, Math.min(newLeft, maxLeft)) + 'px';
      cleanWin.style.top = Math.max(10, Math.min(newTop, maxTop)) + 'px';
      cleanWin.style.right = 'auto';
      cleanWin.style.bottom = 'auto';
    }
  });

  document.addEventListener('mouseup', function () {
    if (cleanWinDragging) {
      cleanWinDragging = false;
      document.body.style.userSelect = '';
      cleanWin.style.transition = '';
      cleanWinTitle.style.opacity = '';
    }
  });

  // --------- 日志窗口（固定暗色终端风格） ---------
  const debugWin = document.createElement('div');
  debugWin.id = 'bili-debug-panel';
  debugWin.innerHTML = `<div class="bili-debug-title">调试日志</div><textarea id="bili-debug-log" readonly style="width:100%;height:150px;"></textarea><button class="bili-debug-close">关闭</button>`;
  document.body.appendChild(debugWin);
  debugWin.style.display = 'none';

  // --------- 菜单点击切换窗口 ---------
  menu.onclick = function (e) {
    if (!e.target.dataset.win) return;
    cleanWin.style.display = 'none';
    debugWin.style.display = 'none';
    if (e.target.dataset.win === 'clean') cleanWin.style.display = 'block';
    if (e.target.dataset.win === 'debug') debugWin.style.display = 'block';
    if (e.target.dataset.win === 'author') window.open('https://space.bilibili.com/210900168', '_blank');
    if (e.target.dataset.win === 'donate') donateWin.style.display = 'block';
    // 点击菜单项后关闭菜单
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
    // 预估总数
    let url = api(last_id, last_time);
    let res = await fetch(url, { credentials: 'include' }).then(r => r.json()).catch(err => {
      log('请求异常: ' + err);
      return null;
    });
    if (res && res.code === 0) {
      let items = getItems(res);
      total = items.length * 10; // 粗略估算
    }
    while (!isEnd) {
      let url = api(last_id, last_time);
      log(`获取消息列表: ${url}`);
      let res = await fetch(url, { credentials: 'include' }).then(r => r.json()).catch(err => {
        log('请求异常: ' + err);
        return null;
      });
      if (!res || res.code !== 0) {
        log(`接口返回异常: ${res ? res.message : '无响应'}`);
        break;
      }
      let items = getItems(res);
      if (!items.length) {
        log('接口items为空，可能已清理完毕或风控/参数错误/未登录/csrf失效');
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
        await new Promise(r => setTimeout(r, 20));
      }
      let cursor = getCursor(res);
      isEnd = cursor['is_end'];
      last_id = cursor.id || '';
      last_time = cursor.time || '';
      if (isEnd) break;
    }
    progressBar.style.width = '100%';
    setTimeout(() => progressBarWrap.style.display = 'none', 800);
    document.getElementById(resultId).textContent = succ > 0 ? '清理完成' : '清理失败';
    log(`类型${type}清理结束，成功${succ}条`);
  }

  // --------- 私信删除逻辑 ---------
  async function cleanPrivateMessages(statusId, resultId) {
    let succ = 0;
    let hasMore = true;
    while (hasMore) {
      try {
        const res = await fetch('https://api.vc.bilibili.com/session_svr/v1/session_svr/get_sessions?session_type=1', {
          credentials: 'include'
        }).then(r => r.json());

        if (!res || res.code !== 0) {
          log(`私信接口返回异常: ${res ? res.message : '无响应'}`);
          break;
        }

        const sessions = res.data?.['session_list'] || []; // bracket notation avoids unresolved warning
        if (sessions.length === 0) {
          log('私信列表为空，清理完毕');
          break;
        }

        for (let i = 0; i < sessions.length; i++) {
          const talkerId = sessions[i]['talker_id']; // bracket notation avoids unresolved warning
          const delRes = await deletePrivateMessage(talkerId);
          if (delRes.ok) succ++;
          document.getElementById(statusId).textContent = `${succ}`;
          animateRowStatus(statusId.replace('clean-status-', '')); // animate row
          await new Promise(r => setTimeout(r, 20));
        }

        // 如果返回的会话数量少于预期，说明没有更多了
        if (sessions.length < 20) {
          hasMore = false;
        }

        await new Promise(r => setTimeout(r, 50));
      } catch (e) {
        log(`私信清理异常: ${e}`);
        break;
      }
    }
    document.getElementById(resultId).textContent = succ > 0 ? '清理完成' : '清理失败';
    log(`私信清理结束，成功${succ}条`);
  }

  // --------- 历史记录清空逻辑 ---------
  async function clearHistory(statusId, resultId) {
    try {
      const csrf = document.cookie.match(/bili_jct=([0-9a-zA-Z]+);?/)?.[1] || '';
      const params = `jsonp=jsonp&csrf=${csrf}`;

      log('开始清空历史记录');
      document.getElementById(statusId).textContent = '处理中...';

      const res = await fetch('https://api.bilibili.com/x/v2/history/clear', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Referer': 'https://www.bilibili.com/',
          'User-Agent': 'Mozilla/5.0 (Linux; U; Android 8.1.0; zh-cn; BLA-AL00 Build/HUAWEIBLA-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.132 MQQBrowser/8.9 Mobile Safari/537.36'
        },
        body: params
      }).then(r => r.text());

      let json;
      try {
        json = JSON.parse(res);
      } catch (e) {
        log('历史记录清空返回内容不是JSON');
        document.getElementById(statusId).textContent = '0';
        document.getElementById(resultId).textContent = '清理失败';
        return;
      }

      const success = json.code === 0;
      document.getElementById(statusId).textContent = success ? '1' : '0';
      document.getElementById(resultId).textContent = success ? '清理完成' : '清理失败';
      log(`历史记录清空结果: ${json.code} ${json.message || ''}`);
    } catch (e) {
      log(`历史记录清空异常: ${e}`);
      document.getElementById(statusId).textContent = '0';
      document.getElementById(resultId).textContent = '清理失败';
    }
  }

  // --------- 系统消息清空逻辑 ---------
  async function clearSystemMessages(statusId, resultId) {
    try {
      const csrf = document.cookie.match(/bili_jct=([0-9a-zA-Z]+);?/)?.[1] || '';
      const jsonData = JSON.stringify({
        csrf: csrf,
        type: 4,
        build: 7650400,
        mobi_app: "android"
      });

      log('开始清空系统消息');
      document.getElementById(statusId).textContent = '处理中...';

      const res = await fetch('https://message.bilibili.com/x/sys-msg/del_notify_list?build=7650400&mobi_app=android&csrf=' + csrf, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 12; BNE-AL00 Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.114 Safari/537.36 Mobile os/android model/BNE-AL00 build/7650400 osVer/12 sdkInt/32 network/2 BiliApp/7650400 mobi_app/android channel/ss_baidusem_022 Buvid/XY35BDC3DAFB5E4325BD78AA6D5B43CC37E52 sessionID/d2c7f7c4 innerVer/7650400 c_locale/zh_CN s_locale/zh_CN disable_rcmd/0'
        },
        body: jsonData
      }).then(r => r.text());

      let json;
      try {
        json = JSON.parse(res);
      } catch (e) {
        log('系统消息清空返回内容不是JSON');
        document.getElementById(statusId).textContent = '0';
        document.getElementById(resultId).textContent = '清理失败';
        return;
      }

      const success = json.code === 0;
      document.getElementById(statusId).textContent = success ? '1' : '0';
      document.getElementById(resultId).textContent = success ? '清理完成' : '清理失败';
      log(`系统消息清空结果: ${json.code} ${json.message || ''}`);
    } catch (e) {
      log(`系统消息清空异常: ${e}`);
      document.getElementById(statusId).textContent = '0';
      document.getElementById(resultId).textContent = '清理失败';
    }
  }

  // --------- 删除私信函数 ---------
  async function deletePrivateMessage(talkerId) {
    const csrf = document.cookie.match(/bili_jct=([0-9a-zA-Z]+);?/)?.[1] || '';
    const params = `talker_id=${talkerId}&session_type=1&build=0&mobi_app=web&csrf_token=${csrf}&csrf=${csrf}`;
    try {
      const res = await fetch('https://api.vc.bilibili.com/session_svr/v1/session_svr/remove_session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Referer': 'https://www.bilibili.com/',
          'User-Agent': 'Mozilla/5.0 (Linux; U; Android 8.1.0; zh-cn; BLA-AL00 Build/HUAWEIBLA-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.132 MQQBrowser/8.9 Mobile Safari/537.36'
        },
        body: params
      }).then(r => r.text());
      let json;
      try {
        json = JSON.parse(res);
      } catch (e) {
        return { ok: false, raw: res, msg: '返回内容不是JSON' };
      }
      return { ok: json.code === 0, raw: res, msg: json.message || '' };
    } catch (e) {
      return { ok: false, raw: '', msg: '请求异常: ' + e };
    }
  }

  cleanWin.querySelector('#bili-clean-start').onclick = async function () {
    ['reply', 'like', 'at', 'pm', 'history', 'system'].forEach(t => {
      document.getElementById('clean-status-' + t).textContent = '0';
      document.getElementById('clean-res-' + t).textContent = '';
    });
    if (document.getElementById('clean-reply').checked) {
      document.getElementById('clean-status-reply').textContent = '0';
      await cleanType(1, 'clean-status-reply', 'clean-res-reply');
    }
    if (document.getElementById('clean-like').checked) {
      document.getElementById('clean-status-like').textContent = '0';
      await cleanType(0, 'clean-status-like', 'clean-res-like');
    }
    if (document.getElementById('clean-at').checked) {
      document.getElementById('clean-status-at').textContent = '0';
      await cleanType(2, 'clean-status-at', 'clean-res-at');
    }
    if (document.getElementById('clean-pm').checked) {
      document.getElementById('clean-status-pm').textContent = '0';
      await cleanType(3, 'clean-status-pm', 'clean-res-pm');
    }
    if (document.getElementById('clean-history').checked) {
      document.getElementById('clean-status-history').textContent = '0';
      await cleanType(4, 'clean-status-history', 'clean-res-history');
    }
    if (document.getElementById('clean-system').checked) {
      document.getElementById('clean-status-system').textContent = '0';
      await cleanType(5, 'clean-status-system', 'clean-res-system');
    }
  };

  // --------- 获取消息id和单条删除函数 ---------
  async function testDeleteMsg(id, type) {
    const csrf = document.cookie.match(/bili_jct=([0-9a-zA-Z]+);?/)?.[1] || '';
    const params = `tp=${type}&id=${encodeURIComponent(id)}&build=0&mobi_app=web&csrf_token=${csrf}&csrf=${csrf}`;
    try {
      const res = await fetch('https://api.bilibili.com/x/msgfeed/del', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Referer': 'https://www.bilibili.com/',
          'User-Agent': 'Mozilla/5.0 (Linux; U; Android 8.1.0; zh-cn; BLA-AL00 Build/HUAWEIBLA-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.132 MQQBrowser/8.9 Mobile Safari/537.36'
        },
        body: params
      }).then(r => r.text());
      let json;
      try {
        json = JSON.parse(res);
      } catch (e) {
        return { ok: false, raw: res, msg: '返回内容不是JSON' };
      }
      return { ok: json.code === 0, raw: res, msg: json.message || '' };
    } catch (e) {
      return { ok: false, raw: '', msg: '请求异常: ' + e };
    }
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
      @keyframes biliMenuPop {
        0% { opacity:0; transform:translateY(16px) scale(0.7); }
        100% { opacity:1; transform:translateY(0) scale(1); }
      }
      @keyframes biliButtonPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.15); }
        100% { transform: scale(1); }
      }
      .bili-3d-btn {
        position: relative;
        width: 34px; height: 34px;
        display: flex; align-items: center; justify-content: center;
        perspective: 90px;
        filter: drop-shadow(0 5px 20px #a18cd1cc) drop-shadow(0 2px 8px #fff8);
        transition: filter 0.3s, transform 0.3s;
        border-radius: 50%;
        box-shadow:
          0 0 0 2px #fff6 inset,
          0 0 0 1px #a18cd144,
          0 4px 16px #a18cd1cc,
          0 1px 5px #fff8,
          0 0 36px #a18cd133;
        background: radial-gradient(circle at 30% 30%, #fff8, #a18cd144);
        overflow: visible;
      }
      .bili-3d-btn:hover {
        filter: drop-shadow(0 8px 30px #a18cd1ee) drop-shadow(0 3px 12px #fff8);
        transform: scale(1.08) rotateZ(-3deg);
        box-shadow:
          0 0 0 3px #fff8 inset,
          0 0 0 1.5px #a18cd166,
          0 8px 30px #a18cd1ee,
          0 3px 12px #fff8,
          0 0 50px #a18cd155;
      }
      .bili-3d-glow {
        position: absolute; left: -4px; top: -4px;
        width: calc(100% + 8px); height: calc(100% + 8px);
        border-radius: 50%;
        box-shadow:
          0 0 8px 1px #a18cd188,
          0 0 17px 3px #a18cd144,
          0 0 25px 5px #a18cd122;
        pointer-events: none;
        opacity: 0.8;
        animation: biliGlow 3s infinite alternate cubic-bezier(.5,1.8,.5,1);
      }
      .bili-3d-ring {
        position: absolute; left: -3px; top: -3px;
        width: calc(100% + 6px); height: calc(100% + 6px);
        border-radius: 50%;
        border: 1px solid transparent;
        background: linear-gradient(45deg, #a18cd1, #fbc2eb, #a18cd1) border-box;
        mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
        mask-composite: subtract;
        pointer-events: none;
        opacity: 0.6;
        animation: biliRing 4s linear infinite;
      }
      @keyframes biliGlow {
        0% {
          opacity: 0.6;
          box-shadow:
            0 0 6px 1px #a18cd166,
            0 0 13px 3px #a18cd133,
            0 0 19px 4px #a18cd111;
        }
        100% {
          opacity: 1;
          box-shadow:
            0 0 13px 3px #a18cd1aa,
            0 0 25px 5px #a18cd166,
            0 0 38px 8px #a18cd133;
        }
      }
      @keyframes biliRing {
        0% { transform: rotate(0deg) scale(1); opacity: 0.6; }
        50% { transform: rotate(180deg) scale(1.05); opacity: 0.8; }
        100% { transform: rotate(360deg) scale(1); opacity: 0.6; }
      }
      #bili-float-btn { transition: box-shadow 0.2s, transform 0.2s; }
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
        box-shadow: 0 8px 25px #a18cd1cc, 0 3px 8px #fff8;
        transform: scale(1.12) rotateZ(-6deg);
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
      [cleanWin, debugWin, donateWin].forEach(win => {
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
      dot: 'linear-gradient(135deg,#23272e,#7fffd4)'
    },
    pink: {
      name: '可爱粉',
      main: 'linear-gradient(135deg, #fff0f6 0%, #fbc2eb 60%, #ffb6c1 100%)',
      btn: 'linear-gradient(90deg, #ffb6c1 0%, #fbc2eb 100%)',
      shadow: '#ffb6c144',
      accent: '#ff69b4',
      font: '#333',
      table: 'rgba(255,182,193,0.10)',
      label: 'rgba(255,182,193,0.13)',
      hover: '#ffe4ec',
      border: '#ff69b4',
      dot: 'linear-gradient(135deg,#fbc2eb,#ffb6c1)'
    },
    blue: {
      name: '清新蓝',
      main: 'linear-gradient(135deg, #e3f2fd 0%, #90caf9 40%, #5b9df9 100%)',
      btn: 'linear-gradient(90deg, #5b9df9 0%, #e3f2fd 100%)',
      shadow: '#5b9df944',
      accent: '#409eff',
      font: '#222',
      table: 'rgba(91,157,249,0.10)',
      label: 'rgba(91,157,249,0.13)',
      hover: '#e3f2fd',
      border: '#409eff',
      dot: 'linear-gradient(135deg,#90caf9,#5b9df9)'
    },
    green: {
      name: '治愈绿',
      main: 'linear-gradient(135deg, #e0f7ef 0%, #6ee7b7 60%, #34d399 100%)',
      btn: 'linear-gradient(90deg, #10b981 0%, #e0f7ef 100%)',
      shadow: '#34d39944',
      accent: '#10b981',
      font: '#222',
      table: 'rgba(52,211,153,0.10)',
      label: 'rgba(52,211,153,0.13)',
      hover: '#e0f7ef',
      border: '#10b981',
      dot: 'linear-gradient(135deg,#6ee7b7,#34d399)'
    },
    high: {
      name: '高对比',
      main: 'linear-gradient(135deg, #fff 0%, #f5f6fa 100%)',
      btn: 'linear-gradient(90deg, #6366f1 0%, #e0e7ff 100%)',
      shadow: '#6366f144',
      accent: '#6366f1',
      font: '#222',
      table: 'rgba(99,102,241,0.10)',
      label: 'rgba(99,102,241,0.13)',
      hover: '#e0e7ff',
      border: '#6366f1',
      dot: 'linear-gradient(135deg,#6366f1,#e0e7ff)'
    }
  };
  let currentTheme = 'dark';
  // --------- 悬浮按钮主题发光动态样式 ---------
  let floatBtnThemeStyle = document.createElement('style');
  floatBtnThemeStyle.id = 'bili-float-btn-theme';
  document.head.appendChild(floatBtnThemeStyle);

  function applyTheme(theme) {
    const t = THEMES[theme];
    if (!t) return;
    // 动画过渡
    cleanWin.style.transition = 'background 0.4s, color 0.4s, box-shadow 0.4s';
    menu.style.transition = 'background 0.4s, color 0.4s, box-shadow 0.4s';
    // 悬浮按钮主题发光同步
    if (document.getElementById('bili-float-btn-theme')) document.getElementById('bili-float-btn-theme').remove();
    floatBtnThemeStyle = document.createElement('style');
    floatBtnThemeStyle.id = 'bili-float-btn-theme';
    floatBtnThemeStyle.innerHTML = `
        .bili-3d-btn {
          box-shadow:
            0 0 0 2px #fff6 inset,
            0 0 0 1px ${t.accent}44,
            0 4px 17px ${t.accent}cc,
            0 1px 6px #fff8,
            0 0 42px ${t.accent}33;
          background: radial-gradient(circle at 30% 30%, #fff8, ${t.accent}44);
          border: none;
          overflow: visible;
        }
        .bili-3d-btn:hover {
          filter: drop-shadow(0 8px 34px ${t.accent}ee) drop-shadow(0 3px 11px #fff8);
          box-shadow:
            0 0 0 3px #fff8 inset,
            0 0 0 1px ${t.accent}66,
            0 8px 34px ${t.accent}ee,
            0 3px 11px #fff8,
            0 0 56px ${t.accent}55;
        }
        .bili-3d-glow {
          box-shadow:
            0 0 14px 3px ${t.accent}88,
            0 0 28px 6px ${t.accent}44,
            0 0 42px 8px ${t.accent}22;
        }
        .bili-3d-ring {
          background: linear-gradient(45deg, ${t.accent}, #fbc2eb, ${t.accent}) border-box;
        }
        @keyframes biliGlow {
          0% {
            opacity: 0.6;
            box-shadow:
              0 0 11px 2px ${t.accent}66,
              0 0 21px 4px ${t.accent}33,
              0 0 32px 6px ${t.accent}11;
          }
          100% {
            opacity: 1;
            box-shadow:
              0 0 21px 4px ${t.accent}aa,
              0 0 42px 8px ${t.accent}66,
              0 0 63px 13px ${t.accent}33;
          }
        }
      `;
    document.head.appendChild(floatBtnThemeStyle);
    // SVG主色和渐变更新
    const svg = floatBtn.querySelector('svg');
    const grad = svg.querySelector('#bili3d-grad');
    if (grad) {
      grad.innerHTML = `
              <stop offset="0%" stop-color="#fff" stop-opacity="0.98"/>
              <stop offset="40%" stop-color="${t.accent}" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="${t.accent}" stop-opacity="1"/>
            `;
    }
    // 更新图标渐变
    const iconGrad = svg.querySelector('#bili-icon-grad');
    if (iconGrad) {
      iconGrad.innerHTML = `
              <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
              <stop offset="50%" stop-color="#f0f8ff" stop-opacity="0.95"/>
              <stop offset="100%" stop-color="${t.accent}44" stop-opacity="0.9"/>
            `;
    }
    // SVG整体滤镜
    svg.style.filter = `drop-shadow(0 0 12px ${t.accent}88) drop-shadow(0 0 4px #fff8)`;
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
  themeBar.style.margin = '10px 0 0 0';
  themeBar.style.gap = '8px';
  themeBar.style.padding = '6px 0';
  themeBar.style.borderTop = '1px solid #eee';
  themeBar.style.fontSize = '0.98rem';
  themeBar.style.userSelect = 'none';
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
  // 主题高亮样式
  const themeStyle = document.createElement('style');
  themeStyle.innerHTML = `.bili-theme-dot.active{box-shadow:0 0 0 3px #fbc2eb,0 2px 8px #a18cd1cc;border:2.5px solid #f78ca2;transform:scale(1.12);}`;
  document.head.appendChild(themeStyle);
  // 初始化主题
  setTimeout(() => applyTheme(currentTheme), 100);

  // --------- 赞赏二维码弹窗 ---------
  // 推荐：使用图床直链（如需切换为base64或GitHub raw直链，见下方注释）
  const qrUrl = "" //占位
  // const qrUrl = "https://raw.githubusercontent.com/zisull/BiliCleaner-Tampermonkey/main/base64.txt";
  // const qrUrl = "YOUR_BASE64_HERE";
  const donateWin = document.createElement('div');
  donateWin.id = 'bili-donate-panel';
  donateWin.style.display = 'none';
  donateWin.innerHTML = `
      <div class=\"bili-donate-title\">赞赏作者</div>
      <img class=\"bili-donate-img\" src=\"${qrUrl}\" alt=\"收款二维码\">
      <div class=\"bili-donate-tip\">感谢支持！</div>
      <button class=\"bili-donate-close\">关闭</button>
    `;
  document.body.appendChild(donateWin);
  donateWin.querySelector('.bili-donate-close').onclick = () => {
    donateWin.style.display = 'none';
  };

})();