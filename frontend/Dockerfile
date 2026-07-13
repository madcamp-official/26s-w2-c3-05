# ---------- 1단계: 빌드 ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci                    # lock 기반 재현 가능한 설치
COPY . .
RUN npm run build             # tsc + vite build → dist/

# ---------- 2단계: nginx 서빙 ----------
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# 백엔드와 같은 멀티스테이지 패턴. node는 빌드에만 쓰고 최종 이미지는 nginx+정적파일뿐.