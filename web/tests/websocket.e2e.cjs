const { chromium } = require(process.env.BAIYUN_PLAYWRIGHT_MODULE || 'playwright');
const crypto = require('node:crypto');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

// 使用本地配置签发临时令牌，仅测试握手，不登录或修改数据库。
let secret = process.env.BAIYUN_WS_TEST_SECRET;
if (!secret) {
  const yaml = fs.readFileSync(path.resolve(__dirname, '../../apps/im/ws/etc/im.yaml'), 'utf8');
  const match = yaml.match(/^\s+AccessSecret:\s*(.+)$/m);
  if (!match) throw new Error('Missing local WS signing configuration');
  secret = match[1].trim();
  if (secret.startsWith('"')) secret = JSON.parse(secret);
  else if (secret.startsWith("'")) secret = secret.slice(1, -1).replace(/''/g, "'");
}
const now = Math.floor(Date.now() / 1000);
const baseClaims = { userId: '900000001', iat: now, exp: now + 3600 };
function sign(claims, algorithm = 'HS256', signingKey = secret) {
  const header = Buffer.from(JSON.stringify({ alg: algorithm, typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = crypto.createHmac(algorithm === 'HS512' ? 'sha512' : 'sha256', signingKey).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}
const validToken = sign(baseClaims);
const wsUrl = process.env.BAIYUN_WS_URL || 'ws://localhost:8890/ws';
const httpUrl = wsUrl.replace(/^ws:/, 'http:');
const results = [];
function passed(name, details) {
  results.push({ name, status: 'passed', ...details });
  console.log(`PASS ${name}`);
}
async function browserConnection(page, protocols, messages = [], waitForServerClose = false) {
  return page.evaluate(({ url, protocols, messages, waitForServerClose }) => new Promise((resolve, reject) => {
    const started = Date.now();
    const received = [];
    let opened = false;
    const socket = new WebSocket(url, protocols);
    const timer = setTimeout(() => { socket.close(); reject(new Error('WebSocket test timed out')); }, waitForServerClose ? 75000 : 8000);
    socket.onopen = () => {
      opened = true;
      messages.forEach(message => socket.send(message));
      if (!messages.length && !waitForServerClose) socket.close(1000, 'test complete');
    };
    socket.onmessage = event => {
      received.push(event.data);
      if (received.length === messages.length && !waitForServerClose) socket.close(1000, 'test complete');
    };
    socket.onerror = () => {};
    socket.onclose = event => {
      clearTimeout(timer);
      resolve({ opened, received, protocol: socket.protocol, code: event.code, clean: event.wasClean, elapsedMs: Date.now() - started });
    };
  }), { url: wsUrl, protocols, messages, waitForServerClose });
}

function noPongConnection() {
  // 原始TCP客户端只接收Ping、不回应Pong，验证失联连接确实会被回收。
  return new Promise((resolve, reject) => {
    const url = new URL(wsUrl);
    const started = Date.now();
    let upgraded = false, pings = 0, buffer = Buffer.alloc(0);
    const socket = net.connect(Number(url.port), url.hostname);
    const timer = setTimeout(() => { socket.destroy(); reject(new Error('Unresponsive connection was not closed')); }, 75000);
    socket.on('connect', () => socket.write([
      `GET ${url.pathname} HTTP/1.1`, `Host: ${url.host}`, 'Upgrade: websocket', 'Connection: Upgrade',
      'Sec-WebSocket-Version: 13', `Sec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}`,
      `Sec-WebSocket-Protocol: baiyun, ${validToken}`, 'Origin: http://localhost:3000', '', '',
    ].join('\r\n')));
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!upgraded) {
        const end = buffer.indexOf('\r\n\r\n');
        if (end < 0) return;
        if (!buffer.subarray(0, end).toString().startsWith('HTTP/1.1 101')) {
          clearTimeout(timer); socket.destroy(); reject(new Error('Unresponsive-client handshake failed')); return;
        }
        upgraded = true;
        buffer = buffer.subarray(end + 4);
      }
      while (buffer.length >= 2) {
        const length = buffer[1] & 127;
        if (length > 125 || buffer.length < 2 + length) return;
        if ((buffer[0] & 15) === 9) pings++;
        buffer = buffer.subarray(2 + length);
      }
    });
    socket.on('error', error => { clearTimeout(timer); reject(new Error(error.code || 'TCP test failed')); });
    socket.on('close', () => { clearTimeout(timer); resolve({ upgraded, pings, elapsedMs: Date.now() - started }); });
  });
}

