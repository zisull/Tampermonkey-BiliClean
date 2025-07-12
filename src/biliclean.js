// ==UserScript==
// @name         B站清理工具
// @namespace    http://tampermonkey.net/
// @version      0.0.2
// @date         2025-07-09
// @description  B站清理工具UI，悬浮菜单切换多窗口，支持可拖动图标，三类消息批量清理、单条测试、调试日志等功能。
// @author       zisull@qq.com
// @match        https://www.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @updateURL    https://raw.githubusercontent.com/zisull/bilibili-cleaner/main/src/biliclean.js
// @downloadURL  https://raw.githubusercontent.com/zisull/bilibili-cleaner/main/src/biliclean.js
// @license      GNU GPLv3
// @grant        none
// ==/UserScript==

(function() {
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
        <svg width="38" height="38" viewBox="0 0 48 48">
          <defs>
            <radialGradient id="bili3d-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fff" stop-opacity="0.95"/>
              <stop offset="60%" stop-color="#a18cd1" stop-opacity="0.85"/>
              <stop offset="100%" stop-color="#6d5b9c" stop-opacity="1"/>
            </radialGradient>
            <filter id="bili3d-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#a18cd1" flood-opacity="0.5"/>
            </filter>
          </defs>
          <circle cx="24" cy="24" r="22" fill="url(#bili3d-grad)" filter="url(#bili3d-shadow)"/>
          <ellipse cx="24" cy="14" rx="8" ry="2.5" fill="#fff8" opacity="0.7"/>
          <text x="50%" y="58%" text-anchor="middle" fill="#fff" font-size="16" font-family="'Microsoft Yahei',Arial,sans-serif" dy=".3em" style="font-weight:bold;text-shadow:0 2px 8px #a18cd1cc;">清</text>
        </svg>
        <div class="bili-3d-glow"></div>
      </div>
    `;
    document.body.appendChild(floatBtn);
    let dragging = false, offsetX = 0, offsetY = 0;
    floatBtn.onmousedown = function(e) {
      dragging = true;
      offsetX = e.clientX - floatBtn.offsetLeft;
      offsetY = e.clientY - floatBtn.offsetTop;
      document.body.style.userSelect = 'none';
      floatBtn.style.transition = 'none';
    };
    document.onmousemove = function(e) {
      if (dragging) {
        floatBtn.style.left = (e.clientX - offsetX) + 'px';
        floatBtn.style.top = (e.clientY - offsetY) + 'px';
      }
    };
    document.onmouseup = function() {
      if (dragging) {
        dragging = false;
        document.body.style.userSelect = '';
        // 自动吸附到最近边缘
        const winW = window.innerWidth, winH = window.innerHeight;
        let left = floatBtn.offsetLeft, top = floatBtn.offsetTop;
        let snapLeft = left < winW/2 ? 20 : winW - floatBtn.offsetWidth - 20;
        let snapTop = Math.max(20, Math.min(top, winH - floatBtn.offsetHeight - 20));
        floatBtn.style.transition = 'left 0.3s cubic-bezier(.5,1.8,.5,1), top 0.3s cubic-bezier(.5,1.8,.5,1)';
        floatBtn.style.left = snapLeft + 'px';
        floatBtn.style.top = snapTop + 'px';
      }
    };
    floatBtn.style.position = 'fixed';
    floatBtn.style.right = '20px';
    floatBtn.style.bottom = '20px';
    floatBtn.style.width = '52px';
    floatBtn.style.height = '52px';
    floatBtn.style.zIndex = '100000';
    floatBtn.style.cursor = 'grab';
    floatBtn.style.display = 'flex';
    floatBtn.style.alignItems = 'center';
    floatBtn.style.justifyContent = 'center';
    floatBtn.style.background = 'none';
    floatBtn.style.transition = 'box-shadow 0.3s, transform 0.2s';
    floatBtn.onmouseenter = () => floatBtn.style.transform = 'scale(1.08) rotateZ(-3deg)';
    floatBtn.onmouseleave = () => floatBtn.style.transform = '';

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
    floatBtn.addEventListener('mouseenter', () => { menu.style.display = 'block'; menu.classList.add('bili-menu-animate-in'); });
    floatBtn.addEventListener('mouseleave', () => { setTimeout(()=>{if(!menu.matches(':hover'))menu.style.display='none';}, 200); });
    menu.addEventListener('mouseleave', () => { menu.style.display = 'none'; });
    menu.addEventListener('mouseenter', () => { menu.style.display = 'block'; });
    menu.style.position = 'fixed';
    menu.style.right = '100px';
    menu.style.bottom = '40px';
    menu.style.zIndex = '100001';
    menu.style.background = 'rgba(255,255,255,0.98)';
    menu.style.borderRadius = '18px';
    menu.style.boxShadow = '0 6px 32px #a18cd144, 0 1.5px 8px #fff8';
    menu.style.padding = '12px 0';
    menu.style.minWidth = '120px';
    menu.style.fontFamily = 'Microsoft Yahei,Arial,sans-serif';
    menu.style.userSelect = 'none';
    menu.style.backdropFilter = 'blur(6px)';
    Array.from(menu.children).forEach((item,i)=>{
      item.style.padding = '12px 28px';
      item.style.cursor = 'pointer';
      item.style.fontSize = '1.08rem';
      item.style.borderRadius = '12px';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.gap = '10px';
      item.style.transition = 'background 0.18s, transform 0.18s';
      item.onmouseenter = ()=>{item.style.background='#f3e6ff';item.style.transform='scale(1.06)';};
      item.onmouseleave = ()=>{item.style.background='';item.style.transform='';};
      item.style.animation = `biliMenuPop 0.3s cubic-bezier(.5,1.8,.5,1) ${i*0.06}s both`;
    });

    // --------- 3D立体清理窗口 ---------
    const cleanWin = document.createElement('div');
    cleanWin.id = 'bili-clean-panel';
    cleanWin.innerHTML = `
      <div class="bili-clean-title">B站清理工具</div>
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

    // --------- 日志窗口（固定暗色终端风格） ---------
    const debugWin = document.createElement('div');
    debugWin.id = 'bili-debug-panel';
    debugWin.innerHTML = `<div class="bili-debug-title">调试日志</div><textarea id="bili-debug-log" readonly style="width:100%;height:150px;"></textarea><button class="bili-debug-close">关闭</button>`;
    document.body.appendChild(debugWin);
    debugWin.style.display = 'none';

    // --------- 菜单点击切换窗口 ---------
    menu.onclick = function(e) {
      if (!e.target.dataset.win) return;
      cleanWin.style.display = 'none';
      debugWin.style.display = 'none';
      if (e.target.dataset.win === 'clean') cleanWin.style.display = 'block';
      if (e.target.dataset.win === 'debug') debugWin.style.display = 'block';
      if (e.target.dataset.win === 'author') window.open('https://space.bilibili.com/210900168', '_blank');
      if (e.target.dataset.win === 'donate') donateWin.style.display = 'block';
      menu.style.display = 'none';
    };
    cleanWin.querySelector('.bili-clean-close').onclick = ()=>{cleanWin.style.display='none';};
    debugWin.querySelector('.bili-debug-close').onclick = ()=>{debugWin.style.display='none';};

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
      let res = await fetch(url, {credentials: 'include'}).then(r=>r.json()).catch(err=>{log('请求异常: '+err);return null;});
      if (res && res.code === 0) {
        let items = getItems(res);
        total = items.length * 10; // 粗略估算
      }
      while (!isEnd) {
        let url = api(last_id, last_time);
        log(`获取消息列表: ${url}`);
        let res = await fetch(url, {credentials: 'include'}).then(r=>r.json()).catch(err=>{log('请求异常: '+err);return null;});
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
          log(`删除id=${id} 结果: ${delRes.ok?'成功':'失败'} ${delRes.msg}`);
          if (delRes.ok) succ++;
          document.getElementById(statusId).textContent = `${succ}`;
          animateRowStatus(statusId.replace('clean-status-', '')); // make animateRowStatus used
          done++;
          progressBar.style.width = total ? Math.min(100, Math.round(done/total*100)) + '%' : '30%';
          await new Promise(r=>setTimeout(r, 20));
        }
        let cursor = getCursor(res);
        isEnd = cursor['is_end'];
        last_id = cursor.id || '';
        last_time = cursor.time || '';
        if (isEnd) break;
      }
      progressBar.style.width = '100%';
      setTimeout(()=>progressBarWrap.style.display='none', 800);
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

    cleanWin.querySelector('#bili-clean-start').onclick = async function() {
      ['reply','like','at','pm','history','system'].forEach(t=>{
        document.getElementById('clean-status-'+t).textContent = '0';
        document.getElementById('clean-res-'+t).textContent = '';
      });
      if(document.getElementById('clean-reply').checked) {
        document.getElementById('clean-status-reply').textContent = '0';
        await cleanType(1, 'clean-status-reply', 'clean-res-reply');
      }
      if(document.getElementById('clean-like').checked) {
        document.getElementById('clean-status-like').textContent = '0';
        await cleanType(0, 'clean-status-like', 'clean-res-like');
      }
      if(document.getElementById('clean-at').checked) {
        document.getElementById('clean-status-at').textContent = '0';
        await cleanType(2, 'clean-status-at', 'clean-res-at');
      }
      if(document.getElementById('clean-pm').checked) {
        document.getElementById('clean-status-pm').textContent = '0';
        await cleanType(3, 'clean-status-pm', 'clean-res-pm');
      }
      if(document.getElementById('clean-history').checked) {
        document.getElementById('clean-status-history').textContent = '0';
        await cleanType(4, 'clean-status-history', 'clean-res-history');
      }
      if(document.getElementById('clean-system').checked) {
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
      .bili-3d-btn {
        position: relative;
        width: 52px; height: 52px;
        display: flex; align-items: center; justify-content: center;
        perspective: 120px;
        filter: drop-shadow(0 6px 24px #a18cd1cc) drop-shadow(0 2px 6px #fff8);
        transition: filter 0.2s;
        border-radius: 50%;
        box-shadow: 0 0 0 2px #fff4 inset, 0 3px 12px #a18cd1cc, 0 1px 3px #fff8;
      }
      .bili-3d-btn:hover { filter: drop-shadow(0 10px 36px #a18cd1ee); }
      .bili-3d-glow {
        position: absolute; left: 0; top: 0; width: 100%; height: 100%;
        border-radius: 50%;
        box-shadow: 0 0 10px 2px #fbc2eb88, 0 0 4px 1px #a18cd1cc;
        pointer-events: none;
        opacity: 0.7;
        animation: biliGlow 2.2s infinite alternate cubic-bezier(.5,1.8,.5,1);
      }
      @keyframes biliGlow {
        0% { opacity: 0.7; box-shadow: 0 0 10px 2px #fbc2eb88, 0 0 4px 1px #a18cd1cc; }
        100% { opacity: 1; box-shadow: 0 0 18px 4px #fbc2ebcc, 0 0 8px 2px #a18cd1ff; }
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
      .bili-clean-title { font-size: 1.35rem; font-weight: bold; letter-spacing: 1px; text-align: center; text-shadow:0 2px 8px #a18cd1cc; }
      .bili-clean-sub { font-size: 0.95rem; margin-top: 2px; color: #f3e6ff; text-align: center; margin-bottom: 10px; }
      .bili-clean-options { margin: 10px 0 10px 0; }
      .bili-clean-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
      .bili-clean-row label { background: rgba(255,255,255,0.13); border-radius: 8px; padding: 5px 10px; font-size: 0.98rem; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow:0 1px 2px #fff2; transition: background 0.18s, box-shadow 0.18s; }
      .bili-clean-row label:hover { background: #f3e6ff; color: #a18cd1; box-shadow:0 2px 6px #a18cd1aa; }
      .bili-clean-row input[type="checkbox"] { accent-color: #a18cd1; width: 15px; height: 15px; }
      .bili-clean-btn { width: 100%; margin: 10px 0 10px 0; padding: 10px 0; background: linear-gradient(90deg, #7f7fd5 0%, #86a8e7 50%, #91eac9 100%); border: none; border-radius: 12px; font-size: 1.05rem; font-weight: bold; color: #fff; cursor: pointer; box-shadow: 0 2px 8px #a18cd110; transition: background 0.2s, box-shadow 0.2s; position:relative; overflow:hidden; }
      .bili-btn-glow { position:absolute; left:0; top:0; width:100%; height:100%; border-radius:12px; box-shadow:0 0 16px 4px #fbc2eb88, 0 0 6px 1px #a18cd1cc; pointer-events:none; opacity:0.5; animation:biliGlow 2.2s infinite alternate cubic-bezier(.5,1.8,.5,1); z-index:0; }
      .bili-clean-btn span { z-index:1; position:relative; }
      .bili-clean-btn:hover { background: linear-gradient(90deg, #91eac9 0%, #86a8e7 50%, #7f7fd5 100%); box-shadow:0 6px 18px #a18cd1cc; }
      .bili-clean-table { background: rgba(255,255,255,0.13); border-radius: 10px; padding: 6px 0 0 0; margin-top: 6px; box-shadow:0 1px 4px #fff2; }
      .bili-clean-thead, .bili-clean-tbody > div { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 0.98rem; }
      .bili-clean-thead { font-weight: bold; color: #e0d7ff; border-bottom: 1px solid rgba(255,255,255,0.18); }
      .bili-clean-tbody > div { border-bottom: 1px solid rgba(255,255,255,0.09); color: #fff; transition: background 0.18s; }
      .bili-clean-tbody > div:last-child { border-bottom: none; }
      .bili-clean-tbody > div[data-anim] { animation: biliRowAnim 0.5s cubic-bezier(.5,1.8,.5,1); }
      @keyframes biliRowAnim { 0%{background:#fbc2eb44;} 100%{background:transparent;} }
      .bili-clean-close { width: 100%; margin: 10px 0 0 0; padding: 7px 0; background: rgba(255,255,255,0.22); border: none; border-radius: 8px; font-size: 0.98rem; color: #fff; cursor: pointer; transition: background 0.18s; }
      .bili-clean-close:hover { background: rgba(255,255,255,0.32); }
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
      .bili-debug-close:hover { background: #222; color: #fff176; }
      #bili-clean-progress { box-shadow: 0 2px 6px #a18cd1aa; background: rgba(255,255,255,0.22); border: 1px solid #fff4; height: 5px !important; border-radius: 3px !important; }
      #bili-clean-progress-bar { border-radius: 3px; }
      /* 主题切换动画 */
      #bili-clean-panel, #bili-float-menu {
        transition: background 0.4s, color 0.4s, box-shadow 0.4s;
      }
      /* 悬浮按钮/菜单动效增强 */
      #bili-float-btn:hover {
        box-shadow: 0 12px 36px #a18cd1cc, 0 4px 12px #fff8;
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
      .bili-donate-close:hover { background: #a18cd1; color: #fff; }
    `;
    document.head.appendChild(style);

    // --------- 清理窗口动效输出优化 ---------
    function animateRowStatus(type) {
      const row = document.querySelector(`#clean-status-${type}`)?.parentElement;
      if (row) {
        row.setAttribute('data-anim', '1');
        setTimeout(()=>row.removeAttribute('data-anim'), 600);
      }
    }
    // 在批量清理和单条清理时调用 animateRowStatus(type)
    // 例如: animateRowStatus('reply');

    // --------- ESC关闭窗口 ---------
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        [cleanWin, debugWin, donateWin].forEach(win=>{if(win.style.display==='block')win.style.display='none';});
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
      if(document.getElementById('bili-float-btn-theme')) document.getElementById('bili-float-btn-theme').remove();
      floatBtnThemeStyle = document.createElement('style');
      floatBtnThemeStyle.id = 'bili-float-btn-theme';
      floatBtnThemeStyle.innerHTML = `
        .bili-3d-btn {
          box-shadow: 0 0 0 3px #fff6 inset, 0 4px 18px ${t.accent}cc, 0 1.5px 6px #fff8;
          background: linear-gradient(145deg, ${t.dot.replace('linear-gradient(135deg,','').replace(')','').split(',')[0]}, #fff4 100%);
          border: 2px solid ${t.accent}44;
          overflow: visible;
        }
        .bili-3d-btn:hover {
          filter: drop-shadow(0 10px 36px ${t.accent}ee);
          box-shadow: 0 0 0 4px #fff8 inset, 0 8px 32px ${t.accent}ee, 0 2px 8px #fff8;
        }
        .bili-3d-glow {
          box-shadow: 0 0 18px 4px ${t.accent}88, 0 0 8px 2px ${t.accent}cc;
        }
        @keyframes biliGlow {
          0% { opacity: 0.7; box-shadow: 0 0 10px 2px ${t.accent}88, 0 0 4px 1px ${t.accent}cc; }
          100% { opacity: 1; box-shadow: 0 0 28px 8px ${t.accent}cc, 0 0 12px 3px ${t.accent}ff; }
        }
      `;
      document.head.appendChild(floatBtnThemeStyle);
      // SVG主色
      floatBtn.querySelector('svg circle').setAttribute('fill', t.accent);
      // SVG高光（ellipse）
      floatBtn.querySelector('svg ellipse').setAttribute('fill', '#fff8');
      // SVG边框（渐变）
      floatBtn.querySelector('svg').style.filter = `drop-shadow(0 0 8px ${t.accent}88)`;
      // 主面板
      if(theme==='dark') {
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
        cleanWin.querySelectorAll('.bili-clean-row label').forEach(lab=>{
          lab.style.background = '#23272e';
          lab.style.color = '#e0e0e0';
          lab.style.borderRadius = '6px';
          lab.style.fontFamily = "'Microsoft Yahei', Arial, sans-serif";
        });
        cleanWin.querySelector('.bili-clean-table').style.background = '#23272e';
        cleanWin.querySelectorAll('.bili-clean-thead').forEach(th=>th.style.color = '#7fffd4');
        cleanWin.querySelectorAll('.bili-clean-tbody > div').forEach(row=>{
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
        cleanWin.querySelectorAll('.bili-clean-row label').forEach(lab=>{
          lab.style.background = t.label;
          lab.style.color = t.font;
          lab.style.borderRadius = '8px';
          lab.style.fontFamily = "'Microsoft Yahei', Arial, sans-serif";
        });
        cleanWin.querySelector('.bili-clean-table').style.background = t.table;
        cleanWin.querySelectorAll('.bili-clean-thead').forEach(th=>th.style.color = t.border);
        cleanWin.querySelectorAll('.bili-clean-tbody > div').forEach(row=>{
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
      Array.from(menu.children).forEach(item=>{
        if(item.classList && item.classList.contains('bili-float-menu-item')){
          item.style.background = 'none';
          item.style.color = t.font;
          item.style.fontFamily = "'Microsoft Yahei', Arial, sans-serif";
          item.style.fontWeight = 'bold';
        }
      });
      // 主题高亮
      document.querySelectorAll('.bili-theme-dot').forEach(btn=>{
        btn.classList.toggle('active', btn.dataset.theme===theme);
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
    Object.entries(THEMES).forEach(([k,v])=>{
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
      dot.onclick = ()=>applyTheme(k);
      themeBar.appendChild(dot);
    });
    menu.appendChild(themeBar);
    // 主题高亮样式
    const themeStyle = document.createElement('style');
    themeStyle.innerHTML = `.bili-theme-dot.active{box-shadow:0 0 0 3px #fbc2eb,0 2px 8px #a18cd1cc;border:2.5px solid #f78ca2;transform:scale(1.12);}`;
    document.head.appendChild(themeStyle);
    // 初始化主题
    setTimeout(()=>applyTheme(currentTheme), 100);

    // --------- 赞赏二维码弹窗 ---------
    // 推荐：使用图床直链（如需切换为base64或GitHub raw直链，见下方注释）
    const qrUrl = "data:image/jpeg;base64,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nLEATCWHanMEhW3qRRxUmpkEHZtK2zdssWbBm47VDGcDS3ijU2JlY2IltIAHCa6UOaeHRQ845K52BEa1ZROxbkCNjR9uyamwmfkpzDY9psUnDJEwV08lDqC0i2xe8FmCdigOKFTdavpTHCUyi0ykcsQjamgu3oqT74X5VhkmOqglVRDYiDDZYq1UA5IhcJyXyf7QLoAke1Vc1JOA4pkPcnYlOczZPitp/wAlHD9v25J7pBVIHNBPI4qrHH5RDDMKJgtv9plTbK1e8OqnYqt+1Pc0j8ra1MaJWLa1SyRK1gQOc2IltquoNdtWqCU1lUADeiSaz1bNjlUZVc1SO1ODYd7iq0ZwAUngyGwqvAeHdhRL2ymmou1q00arjKam0vIxUTObT9vVm7USdpymrvV4q8VMFTRqmU8m0raVtOWQJllvlaxJU2q15y6pIUztV5WmeSxCsZy0JNdILWcT/wDN7//EAC4QAQACAAMIAgIDAQEAAwEAAAEAESExQRAgUWFxobHwUIFgkcHR4fEwQHCQgP/aAAgBAQABPyH/APgZG2v9JlU4qpDopadghMLjmT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPck9yT3JPckqMC+ex61tNMV4EtWv0qj+oN1uxu5YVs6V/wB2Kyt1Hjj/AJsAKKev5r73ve973ve973ve973ve973ve973ve973ve973ve973ve973ve973ve973ve973ve973ve973ve973ve973ve973ve973ve973fYdladV+9+NlI2XhxCnvuhEBqSpFOv8xkqrFX85xkLmZjE9U4LUv/ANEAECY59IaIyt+doYKYL0z3vL8TuX536HXe8vxO5fnfodd7y/E7l+d+h13vL8TuX536HXe8vxO5fnfodd7y/E7l+d+h13vL8TuX536HXe8vxO5f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7UDWUfLcJutltDMIks7TrvMBOhAAKMD4pj0Ou95fidy+PYJvU7gwxOWMMhHpDfFZ0t9mBLcv0QxdteKx7SZc182wWjjEz4n1UcqF7bLeOMRqGXCCa/sbaE39sakvsTR7jtQSnKItjcMplh9anK/pEsD5YxbB8YDHodd7y/E7l8uwoBhMljEGMWbri7b8Th3EwBMv9BtfmZiBAAAyNmf9X9zAgxU3wYbUERLGLi2nTpw+UY9DrveX4ncvkmEXFhfaNhbjqH8blhAVnzrjIUrHibc/f7jMgP5av43+IIqLMqXMSkeDtwkYU5wvFPqD4RRs1bS/k2PQ673l+J3L5NgA2Be0nMguZl019s/52Jt6O9pKdhj3Fdt3K1bAhJlFNkDa6bIp5lr3IPjcDIDp8mx6HXe8vxO5fLMAiycI6bmBr13MV1nCLlx39bXK+Kx9xUUzKeOBtU9CmZI1mDngoqj5dj0Ou95fidy+bYIr8sRuAihsDdTKCQdHzbHodd7y/E7l+dsMeh13vL8TuXwWL2mANWVr1+W88888888888888888888888888888888888888888888888888888wG4wO6b0OXwfodd7y/E7l+d+h13vL8TuX536HXe8vxO5fnfodd7y/E7l+d+h13vL8TuX536HXe8vxO5fnfodd7y/E7l+d+h13vL8TuX536HXe8vxO5fnfodd7y/E7l+d+h13vL8TuX536HXe8vxO5fnfodd7y/E7l+d+h13vL8TuX536HXe8vxO5fnfodd7y/E7l+d+h13vL8TuX536HXe8vxO5fnfodd7y/E7l+d+h13vL8TuX536HXe8vxO5fnfodd7y/E7l+d+h13vL8TuX536HXe8vxO5fnfodd7y/E7l+d+h13vL8TuX536HXe8vxO5fnfodd7y/E7l+d+h13vL8TuX536HXe8vxO5fnfodd7y/E7l+d+h13OyoszdnMkrHJzuHnm3D+sWfxyTL792O0xzPzPv9jPP0qZpKJ7YXKCNporYiPpYdYBQfAV/4CUCcyZ8udJxj5s84YzXUf5xSZbMeOOM7ojiI44fkPa8Jmn+885E8w4blOgwvbKTK3o6TP19vKdkVP/kVO/dH8XpOOnJfzOxaP6isj1vNWuobGF/BhP4QzKd95mgdT8N7P0ZtJyEOszHrp/kKmgT7YDsAE90HpM6XU+U7ewgWQPr4tbNvqd0gzOfqKmoOiHaGP9ReS6hmknrT+YTP9bJ4gRpx6Gaw9Jl6jJH94nmX18kC5FwfJ4z9feZ2I0y64TOuuM74Smm/QWaw+v8AUD2Sj+Jmh1f6zIS9U7EfsnCBZA+vwJbNvqZo/pM2c/w1GjPpERkPRReVekryf2f1NGuomoTr/uakdf8AUdddRjpL9/0iet9v6jzUvHPrHjEEP84j/cRKH/K/89ZD977hXz/lwWIur9INpkcB+kOBycvImZ/b+oaC6X/U0Z6OLo/X+5qT0/1NSelQOb/T+oLPqp1A9ZfyXjMgmyUfSGQKAsgfX/6xi4QeEqxsVbjmB5XJ/wB9P++iI04JCimBeMUig02VFTc63bH6VsqZoYlZbb3c1EMMWpU5PeQYxcOKu6iU05zDhbVj393GGVNLizD11bArC5E/7SJilzDhORggIHDP8c6g49J7z/cZUdFzHFvj7c95/vYdUXEo4T7NVKhSmdgJ/Q8Iz5i2zGAcRDiiZc9f/JaKamsvciw9rajhvxgEvI0mHdAKIUkwsjxSsC14zH1GIXCiDbgyll048F1KLDKMkTh1Nal+RWLUq8b+JV204v8AkOK2QXKYL1hw8TOiPCZH7ZSvkMTjEISy1dQhpjRjjRxXEv1+OKAgLtnuf7BHBAIt9V0n+z3P9iIAxoLDQlaG1i1EvwznAO8mZrNUGUmYwmNBcNnhhCGhyiRaJ02sUtXL6gEIFcOceuiFtMIy+p4z1ucpHb4iPXmS5LYoLA53L0r7rpEQCKSKKgcMNZUmCdXKWQdlo7Mre0whSAq1MOOD1imVfH6mGtCH7i7/AHlSucx/HaFdXhMYJxZYF1L8SLKjszUzpsqmK8RY4SpqV5J3qKPmqmJu9Se4mBqcbOU6FENqi0HD9S/yIHAnbEA3OUz2+47bLlMQuwxOsYLd4kt1qrAjG7Ohz2HTrEv7nLwAxkyHptrcApQKpzYr22FwCUsqa7EBYUFYt6fjmURX1lYKNZ7VjKKR4wCS9JRwOstdM6TnP0jrbXV1wl9ZpxnepbLIQCgXH/Tf6ju3ONz/AKb/AFBYtMNhKVri/UKbtXEIohjPWkalY/5iVIciWS2uzAhroRXWy/ULxjszjoUGjE0NK0TJB6XOGriUVDhcGK+U83wwuLFXMJtJAahNg1lFscd/Hg2Qj5iLduOJxT/qz/qy0leeMZFmtw0KM0EZKT/sT/sT/sbUpSzLz3EdvqjLZ01U8IMNq19Mil7WLFgYTkR22XN2IrSPEhdvQ3L/ADgTACOH/wC3v//aAAwDAQACAAMAAAAQ8888888888888888888888888888888888888888888888888888888888888888889c08888888888888888888888888888888888888888888888888888888888+988cc888888888888888888888888888888888888888888888888888888888888888s888888888888888888888888888888888888888888888888888888888888808888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888s88888888888888888888888888888888888888888888U88888888888888888888888888888808A8888888888888888888888888888888U888888888888888888888888888808w888Y8M808888888888888888888888888U888888888888888888888888884848I8E88sc4M4w88888888888888888888888U88888888888888888888888880Mw88s0M8888UcYww8888888888888888888888U888888888888888888888888kwU884kc44UE8c8sI8c888888888888888888888U88888888888888888888888M8UA8gwU8g0UU84AooY0o88888888888888888888U88888888888888888888888c88cIcc4g0MAUUc88cE0888888888888888888888U8888888888888888888888c48M088my6gc8s0v98o888o8888888888888888888U88888888888888888888888s4YUs2ivV/9tfs70888sc88888888888888888888U8888888888888888888884U80MU0SNL4hxVBJ33gcc88wE888888888888888888U888888888888888888888888cAwM5zKVBZFBFAxssk8888888888888888888888U88888888888888888888sUY880g4pF6+9S6y6WUM4884M0888888888888888888U88888888888888888888888c8cYc1dUz9bIvoVtM8sc888888888888888888888U888888888888888888884YM8gwUMrWnwH5nhgOPkM4k80Q888888888888888888U8888888888888888888888888ocU/qlkMIDqAltM0Yw088888888888888888888U888888888888888888888wYks4oIX2l00tkswSh80sMAI4888888888888888888U888888888888888888888s884888CSKQRbUDiZA4Us088c888888888888888888U888888888888888888888808c488LW92+ee8t6VMc8so88888888888888888888U8888888888888888888888c8k84E8g00I4s8U48nxhz+c8888888888888888888U88888888888888888888888s88Uc0s8EsMYUQ4WnAkF+88888888888888888888U888888888888888888888888cwIw808UMsc88wqBwYvF88888888888888888888U8888888888888888888888888oskoQscI8cs88th9/Ll88888888888888888888U88888888888888888888888888Ac8848Esk4U4UaBNXc88888888888888888888U88888888888888888888888888840848Q8sscsc8888888888888888888888888U88888888888888888888888888888sk8g848k888888888888888888888888888U88888888888888888888888888888888c8c88888888888888888888888888888U8888888888888888888s88888888888888888888888888s88888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8888888888888888888888888888888888888888888888888888888888888888U8ATBw24+208888888888888888888888888888888888888888888888841z75ZTixCCCCCCCSxBgS1Uz2y79x88888888888888888888888849/wDMPeM0AwAIwggggggggggggggggggggggggggoocUcYMs0g4oIskoMw4owMsocYwgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggSQihyTgggihDxhhgDwggggggggggggggggggggggggggggggggggggggggggggghf11o1KFqkbKcOqEOurBwgggggggggggggggggggggggggggggggggggggggggggghS91l1BK60l/2TzQMkLPAggggggggggggggggggggggggggggggggggggggggggggggIk88YwAgAggAowEgwsAgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggv/xAArEQEAAgEDAwMCBgMAAAAAAAABABExECFBUFFhIHGhscFAYHCRoNEwgfD/2gAIAQMBAT8Q/IS1Dro3rX8C2pXpAuZ6xlqEnrdlTj1fKXA2g6GpCjcQ9Xy0w9VaPV8tMNHStvRz1fKEw0JWlRK0GGer5QmMFxtjpWxEraM8oNvV8oaxHQIG+hidY5egXBGI3yyjOgvrA50YNpeX7Q7oAlSAYzZ1dG5abDS5cuWQppa/ITN4INsQxD9oKfDErZ64wDmCA4ipWWKG43M+gieeuhJRCm9LtYd5krtMPv1xEJFf3wJX1Ts/KIudCrYOuq7Yg+7UQ4Sl8n8OtyCL8RbETxDxpEeIhCWTqQmCDwLDmYczA8wHEGAf4UOSLcIvxFu8eJi+IeFIjEeIlyiGSU/iqWC4GDcoLxB4c6Q74OZgUB4gGBAGPxqHJF+CeJpvHPDpe5PIzzs8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";
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
    donateWin.querySelector('.bili-donate-close').onclick = ()=>{donateWin.style.display='none';};

  })();