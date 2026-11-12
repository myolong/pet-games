// 냥이 꼬리기차 같이 하기 서버 (Fly.io 도쿄, node.js).
// 한국에서 가까운 곳에 서버 하나를 24시간 켜 두고, 놀이터(방) 다섯 개를 이 안에서 돌린다.
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { Room, roomNumber, ALLOWED_ORIGINS } from './room.js';

const PORT = Number(process.env.PORT || 8080);
const REGION = process.env.FLY_REGION || 'local';
const rooms = new Map();
function getRoom(n) {
  if (!rooms.has(n)) rooms.set(n, new Room());
  return rooms.get(n);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('cattrain ok');
  } else if (url.pathname === '/stats') {
    const st = Object.assign({ server: REGION }, getRoom(roomNumber(url.searchParams.get('room'))).stats());
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify(st, null, 1));
  } else {
    res.writeHead(404);
    res.end('not found');
  }
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://x');
  const origin = req.headers.origin;
  if (url.pathname !== '/ws' || (origin && !ALLOWED_ORIGINS.some((re) => re.test(origin)))) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    socket.setNoDelay(true);
    const room = getRoom(roomNumber(url.searchParams.get('room')));
    const c = room.connect(ws, { edge: 'fly', server: REGION });
    if (!c) return;
    ws.on('message', (data) => room.onMessage(c, String(data)));
    const bye = () => room.onClose(c);
    ws.on('close', bye);
    ws.on('error', bye);
  });
});

server.listen(PORT, () => console.log('cattrain listening on', PORT, REGION));
