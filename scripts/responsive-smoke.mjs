import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const appUrl = process.env.RESPONSIVE_TEST_URL || 'http://127.0.0.1:5173/';
const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const chromePath = chromeCandidates.find(existsSync);

if (!chromePath) {
  throw new Error('Chrome/Edge bulunamadı. CHROME_PATH ile tarayıcı yolunu belirtin.');
}

const viewports = [
  { name: 'iPhone 12 portrait', width: 390, height: 844, mobile: true },
  { name: 'Android compact', width: 360, height: 800, mobile: true },
  { name: 'iPad portrait', width: 820, height: 1180, mobile: true },
  { name: 'Phone landscape', width: 844, height: 390, mobile: true },
  { name: 'Desktop', width: 1440, height: 900, mobile: false },
];

const profileDir = await mkdtemp(join(tmpdir(), 'lockin-responsive-'));
const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

let socket;
let commandId = 0;
const pending = new Map();
const eventWaiters = [];

function waitForWebSocketUrl() {
  return new Promise((resolve, reject) => {
    let stderr = '';
    const timeout = setTimeout(() => reject(new Error('Chrome DevTools başlatılamadı.')), 15000);
    chrome.stderr.setEncoding('utf8');
    chrome.stderr.on('data', (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
    chrome.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Chrome erken kapandı (${code}).`));
    });
  });
}

function connect(url) {
  return new Promise((resolve, reject) => {
    socket = new WebSocket(url);
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(String(data));
      if (message.id && pending.has(message.id)) {
        const { resolve: done, reject: fail } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) fail(new Error(`${message.error.message} (${message.error.code})`));
        else done(message.result);
        return;
      }
      for (let i = eventWaiters.length - 1; i >= 0; i--) {
        const waiter = eventWaiters[i];
        if (waiter.method === message.method && (!waiter.sessionId || waiter.sessionId === message.sessionId)) {
          eventWaiters.splice(i, 1);
          clearTimeout(waiter.timeout);
          waiter.resolve(message.params);
        }
      }
    });
  });
}

function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

function waitForEvent(method, sessionId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const waiter = {
      method,
      sessionId,
      resolve,
      reject,
      timeout: setTimeout(() => {
        const index = eventWaiters.indexOf(waiter);
        if (index >= 0) eventWaiters.splice(index, 1);
        reject(new Error(`${method} beklenirken zaman aşımı.`));
      }, timeoutMs),
    };
    eventWaiters.push(waiter);
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function overlaps(a, b, gap = 2) {
  if (!a?.visible || !b?.visible) return false;
  return a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom && a.bottom > b.top;
}

const metricsExpression = `(() => {
  const rect = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      visible: style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0,
      left: box.left, right: box.right, top: box.top, bottom: box.bottom,
      width: box.width, height: box.height,
    };
  };
  return {
    viewport: { width: innerWidth, height: innerHeight },
    document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    topLeft: rect('.topbar-left'),
    topActions: rect('.topbar-actions'),
    login: rect('.mobile-login-button'),
    canvas: rect('.room-scene-canvas'),
    backdrop: rect('.room-stage-backdrop'),
    music: rect('.mobile-music-trigger'),
    timer: rect('.mobile-focus-timer'),
    ambient: rect('.mobile-ambient-trigger'),
  };
})()`;

try {
  const wsUrl = await waitForWebSocketUrl();
  await connect(wsUrl);
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);

  for (const viewport of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.mobile,
      screenWidth: viewport.width,
      screenHeight: viewport.height,
    }, sessionId);
    await send('Emulation.setTouchEmulationEnabled', {
      enabled: viewport.mobile,
      maxTouchPoints: viewport.mobile ? 5 : 1,
    }, sessionId);

    const loaded = waitForEvent('Page.loadEventFired', sessionId);
    await send('Page.navigate', { url: appUrl }, sessionId);
    await loaded;
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const { result } = await send('Runtime.evaluate', {
      expression: metricsExpression,
      returnByValue: true,
    }, sessionId);
    const data = result.value;
    const { width, height } = data.viewport;
    const withinX = (box) => !box?.visible || (box.left >= -1 && box.right <= width + 1);
    const withinY = (box) => !box?.visible || (box.top >= -1 && box.bottom <= height + 1);

    if (overlaps(data.music, data.timer) || overlaps(data.timer, data.ambient)) {
      console.error(JSON.stringify({ viewport: viewport.name, music: data.music, timer: data.timer, ambient: data.ambient }));
    }

    assert(width === viewport.width && height === viewport.height, `${viewport.name}: viewport emülasyonu başarısız.`);
    assert(data.document.width <= width, `${viewport.name}: sayfa yatay taşıyor (${data.document.width}px).`);
    assert(withinX(data.topLeft) && withinX(data.topActions), `${viewport.name}: üst bar yatay taşıyor.`);
    assert(withinY(data.topLeft) && withinY(data.topActions), `${viewport.name}: üst bar dikey taşıyor.`);
    assert(!overlaps(data.topLeft, data.topActions, 0), `${viewport.name}: üst bar bölümleri çakışıyor.`);
    assert(withinX(data.music) && withinX(data.timer) && withinX(data.ambient), `${viewport.name}: alt kontroller yatay taşıyor.`);
    assert(withinY(data.music) && withinY(data.timer) && withinY(data.ambient), `${viewport.name}: alt kontroller dikey taşıyor.`);
    assert(!overlaps(data.music, data.timer) && !overlaps(data.timer, data.ambient), `${viewport.name}: alt kontroller çakışıyor.`);
    assert(data.canvas?.visible && data.canvas.width > 0, `${viewport.name}: oda sahnesi görünmüyor.`);
    assert(
      data.backdrop?.visible && data.backdrop.width >= width && data.backdrop.height >= height,
      `${viewport.name}: arka plan viewport'u doldurmuyor.`,
    );
    if (viewport.width < 640) assert(data.login?.visible, `${viewport.name}: mobil giriş düğmesi görünmüyor.`);

    console.log(`✓ ${viewport.name} (${width}x${height})`);
  }

  // One physical touch must toggle the lamp exactly once, even if Chromium
  // generates compatibility mouse/click events after the touch sequence.
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844,
  }, sessionId);
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
  const reloaded = waitForEvent('Page.loadEventFired', sessionId);
  await send('Page.navigate', { url: appUrl }, sessionId);
  await reloaded;
  await new Promise((resolve) => setTimeout(resolve, 1200));

  await send('Runtime.evaluate', {
    expression: `document.querySelector('.mobile-login-button')?.click()`,
    returnByValue: true,
  }, sessionId);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const { result: authResult } = await send('Runtime.evaluate', {
    expression: `(() => {
      const panel = document.querySelector('.app-modal-panel');
      const email = panel?.querySelector('input[type="email"]');
      const box = panel?.getBoundingClientRect();
      return {
        activeModal: window.__useAppStore.getState().activeModal,
        panel: box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom } : null,
        emailVisible: !!email && getComputedStyle(email).display !== 'none',
        inputFontSize: email ? parseFloat(getComputedStyle(email).fontSize) : 0,
      };
    })()`,
    returnByValue: true,
  }, sessionId);
  const auth = authResult.value;
  assert(auth.activeModal === 'auth', 'Mobil giriş düğmesi giriş modalını açmadı.');
  assert(
    auth.panel && auth.panel.left >= 0 && auth.panel.right <= 390 && auth.panel.top >= 0 && auth.panel.bottom <= 844,
    'Giriş modalı iPhone viewport sınırlarını aşıyor.',
  );
  assert(auth.emailVisible, 'Giriş formu e-posta alanı görünmüyor.');
  assert(auth.inputFontSize >= 16, 'iOS form alanı otomatik yakınlaştırmayı tetikleyebilir.');
  await send('Runtime.evaluate', {
    expression: `window.__useAppStore.setState({ activeModal: 'none', lampOn: true })`,
    returnByValue: true,
  }, sessionId);
  console.log('✓ Mobil giriş görünürlüğü ve modal sınırları');

  const { result: pointResult } = await send('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.querySelector('.room-scene-canvas');
      const box = canvas.getBoundingClientRect();
      const room = window.__useAppStore.getState().activeRoom;
      for (let y = box.top; y <= box.bottom; y += 3) {
        for (let x = box.left; x <= box.right; x += 3) {
          if (window.__pixelRenderer.getHoveredObject(x, y, room) === 'lamp') return { x, y };
        }
      }
      return null;
    })()`,
    returnByValue: true,
  }, sessionId);
  assert(pointResult.value, 'Dokunma testi için lamba hedefi bulunamadı.');
  const touchPoint = { ...pointResult.value, radiusX: 2, radiusY: 2, force: 1, id: 1 };
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint] }, sessionId);
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, sessionId);
  await new Promise((resolve) => setTimeout(resolve, 700));
  const { result: lampResult } = await send('Runtime.evaluate', {
    expression: 'window.__useAppStore.getState().lampOn',
    returnByValue: true,
  }, sessionId);
  assert(lampResult.value === false, 'Tek dokunma lambayı bir kez değiştirmedi; çift tetikleme olası.');
  console.log('✓ Tek dokunma / çift-tetikleme koruması');
} finally {
  try { socket?.close(); } catch {}
  chrome.kill();
  if (chrome.exitCode === null) {
    await Promise.race([
      once(chrome, 'exit'),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  }
  try {
    await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch (error) {
    console.warn(`Geçici Chrome profili temizlenemedi: ${error.message}`);
  }
}
