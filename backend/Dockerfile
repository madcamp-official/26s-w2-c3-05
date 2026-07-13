# ---------- 1단계: 빌드 ----------
FROM gradle:8.14-jdk17 AS build
WORKDIR /app

# 의존성 캐시: gradle 설정만 먼저 복사해서 받아두면
# 코드만 바뀌었을 땐 이 레이어를 재사용해 빌드가 훨씬 빨라짐
COPY build.gradle settings.gradle ./
RUN gradle dependencies --no-daemon || true

# 소스 복사 후 빌드 (테스트는 실DB가 필요하므로 스킵)
COPY src ./src
RUN gradle bootJar --no-daemon -x test

# ---------- 2단계: 실행 ----------
# JRE만 있는 가벼운 이미지 (빌드 도구 없이 jar만 실행)
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]