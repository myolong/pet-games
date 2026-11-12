# 냥이 털실 굴리기 같이 하기 서버 (Fly.io). 저장소 맨 위 폴더에서 빌드한다.
# 요금 상한(budget.js)은 꼬리기차 서버 것을 같이 쓰지만, 기록은 이 서버 저장 공간에 따로 센다.
FROM node:22-alpine
WORKDIR /app
RUN echo '{"type":"module","private":true}' > package.json && npm install --no-audit --no-fund ws@8.18.0
COPY games/yarn/sim.js games/yarn/sim.js
COPY server/src/budget.js server/src/budget.js
COPY server-yarn/src/room.js server-yarn/src/node.js server-yarn/src/
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server-yarn/src/node.js"]
