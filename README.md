# 냥냥놀이터

고양이 "냥이"와 함께하는 간단한 휴대폰 게임 모음 사이트입니다.

- `index.html`: 첫 화면 (게임 목록)
- `assets/`: 고양이 그림(`cat.svg`)과 공통 스타일(`style.css`)

GitHub Pages(main 브랜치, 루트 폴더)로 공개합니다.

## 냥이 꼬리기차 같이 하기 서버

- `games/cattrain/sim.js`: 게임 규칙 (화면과 서버가 같이 씀)
- `server/`: Cloudflare Workers + Durable Objects 서버. main에 병합되면 GitHub Actions가 자동 배포한다.
- 서버 주소는 `games/cattrain/server-config.js`. 비우거나 서버가 안 되면 컴퓨터 냥이와 혼자 놀기로 바뀐다.
- 내 컴퓨터에서 시험: `cd server && npm install && npm run dev`
