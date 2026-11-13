// 이번 달 Fly.io 요금을 어림잡아 세다가, 정한 금액에 닿으면 그달에는 같이 하기를 닫는다.
// Fly.io에는 '얼마 넘으면 멈추기' 기능이 없어서 서버가 직접 센다.
// 요금 기준 (2026-10 Fly.io 요금표): shared-cpu-1x 256MB 시간당 $0.0030, 아시아 송신 1GB $0.04, 저장 공간 1GB 월 $0.15
import fs from 'node:fs';
import path from 'node:path';

const FILE = process.env.USAGE_FILE || '/data/usage.json';
const BUDGET_USD = Number(process.env.BUDGET_USD || 7.0);
const PER_HOUR = 0.0030;
const PER_GB = 0.04;
const FIXED = 0.15;          // 기록 저장 공간 (1GB)
const MSG_OVERHEAD = 60;     // 메시지 하나에 붙는 포장 크기 (넉넉히)

function monthKey() { return new Date().toISOString().slice(0, 7); }

let u = { month: monthKey(), secs: 0, bytes: 0 };
try {
  const saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (saved && saved.month === u.month) u = { month: saved.month, secs: Number(saved.secs) || 0, bytes: Number(saved.bytes) || 0 };
} catch (e) { /* 처음이거나 저장 공간이 없음 */ }

let last = Date.now();
function flush() {
  const now = Date.now();
  const m = monthKey();
  if (m !== u.month) u = { month: m, secs: 0, bytes: 0 };
  u.secs += (now - last) / 1000;
  last = now;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(u));
    fs.renameSync(FILE + '.tmp', FILE);
  } catch (e) { /* 저장 못 해도 메모리로는 센다 */ }
}
setInterval(flush, 30000).unref();
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { flush(); process.exit(0); });

export function addBytes(n) { u.bytes += n + MSG_OVERHEAD; }

export function costUsd() {
  const secs = u.secs + (Date.now() - last) / 1000;
  return FIXED + secs / 3600 * PER_HOUR + u.bytes / 1e9 * PER_GB;
}

export function overBudget() { return costUsd() >= BUDGET_USD; }

export function usage() {
  return { month: u.month, hours: Math.round(u.secs / 360) / 10, mb: Math.round(u.bytes / 1e6), costUsd: Math.round(costUsd() * 1000) / 1000, budgetUsd: BUDGET_USD };
}