async function healthyIdleConnection(page) {
  return page.evaluate(({url, token}) => new Promise((resolve, reject) => {
    const started = Date.now();
    let received = null;
    const socket = new WebSocket(url, ['baiyun', token]);
    let idleTimer;
    const watchdog = setTimeout(() => { socket.close(); reject(new Error('Heartbeat survival test timed out')); }, 80000);
    socket.onopen = () => { idleTimer = setTimeout(() => socket.send('alive after 70 seconds'), 70000); };
    socket.onmessage = event => { received = event.data; socket.close(1000, 'test complete'); };
    socket.onerror = () => {};
    socket.onclose = event => {
      clearTimeout(idleTimer); clearTimeout(watchdog);
      if (received === null) reject(new Error(`Healthy connection closed early after ${Date.now()-started}ms`));
      else resolve({ received, elapsedMs: Date.now()-started, code: event.code });
    };
  }), {url: wsUrl, token: validToken});
}
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:3000');
    const normal = await browserConnection(page, ['baiyun', validToken], ['你好，白云', '第二条消息']);
    assert.equal(normal.opened, true);
    assert.equal(normal.protocol, 'baiyun');
    assert.deepEqual(normal.received, ['你好，白云', '第二条消息']);
    assert.equal(normal.code, 1000);
    passed('valid JWT, negotiated protocol, repeated Unicode echo, normal close', { closeCode: normal.code });

    const invalidCases = [
      ['missing token', ['baiyun']],
      ['invalid signature', ['baiyun', sign(baseClaims, 'HS256', 'deliberately-wrong-test-key')]],
      ['expired token', ['baiyun', sign({ ...baseClaims, exp: now - 60 })]],
      ['missing expiry', ['baiyun', sign({ userId: '900000001', iat: now })]],
      ['invalid user identity', ['baiyun', sign({ ...baseClaims, userId: '0' })]],
      ['wrong signing algorithm', ['baiyun', sign(baseClaims, 'HS512')]],
      ['wrong application protocol', ['other', validToken]],
    ];
    for (const [name, protocols] of invalidCases) {
      const result = await browserConnection(page, protocols);
      assert.equal(result.opened, false);
      const response = await context.request.get(httpUrl, {
        headers: { Origin: 'http://localhost:3000', 'Sec-WebSocket-Protocol': protocols.join(', ') },
      });
      assert.equal(response.status(), 401);
      const body = await response.json();
      assert.equal(typeof body.message, 'string');
      passed(name, { httpStatus: response.status() });
    }
    const forbiddenPage = await context.newPage();
    await forbiddenPage.route('http://127.0.0.1:3000/ws-test', route => route.fulfill({ contentType: 'text/html', body: '<title>Origin test</title>' }));
    await forbiddenPage.goto('http://127.0.0.1:3000/ws-test');
    const forbidden = await browserConnection(forbiddenPage, ['baiyun', validToken]);
    assert.equal(forbidden.opened, false);
    const forbiddenResponse = await context.request.get(httpUrl, {
      headers: {
        Origin: 'http://127.0.0.1:3000', 'Sec-WebSocket-Protocol': `baiyun, ${validToken}`,
        Upgrade: 'websocket', Connection: 'Upgrade', 'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': crypto.randomBytes(16).toString('base64'),
      },
    });
    assert.equal(forbiddenResponse.status(), 403);
    passed('forbidden browser origin', { httpStatus: forbiddenResponse.status() });
    await forbiddenPage.close();

    const oversized = await browserConnection(page, ['baiyun', validToken], ['x'.repeat(65537)], true);
    assert.equal(oversized.opened, true);
    assert.ok([1009, 1006].includes(oversized.code));
    assert.equal(oversized.received.length, 0);
    passed('64 KiB message limit', { closeCode: oversized.code, clean: oversized.clean, note: oversized.code === 1006 ? 'Limit enforced, but browser receives an abnormal close instead of explicit 1009' : 'Explicit message-too-large close' });

    const concurrent = await Promise.all([
      browserConnection(page, ['baiyun', validToken], ['connection A']),
      browserConnection(page, ['baiyun', sign({ ...baseClaims, userId: '900000002' })], ['connection B']),
    ]);
    assert.deepEqual(concurrent.map(result => result.received), [['connection A'], ['connection B']]);
    passed('independent concurrent connections');

    console.log('RUN heartbeat: 70 second healthy idle and 60 second unresponsive-client timeout');
    const [healthy, unresponsive] = await Promise.all([healthyIdleConnection(page), noPongConnection()]);
    assert.equal(healthy.received, 'alive after 70 seconds');
    assert.ok(healthy.elapsedMs >= 69000);
    assert.equal(healthy.code, 1000);
    passed('healthy browser survives 70 seconds without chat messages', healthy);
    assert.equal(unresponsive.upgraded, true);
    assert.ok(unresponsive.pings >= 2);
    assert.ok(unresponsive.elapsedMs >= 55000 && unresponsive.elapsedMs < 75000);
    passed('client ignoring Ping is closed after 60 seconds', unresponsive);
    const afterIdle = await browserConnection(page, ['baiyun', validToken], ['reconnected']);
    assert.deepEqual(afterIdle.received, ['reconnected']);
    passed('new connection after heartbeat checks');

    const outputDir = path.resolve(__dirname, 'results');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'websocket-results.json'), JSON.stringify({
      scope: 'Real browser and WS service; in-memory test JWT; optional isolated test server; no database mutation or real-account login', results,
    }, null, 2));
    console.log(`PASS all ${results.length} checks; report written without credentials`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(String(error.message).replace(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]'));
  process.exitCode = 1;
});
