# 냥냥놀이터

고양이 "냥이"와 함께하는 간단한 휴대폰 게임 모음 사이트입니다.

- `index.html`: 첫 화면 (게임 목록)
- `assets/`: 고양이 그림(`cat.svg`)과 공통 스타일(`style.css`)

GitHub Pages(main 브랜치, 루트 폴더)로 공개합니다.

## 냥이 꼬리기차 같이 하기 서버

- `games/cattrain/sim.js`: 게임 규칙 (화면과 서버가 같이 씀)
- `server/src/room.js`: 놀이터(방) 하나의 진행 (서버 종류와 상관없이 같이 씀)
- `server/src/node.js`, `server/Dockerfile`, `server/fly.toml`: Fly.io 도쿄 서버 (지금 쓰는 서버). main에 병합되면 GitHub Actions가 자동 배포한다 (Secrets `FLY_API_TOKEN` 필요). 상태 확인: `/stats`
- `server/src/index.js`: 예전 Cloudflare Workers 서버. 한국에서 무료 요금제로 접속하면 미국을 거쳐 왕복 0.5초 이상 걸려서 지금은 안 쓴다.
- 서버 주소는 `games/cattrain/server-config.js`. 비우거나 서버가 안 되면 컴퓨터 냥이와 혼자 놀기로 바뀐다.
- 내 컴퓨터에서 시험: `cd server && npm install && npm run dev`

## 냥이 털실 굴리기 같이 하기 서버

- `games/yarn/sim.js`: 게임 규칙 (화면과 서버가 같이 씀)
- `server-yarn/src/room.js`, `server-yarn/src/node.js`, `server-yarn/Dockerfile`, `server-yarn/fly.toml`: 꼬리기차와 따로 도는 Fly.io 도쿄 서버(`nyangnyang-yarn`). 요금 상한도 따로 월 2달러(`BUDGET_USD`). main에 병합되면 GitHub Actions(`yarn-fly.yml`)가 자동 배포한다. 상태 확인: `https://nyangnyang-yarn.fly.dev/stats`
- 서버 주소는 `games/yarn/server-config.js`.
