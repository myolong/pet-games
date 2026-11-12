# 냥이 꼬리기차 같이 하기 서버 (Fly.io). 저장소 맨 위 폴더에서 빌드한다.
FROM node:22-alpine
WORKDIR /app
RUN echo '{"type":"module","private":true}' > package.json && npm install --no-audit --no-fund ws@8.18.0
COPY games/cattrain/sim.js games/cattrain/sim.js
COPY server/src/room.js server/src/node.js server/src/
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/src/node.js"]
