// ==UserScript==
// @name         B站清理工具
// @namespace    http://tampermonkey.net/
// @version      0.2.0
// @date         2026-08-07
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

  // --------- 日志工具（无 UI 依赖，输出到控制台） ---------
  function log(msg) {
    console.log('[BiliClean] ' + msg);
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
        if (attempt < retries - 1) {
          const wait = Math.min(5000 * Math.pow(2, attempt), 30000);
          log(`请求异常，${wait / 1000}秒后重试(${attempt + 1}/${retries}): ${e}`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
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
        if (attempt < retries - 1) {
          const wait = Math.min(5000 * Math.pow(2, attempt), 30000);
          log(`请求异常，${wait / 1000}秒后重试(${attempt + 1}/${retries}): ${e}`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        log('请求异常: ' + e);
        return null;
      }
    }
    log('重试次数已用完');
    return null;
  }

  // --------- 自动清理配置存储（功能核心） ---------
  // 类别开关与旧版一致；freq/keep 为新 UI 的自动清理配置（保留语义仅展示，不实际限定删除范围）
  const SETTINGS_KEY = 'bili-auto-clean-settings';
  const defaultSettings = { types: { reply: true, like: true, at: true, pm: true, history: true, system: true }, freq: '关闭', keep: '一周', theme: 'dark' };
  function loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      return { ...defaultSettings, ...stored, types: { ...defaultSettings.types, ...stored?.types } };
    } catch (e) { return { ...defaultSettings }; }
  }
  function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

  // --------- 进度 / 结果上报接口（UI 实现） ---------
  // report(typeKey, statusText, resultText): typeKey ∈ reply|like|at|pm|history|system
  // onProgress(ratio): 0~1 清理进度
  let report = () => {};
  let onProgress = () => {};

  // 类别数字 → 英文 key（与旧 typeMap 一致：0=赞我 1=回复 2=艾特 3=私信 4=历史 5=系统）
  const TYPE_KEY = { 0: 'like', 1: 'reply', 2: 'at', 3: 'pm', 4: 'history', 5: 'system' };

  // --------- 批量清理逻辑（功能核心，已脱钩 UI） ---------
  async function cleanType(type) {
    const key = TYPE_KEY[type] || 'unknown';
    let succ = 0;
    let last_id = '', last_time = '', isEnd = false;
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
      return await cleanPrivateMessages(key);
    } else if (type === 4) {
      return await clearHistory(key);
    } else if (type === 5) {
      return await clearSystemMessages(key);
    }
    let total = 0, done = 0;
    onProgress(0);
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
        report(key, '记录为空', '');
        break;
      }
      for (let i = 0; i < items.length; i++) {
        let id = items[i].id;
        let delRes = await testDeleteMsg(id, type);
        log(`删除id=${id} 结果: ${delRes.ok ? '成功' : '失败'} ${delRes.msg}`);
        if (delRes.ok) succ++;
        report(key, `${succ}`, '');
        done++;
        onProgress(total ? Math.min(1, done / total) : 0.3);
        await new Promise(r => setTimeout(r, 150));
      }
      const cursor = getCursor(pageRes);
      isEnd = cursor['is_end'];
      last_id = cursor.id || '';
      last_time = cursor.time || '';
      if (isEnd) break;
    }
    onProgress(1);
    report(key, `${succ}`, succ > 0 ? '清理完成' : '清理失败');
    log(`类型${type}清理结束，成功${succ}条`);
  }

  // --------- 私信删除逻辑 ----------
  async function cleanPrivateMessages(key) {
    let succ = 0;
    let hasMore = true;
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILS = 3;
    let rounds = 0;
    const MAX_ROUNDS = 50;
    while (hasMore) {
      if (cleanCancelled) { log('用户取消私信清理'); break; }
      if (++rounds > MAX_ROUNDS) {
        log(`私信清理已达最大轮次(${MAX_ROUNDS})，停止以防死循环`);
        break;
      }
      try {
        const res = await biliGet('https://api.vc.bilibili.com/session_svr/v1/session_svr/get_sessions?session_type=1');

        if (!res || res.code !== 0) {
          log(`私信接口返回异常: ${res ? res.message : '无响应'}`);
          break;
        }

        const sessions = res.data?.['session_list'] || [];
        if (sessions.length === 0) {
          log('私信列表为空，清理完毕');
          break;
        }

        let batchFails = 0;
        for (let i = 0; i < sessions.length; i++) {
          if (cleanCancelled) break;
          const talkerId = sessions[i]['talker_id'];
          const delRes = await deletePrivateMessage(talkerId);
          if (delRes.ok) { succ++; consecutiveFailures = 0; }
          else { batchFails++; consecutiveFailures++; }
          report(key, `${succ}`, '');
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
    report(key, succ > 0 ? '清理完成' : '记录为空', '');
    log(`私信清理结束，成功${succ}条`);
  }

  // --------- 历史记录清空逻辑 ----------
  async function clearHistory(key) {
    try {
      log('开始清空历史记录');
      report(key, '处理中...', '');
      const csrf = getCsrf();
      const res = await biliPost('https://api.bilibili.com/x/v2/history/clear', `jsonp=jsonp&csrf=${csrf}`);
      report(key, res.ok ? 'clear' : '0', res.ok ? '清理完成' : '清理失败');
      log(`历史记录清空结果: ${res.msg}`);
    } catch (e) {
      log(`历史记录清空异常: ${e}`);
      report(key, '0', '清理失败');
    }
  }

  // --------- 系统消息清空逻辑 ----------
  async function clearSystemMessages(key) {
    try {
      log('开始清空系统消息');
      report(key, '处理中...', '');
      const csrf = getCsrf();
      const url = `https://message.bilibili.com/x/sys-msg/del_notify_list?build=7650400&mobi_app=android&csrf=${csrf}`;
      const res = await biliPost(url, { type: 4, build: 7650400, mobi_app: "android" }, true);
      report(key, res.ok ? 'clear' : '0', res.ok ? '清理完成' : '清理失败');
      log(`系统消息清空结果: ${res.msg}`);
    } catch (e) {
      log(`系统消息清空异常: ${e}`);
      report(key, '0', '清理失败');
    }
  }

  // --------- 删除私信函数 ----------
  async function deletePrivateMessage(talkerId) {
    if (!talkerId) {
      log(`私信删除参数不完整，跳过删除操作: talkerId=${talkerId}`);
      return { ok: false, msg: '参数不完整，跳过操作' };
    }

    const csrf = getCsrf();
    const params = `talker_id=${talkerId}&session_type=1&build=0&mobi_app=web&csrf_token=${csrf}&csrf=${csrf}`;
    return await biliPost('https://api.vc.bilibili.com/session_svr/v1/session_svr/remove_session', params);
  }

  let cleanCancelled = false;

  // --------- 单条删除函数 ----------
  async function testDeleteMsg(id, type) {
    if (!id || type === undefined || type === null) {
      log(`参数不完整，跳过删除操作: id=${id}, type=${type}`);
      return { ok: false, msg: '参数不完整，跳过操作' };
    }

    const csrf = getCsrf();
    const params = `tp=${type}&id=${encodeURIComponent(id)}&build=0&mobi_app=web&csrf_token=${csrf}&csrf=${csrf}`;
    return await biliPost('https://api.bilibili.com/x/msgfeed/del', params);
  }

  // --------- 自动清理触发（页面加载时触发一次，启用条件：频率非「关闭」） ----------
  (function autoCleanTrigger() {
    const s = loadSettings();
    if (s.freq === '关闭') return;
    const selectedTypes = Object.entries(s.types).filter(([, v]) => v).map(([k]) => k);
    if (!selectedTypes.length) return;
    const typeMap = { reply: 1, like: 0, at: 2, pm: 3, history: 4, system: 5 };
    log(`自动清理已启用（${s.freq}），开始清理: ${selectedTypes.join(', ')}`);
    (async () => {
      for (const t of selectedTypes) {
        await cleanType(typeMap[t]);
      }
      log('自动清理完成');
    })();
  })();

  // ===================== UI 层（作用域隔离在 .bc-root，不影响 B 站宿主页） =====================
  const CSS = `
.bc-root{
  --panel:rgba(17,19,31,.95);--panel-solid:rgb(17,19,31);--snack:rgba(17,19,31,.96);
  --surface2:rgba(255,255,255,.07);--border:rgba(255,255,255,.14);
  --text:#f5f6fb;--muted:#b89ec4;--accent:#5cc8ff;--accent2:#f2c2de;
  --ok:#4ade80;--warn:#ffb454;--err:#ff6b6b;--glow:rgba(92,200,255,.55);
  --radius:16px;--shadow:0 18px 44px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.25);
  font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased;color:var(--accent2)
}
.bc-root *{box-sizing:border-box;margin:0;padding:0}
.bc-root button{font-family:inherit}
.bc-root .fab{position:fixed;right:24px;bottom:24px;width:46px;height:46px;cursor:pointer;z-index:9999;display:flex;align-items:center;justify-content:center;animation:bcFloat 3.4s ease-in-out infinite;transition:transform .25s;filter:drop-shadow(0 4px 12px var(--glow))}
.bc-root .fab:hover{transform:scale(1.12) rotate(-6deg)}
.bc-root .fab svg{width:34px;height:34px}
@keyframes bcFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.bc-root .panel{position:fixed;right:22px;bottom:78px;width:286px;max-height:82vh;overflow:auto;background:linear-gradient(180deg,color-mix(in srgb,var(--panelSolid) 82%,transparent),color-mix(in srgb,var(--panelSolid) 88%,transparent)),url('https://raw.githubusercontent.com/zisull/Tampermonkey-BiliClean/main/img/bg.jpg') center/cover no-repeat;backdrop-filter:blur(30px) saturate(140%);-webkit-backdrop-filter:blur(30px) saturate(140%);border:1px solid var(--border);border-radius:var(--radius);color:var(--accent2);text-shadow:0 1px 2px rgba(0,0,0,.55);box-shadow:var(--shadow);z-index:9998;transform-origin:bottom right;transition:opacity .22s,transform .22s}
.bc-root .panel.hide{opacity:0;transform:scale(.92) translateY(8px);pointer-events:none}
.bc-root .drops{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;border-radius:var(--radius)}
.bc-root .drop{position:absolute;top:-14px;border-radius:50% 50% 50% 50%/62% 62% 40% 40%;background:radial-gradient(circle at 34% 30%,rgba(255,255,255,.6),rgba(255,255,255,.12) 42%,rgba(255,255,255,.02) 72%);box-shadow:inset 0 -2px 3px rgba(255,255,255,.3),0 1px 2px rgba(0,0,0,.25);animation:bcDropFall linear infinite}
@keyframes bcDropFall{0%{transform:translateY(-12px) scale(.55);opacity:0}14%{opacity:.95}84%{opacity:.95}100%{transform:translateY(440px) scale(1.05);opacity:0}}
.bc-root .ambient{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;border-radius:var(--radius);opacity:.4}
.bc-root .ambient::before{content:"";position:absolute;inset:0;background:radial-gradient(90% 60% at 0% 0%,var(--glow),transparent 60%),radial-gradient(80% 55% at 100% 100%,color-mix(in srgb,var(--accent) 45%,transparent),transparent 58%)}
.bc-root .p-head,.bc-root .col{position:relative;z-index:1}
.bc-root .p-head{display:flex;align-items:center;gap:9px;padding:12px 13px;border-bottom:1px solid var(--border);cursor:grab;touch-action:none;user-select:none}
.bc-root .p-head:active{cursor:grabbing}
.bc-root .p-head .dot{width:28px;height:28px;border-radius:8px;flex:none;display:flex;align-items:center;justify-content:center;background:var(--accent);color:#1a1a1a;font-weight:800;font-size:12px;box-shadow:0 4px 14px var(--glow)}
.bc-root .p-head h3{font-size:14px;font-weight:800;flex:1;letter-spacing:.3px;cursor:pointer;color:var(--accent2)}
.bc-root .p-head h3:hover{filter:brightness(1.18)}
.bc-root .p-head .x{cursor:pointer;color:var(--accent2);font-size:17px;line-height:1;padding:2px 3px}
.bc-root .col{padding:12px 13px 15px}
.bc-root .block{margin-bottom:13px}
.bc-root .chips{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:2px}
.bc-root .chip{display:flex;align-items:center;justify-content:center;gap:4px;padding:8px 3px;border:1px solid var(--border);border-radius:9px;font-size:11.5px;color:var(--accent2);cursor:pointer;user-select:none;transition:.16s;background:transparent}
.bc-root .chip.on{color:var(--accent);background:var(--surface2);border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
.bc-root .chip .ct{width:7px;height:7px;border-radius:50%;background:var(--border);opacity:.55;transition:.16s}
.bc-root .chip.on .ct{opacity:1}
.bc-root .chip[data-cat="reply"] .ct{background:#4ade80}
.bc-root .chip[data-cat="like"] .ct{background:#ff6ec7}
.bc-root .chip[data-cat="at"] .ct{background:#4ee0ff}
.bc-root .chip[data-cat="pm"] .ct{background:#4ea8ff}
.bc-root .chip[data-cat="history"] .ct{background:#b06bff}
.bc-root .chip[data-cat="system"] .ct{background:#ff6b6b}
.bc-root .summary{font-size:11.5px;color:var(--accent2);margin-top:9px;line-height:1.65}
.bc-root .summary b{color:var(--accent);font-weight:600}
.bc-root .clean-btn{width:100%;margin-top:11px;padding:10px;border:none;border-radius:11px;cursor:pointer;background:var(--accent);color:#1a1a1a;font-size:13px;font-weight:800;box-shadow:0 8px 22px var(--glow);transition:.18s}
.bc-root .clean-btn:hover{filter:brightness(1.06)}
.bc-root .clean-btn:disabled{opacity:.5;cursor:default;filter:none}
.bc-root .prog{height:6px;background:var(--surface2);border-radius:6px;overflow:hidden;margin-top:10px;display:none}
.bc-root .prog.show{display:block}
.bc-root .pbar{height:100%;width:0;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:6px;transition:width .15s linear}
.bc-root .pbar.indet{width:40%;animation:bcScan 1.1s ease-in-out infinite;background:linear-gradient(90deg,transparent,var(--accent),transparent)}
@keyframes bcScan{0%{transform:translateX(-120%)}100%{transform:translateX(280%)}}
.bc-root .pnum{font-size:10.5px;color:var(--accent2);margin-top:5px;text-align:center;display:none}
.bc-root .pnum.show{display:block}
.bc-root .more{margin-top:2px;border-top:1px solid var(--border);padding-top:2px}
.bc-root .more-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 2px;cursor:pointer;font-size:11px;color:var(--accent2);user-select:none;letter-spacing:.3px}
.bc-root .more-status{font-size:10.5px;color:var(--muted);letter-spacing:.2px}
.bc-root .more-status b{color:var(--accent);font-weight:600}
.bc-root .more-title{display:flex;align-items:center;gap:5px}
.bc-root .more-head .chev{color:var(--accent2);font-size:10px;transition:transform .2s}
.bc-root .more.open .chev{transform:rotate(90deg)}
.bc-root .more-body{display:none;padding-bottom:4px}
.bc-root .more.open .more-body{display:block}
.bc-root .auto-sub{display:none;padding:9px 0 10px;border-bottom:1px solid var(--border);gap:9px}
.bc-root .auto-sub.show{display:flex;flex-direction:column}
.bc-root .auto-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.bc-root .auto-sub .as-l{font-size:11px;color:var(--muted);flex:none}
.bc-root .row{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)}
.bc-root .row:last-child{border-bottom:none}
.bc-root .row label{font-size:12px;color:var(--accent2)}
.bc-root .row .sub{font-size:10px;color:var(--muted);margin-top:1px}
.bc-root .seg{display:flex;background:var(--surface2);border-radius:8px;padding:2px;flex:1}
.bc-root .seg button{border:none;background:none;color:var(--accent2);font-size:11px;padding:3px 6px;border-radius:6px;cursor:pointer;flex:1;text-align:center;min-width:0;white-space:nowrap}
.bc-root .seg button.on{background:var(--accent);color:#fff}
.bc-root .palette{display:flex;gap:7px;align-items:center}
.bc-root .swatch{width:20px;height:20px;border-radius:50%;cursor:pointer;border:2px solid var(--border);transition:.18s;box-sizing:border-box;flex:none}
.bc-root .swatch.on{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
.bc-root .swatch[data-th="dark"]{background:#23263a}
.bc-root .swatch[data-th="pink"]{background:#fb7299}
.bc-root .swatch[data-th="blue"]{background:#546de5}
.bc-root .swatch[data-th="green"]{background:#16a085}
.bc-root .swatch[data-th="purple"]{background:#a855f7}
.bc-root .grace{display:none;align-items:center;gap:11px;margin:0 0 12px;padding:10px 12px;position:relative;overflow:hidden;border:1px solid var(--border);border-radius:12px;background:color-mix(in srgb,var(--accent) 12%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 25%,transparent)}
.bc-root .grace.show{display:flex;animation:bcGraceIn .25s ease}
@keyframes bcGraceIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.bc-root .grace-ring{width:34px;height:34px;flex:none}
.bc-root .grace-ring .track{fill:none;stroke:var(--border);stroke-width:3.5}
.bc-root .grace-ring .fg{fill:none;stroke:var(--accent);stroke-width:3.5;stroke-linecap:round;transform:rotate(-90deg);transform-origin:center;stroke-dasharray:94.25;stroke-dashoffset:0;transition:stroke-dashoffset 1s linear;filter:drop-shadow(0 0 3px var(--glow))}
.bc-root .grace-ring text{fill:var(--accent2);font-size:14px;font-weight:800;font-family:inherit}
.bc-root .grace-txt{font-size:12.5px;flex:1;color:var(--accent2);line-height:1.4}
.bc-root .grace-txt b{color:var(--accent);font-weight:700}
.bc-root .grace-undo{border:1px solid var(--border);background:var(--surface2);color:var(--accent);font-size:11.5px;padding:5px 12px;border-radius:9px;cursor:pointer;flex:none;transition:.16s}
.bc-root .grace-undo:hover{border-color:var(--accent);filter:brightness(1.08)}
.bc-root .grace .bar{position:absolute;left:0;bottom:0;height:3px;background:var(--accent);width:100%;transition:width 1s linear;border-radius:0 0 11px 11px}
`;

  const HTML = `
<div class="fab" id="fab" title="BiliClean">
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(24,22)">
      <g opacity=".92">
        <g>
          <animateTransform attributeName="transform" type="rotate" values="0;360" dur="9s" repeatCount="indefinite"/>
          <path d="M0,-10 C3,-8 3,-4 0,-2 C-3,-4 -3,-8 0,-10 Z" fill="var(--accent)"/>
          <path d="M0,-10 C3,-8 3,-4 0,-2 C-3,-4 -3,-8 0,-10 Z" fill="var(--accent)" transform="rotate(72)"/>
          <path d="M0,-10 C3,-8 3,-4 0,-2 C-3,-4 -3,-8 0,-10 Z" fill="var(--accent)" transform="rotate(144)"/>
          <path d="M0,-10 C3,-8 3,-4 0,-2 C-3,-4 -3,-8 0,-10 Z" fill="var(--accent)" transform="rotate(216)"/>
          <path d="M0,-10 C3,-8 3,-4 0,-2 C-3,-4 -3,-8 0,-10 Z" fill="var(--accent)" transform="rotate(288)"/>
        </g>
        <circle cx="0" cy="0" r="2.2" fill="var(--accent2)" opacity=".75"/>
      </g>
      <circle cx="8" cy="10" r="1.5" fill="var(--accent)" opacity=".4">
        <animate attributeName="opacity" values=".2;.6;.2" dur="3s" repeatCount="indefinite"/>
      </circle>
    </g>
  </svg>
</div>
<div class="panel hide" id="panel">
  <div class="ambient"></div>
  <div class="drops" id="drops"></div>
  <div class="p-head">
    <span class="dot">BC</span><h3 id="title" title="拖我移动 · 点击反选类别">BiliClean</h3><span class="x" id="close">×</span>
  </div>
  <div class="col">
    <div class="grace" id="grace">
      <svg class="grace-ring" viewBox="0 0 36 36">
        <circle class="track" cx="18" cy="18" r="15"/>
        <circle class="fg" id="graceFg" cx="18" cy="18" r="15"/>
        <text id="graceNum" x="18" y="23" text-anchor="middle">3</text>
      </svg>
      <div class="grace-txt">即将清理 <b id="graceN">6</b> 类 · 可撤销</div>
      <button class="grace-undo" id="graceUndo">撤销</button>
      <div class="bar" id="graceBar"></div>
    </div>
    <div class="block">
      <div class="chips" id="cats">
        <div class="chip on" data-cat="reply"><span class="ct"></span>回复</div>
        <div class="chip on" data-cat="like"><span class="ct"></span>赞我</div>
        <div class="chip on" data-cat="at"><span class="ct"></span>艾特</div>
        <div class="chip on" data-cat="pm"><span class="ct"></span>私信</div>
        <div class="chip on" data-cat="history"><span class="ct"></span>历史</div>
        <div class="chip on" data-cat="system"><span class="ct"></span>系统</div>
      </div>
      <div class="summary" id="summary">已选 6 类守护中</div>
      <button class="clean-btn" id="cleanNow">立即清理</button>
      <div class="prog" id="prog"><div class="pbar" id="pbar"></div></div>
      <div class="pnum" id="pnum">已清理 0 条</div>
    </div>
    <div class="more" id="more">
      <div class="more-head" id="moreHead">
        <span class="more-status" id="moreStatus"></span>
        <span class="more-title">自动清理<span class="chev">▸</span></span>
      </div>
      <div class="more-body">
        <div class="auto-sub show" id="autoSub">
          <div class="auto-row">
            <span class="as-l">频率</span>
            <div class="seg" id="freq">
              <button data-v="关闭">关闭</button>
              <button data-v="每次">每次</button>
              <button data-v="每天">每天</button>
              <button data-v="每周">每周</button>
            </div>
          </div>
          <div class="auto-row">
            <span class="as-l">保留</span>
            <div class="seg" id="keep">
              <button data-v="当天">当天</button>
              <button data-v="三天">三天</button>
              <button data-v="一周">一周</button>
              <button data-v="全部清理">全部清理</button>
            </div>
          </div>
        </div>
        <div class="row">
          <div><label>主题</label></div>
          <div class="palette" id="pal">
            <span class="swatch on" data-th="dark" title="暗"></span>
            <span class="swatch" data-th="pink" title="粉"></span>
            <span class="swatch" data-th="blue" title="蓝"></span>
            <span class="swatch" data-th="green" title="绿"></span>
            <span class="swatch" data-th="purple" title="紫"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</div>`;

  // 注入样式与 DOM（作用域隔离，不影响 B 站宿主页）
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.documentElement.appendChild(styleEl);
  const bcRoot = document.createElement('div');
  bcRoot.className = 'bc-root';
  bcRoot.innerHTML = HTML;
  document.documentElement.appendChild(bcRoot);

  const $ = s => bcRoot.querySelector(s);
  const $$ = s => bcRoot.querySelectorAll(s);

  // 五套主题（仅作用于工具面板，不影响宿主页）：暗=深空霓虹 / 粉(B站粉) / 蓝 / 绿(青) / 紫
  const THEMES = {
    dark: { panel: 'rgba(17,19,31,.95)', panelSolid: 'rgb(17,19,31)', snack: 'rgba(17,19,31,.96)', surface2: 'rgba(255,255,255,.07)', border: 'rgba(255,255,255,.14)', text: '#f5f6fb', muted: '#b89ec4', accent: '#5cc8ff', accent2: '#f2c2de', glow: 'rgba(92,200,255,.55)', ok: '#4ade80', warn: '#ffb454', err: '#ff6b6b' },
    pink: { panel: 'rgba(40,26,33,.95)', panelSolid: 'rgb(40,26,33)', snack: 'rgba(40,26,33,.96)', surface2: 'rgba(255,180,200,.10)', border: 'rgba(255,170,195,.16)', text: '#f7eef2', muted: '#cdb6d2', accent: '#fb7299', accent2: '#a8e2ea', glow: 'rgba(251,114,153,.6)', ok: '#4ade80', warn: '#ffb454', err: '#ff6b6b' },
    blue: { panel: 'rgba(22,28,44,.95)', panelSolid: 'rgb(22,28,44)', snack: 'rgba(22,28,44,.96)', surface2: 'rgba(150,180,255,.10)', border: 'rgba(140,170,255,.16)', text: '#eef2fb', muted: '#c2c6e0', accent: '#5b7cfa', accent2: '#f0d7a8', glow: 'rgba(91,124,250,.6)', ok: '#4ade80', warn: '#ffb454', err: '#ff6b6b' },
    green: { panel: 'rgba(18,38,33,.95)', panelSolid: 'rgb(18,38,33)', snack: 'rgba(18,38,33,.96)', surface2: 'rgba(120,210,180,.10)', border: 'rgba(120,200,170,.16)', text: '#eaf5f0', muted: '#bcd0c4', accent: '#1abc9c', accent2: '#f0bdb4', glow: 'rgba(26,188,156,.6)', ok: '#4ade80', warn: '#ffb454', err: '#ff6b6b' },
    purple: { panel: 'rgba(32,24,46,.95)', panelSolid: 'rgb(32,24,46)', snack: 'rgba(32,24,46,.96)', surface2: 'rgba(180,150,255,.10)', border: 'rgba(175,150,255,.16)', text: '#f1ecf8', muted: '#cabfd8', accent: '#b15cff', accent2: '#f0dca6', glow: 'rgba(177,92,255,.6)', ok: '#4ade80', warn: '#ffb454', err: '#ff6b6b' }
  };
  function applyTheme(name) {
    const t = THEMES[name];
    for (const k in t) bcRoot.style.setProperty('--' + k, t[k]);
  }

  // --- 面板开关 ---
  const fab = $('#fab'), panel = $('#panel'), close = $('#close');
  fab.onclick = () => panel.classList.toggle('hide');
  close.onclick = () => panel.classList.add('hide');

  // 清理范围（6 类持久偏好，不在前端预载数量）
  const CATS = { reply: '回复', like: '赞我', at: '艾特', pm: '私信', history: '历史', system: '系统' };
  let settings = loadSettings();
  const summary = $('#summary');
  const chips = $$('#cats .chip');
  function updateSel() {
    const n = Object.values(settings.types).filter(v => v).length;
    summary.innerHTML = '已选 ' + n + ' 类守护中';
  }
  chips.forEach(s => s.onclick = () => {
    const cat = s.dataset.cat;
    settings.types[cat] = !settings.types[cat];
    s.classList.toggle('on', settings.types[cat]);
    saveSettings(settings);
    updateSel();
  });

  // 自动清理折叠（单栏：收纳不常用项）
  const more = $('#more'), moreHead = $('#moreHead');
  moreHead.onclick = () => more.classList.toggle('open');

  // 频率 / 保留（常驻显示；频率选「关闭」即停用自动清理，配置写入本地）
  const moreStatus = $('#moreStatus');
  function syncAutoLabel() {
    const f = $('#freq button.on').dataset.v;
    const k = $('#keep button.on').dataset.v;
    moreStatus.className = 'more-status';
    moreStatus.innerHTML = (f === '关闭')
      ? '已关闭'
      : (k === '全部清理' ? f + ' · <b>全部清理</b>' : f + ' · 保留' + k);
  }
  function bindSeg(id, key) {
    $$(`#${id} button`).forEach(b => b.onclick = () => {
      $$(`#${id} button`).forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      settings[key] = b.dataset.v; saveSettings(settings);
      syncAutoLabel();
    });
  }
  bindSeg('freq', 'freq'); bindSeg('keep', 'keep');

  // 五主题切换（仅面板换肤，不动宿主页）
  let theme = 'dark';
  const swatches = $$('#pal .swatch');
  swatches.forEach(s => s.onclick = () => {
    theme = s.dataset.th;
    swatches.forEach(x => x.classList.remove('on'));
    s.classList.add('on');
    applyTheme(theme);
    settings.theme = theme; saveSettings(settings);
  });

  // --- 宽限确认（核心）---
  const grace = $('#grace'), graceN = $('#graceN'), graceFg = $('#graceFg'),
    graceNum = $('#graceNum'), graceBar = $('#graceBar'),
    graceUndo = $('#graceUndo'), cleanNow = $('#cleanNow'),
    prog = $('#prog'), pbar = $('#pbar'), pnum = $('#pnum');
  let graceTimer = null, graceLeft = 0, busy = false, hideTimer = null;
  const TOTAL = 3;
  function requestClean(k, cats) {
    graceN.textContent = k;
    panel.classList.remove('hide'); // 主界面可见，通知直接显示在面板顶部
    grace.classList.add('show');
    graceLeft = TOTAL;
    graceNum.textContent = graceLeft;
    graceFg.style.transition = 'none'; graceFg.style.strokeDashoffset = 0; graceBar.style.transition = 'none'; graceBar.style.width = '100%';
    requestAnimationFrame(() => { graceFg.style.transition = 'stroke-dashoffset 1s linear'; graceBar.style.transition = 'width 1s linear'; });
    graceTimer = setInterval(() => {
      graceLeft--;
      graceNum.textContent = Math.max(0, graceLeft);
      const frac = graceLeft / TOTAL;
      graceFg.style.strokeDashoffset = 94.25 * (1 - frac);
      graceBar.style.width = (frac * 100) + '%';
      if (graceLeft <= 0) { clearInterval(graceTimer); graceTimer = null; startRealClean(cats); }
    }, 1000);
  }
  function cancelClean() {
    if (graceTimer) { clearInterval(graceTimer); graceTimer = null; }
    grace.classList.remove('show');
    summary.innerHTML = '已取消本次清理';
    busy = false; cleanNow.disabled = false;
  }
  // 真实清理：调用核心 cleanType，通过 report/onProgress 回调驱动进度与纯文字摘要（不预载总数）
  async function startRealClean(cats) {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    grace.classList.remove('show');
    prog.classList.add('show'); pnum.classList.add('show');
    pbar.classList.add('indet'); pnum.textContent = '清理中…';
    busy = true; cleanNow.disabled = true;
    const shares = {}; const clearSet = new Set(); cats.forEach(c => shares[c] = 0);
    const savedReport = report, savedProg = onProgress;
    report = (typeKey, statusText) => {
      if (typeKey && (typeKey in shares)) {
        if (statusText === 'clear') { clearSet.add(typeKey); }
        else { const n = parseInt(statusText, 10); if (!isNaN(n)) shares[typeKey] = n; }
      }
    };
    onProgress = (r) => { pbar.classList.remove('indet'); pbar.style.width = Math.max(2, Math.round(r * 100)) + '%'; };
    const typeMap = { reply: 1, like: 0, at: 2, pm: 3, history: 4, system: 5 };
    try {
      for (const c of cats) { await cleanType(typeMap[c]); }
    } catch (e) { log('清理过程异常: ' + e); }
    report = savedReport; onProgress = savedProg;
    pbar.classList.remove('indet'); pbar.style.width = '100%';
    const cleared = cats.filter(c => clearSet.has(c));
    const counted = cats.filter(c => !clearSet.has(c));
    const sum = counted.reduce((a, c) => a + shares[c], 0);
    if (sum > 0 || cleared.length) {
      const parts = [];
      const cntDetail = counted.filter(c => shares[c] > 0).map(c => CATS[c] + ' ' + shares[c]).join(' · ');
      if (cntDetail) parts.push(cntDetail);
      if (cleared.length) parts.push(cleared.map(c => '已清空' + CATS[c]).join(' · '));
      summary.innerHTML = '✓ 已清理 <b>' + sum + '</b> 条（' + parts.join(' · ') + '）';
    } else {
      summary.innerHTML = '✓ 已清理 0 条（所选类别暂无可清理内容）';
    }
    busy = false; cleanNow.disabled = false;
    setTimeout(() => { prog.classList.remove('show'); pnum.classList.remove('show'); }, 900);
  }
  graceUndo.onclick = cancelClean;
  cleanNow.onclick = () => {
    if (busy) return;
    const onCats = Object.keys(settings.types).filter(k => settings.types[k]);
    if (!onCats.length) { summary.innerHTML = '未勾选任何清理类别'; return; }
    busy = true; requestClean(onCats.length, onCats);
  };

  // 面板内水滴特效：在玻璃上生成缓缓滑落的冷凝水珠
  const dropsEl = $('#drops');
  for (let i = 0; i < 16; i++) {
    const d = document.createElement('div'); d.className = 'drop';
    const size = (5 + Math.random() * 9).toFixed(1);
    d.style.left = (Math.random() * 100).toFixed(1) + '%';
    d.style.width = size + 'px'; d.style.height = (size * 1.15).toFixed(1) + 'px';
    d.style.animationDuration = (5 + Math.random() * 6).toFixed(1) + 's';
    d.style.animationDelay = (-Math.random() * 11).toFixed(1) + 's';
    dropsEl.appendChild(d);
  }

  // 面板任意拖动（抓标题栏移动）；未拖动且点在标题上 = 反选类别
  const pHead = panel.querySelector('.p-head');
  let drag = null;
  pHead.addEventListener('pointerdown', e => {
    if (e.target.classList.contains('x')) return; // 关闭按钮不触发拖动
    const r = panel.getBoundingClientRect();
    panel.style.left = r.left + 'px'; panel.style.top = r.top + 'px';
    panel.style.right = 'auto'; panel.style.bottom = 'auto';
    const onTitle = !!e.target.closest('#title');
    drag = { sx: e.clientX, sy: e.clientY, l: r.left, t: r.top, moved: false, onTitle };
    pHead.setPointerCapture(e.pointerId);
  });
  pHead.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (drag.moved) { panel.style.left = (drag.l + dx) + 'px'; panel.style.top = (drag.t + dy) + 'px'; }
  });
  pHead.addEventListener('pointerup', e => {
    if (drag && !drag.moved && drag.onTitle) {
      chips.forEach(s => { const on = !s.classList.contains('on'); s.classList.toggle('on', on); settings.types[s.dataset.cat] = on; }); saveSettings(settings);
      updateSel();
    }
    drag = null;
  });

  // 初始：应用主题 + 还原自动清理配置到 UI + 同步状态
  $$('#freq button').forEach(b => { if (b.dataset.v === settings.freq) b.classList.add('on'); });
  $$('#keep button').forEach(b => { if (b.dataset.v === settings.keep) b.classList.add('on'); });
  chips.forEach(s => s.classList.toggle('on', !!settings.types[s.dataset.cat]));
  theme = settings.theme || 'dark';
  swatches.forEach(s => s.classList.toggle('on', s.dataset.th === theme));
  applyTheme(theme);
  updateSel();
  syncAutoLabel();

})();
