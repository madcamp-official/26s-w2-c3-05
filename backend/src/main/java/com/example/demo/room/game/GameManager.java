package com.example.demo.room.game;

import com.example.demo.room.dto.GameEvent;
import com.example.demo.room.service.GameService;
import com.example.demo.topic.entity.Topic;
import com.example.demo.topic.repository.TopicRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
// 게임 두뇌 (메모리 + 타이머 + 방송)
public class GameManager {

    private final SimpMessagingTemplate messaging;
    private final TopicRepository topicRepository;
    private final GameService gameService;

    private final Map<Integer, GameState> games = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private final Random random = new Random();

    // 고정 게임 규칙 (방의 roundLimit/timeLimit 대신 이 값을 사용)
    private static final int TOTAL_ROUNDS = 4;          // 총 4라운드
    private static final int ROUND_DURATION_SEC = 180;  // 라운드당 3분 (웃어도 끝까지 진행)
    private static final int MAX_SCORE_PER_ROUND = 5;   // 하인 1명이 한 라운드에 얻을 수 있는 최대 점수
    private static final int AWARDS_PER_ROUND = 5;      // 공주가 한 라운드에 하사할 수 있는 어점 총량

    // 게임 시작 (방장이 소켓으로 호출)
    public void startGame(Integer roomId, String requesterId) {
        if (games.containsKey(roomId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 게임이 진행 중입니다.");
        }
        GameService.GameInit init = gameService.startAndLock(roomId, requesterId);
        GameState state = new GameState(roomId, new ArrayList<>(init.players()),
                TOTAL_ROUNDS, ROUND_DURATION_SEC);
        games.put(roomId, state);
        startRound(state);
    }

    // 한 라운드 시작 (라운드 초과면 게임 종료)
    private synchronized void startRound(GameState s) {
        startRound(s, false);
    }

    // randomPrincess=true: 공주 이탈 등으로 이어지는 라운드 — 남은 인원 중 랜덤 간택
    private synchronized void startRound(GameState s, boolean randomPrincess) {
        s.round++;
        if (s.round > s.totalRounds) {
            endGame(s);
            return;
        }
        s.princessId = randomPrincess
                ? s.players.get(random.nextInt(s.players.size()))
                : s.players.get((s.round - 1) % s.players.size()); // 평소엔 공주 순환
        s.roundScores.clear();                                          // 라운드별 점수 상한 초기화
        s.awardsThisRound = 0;                                          // 어점 하사 한도 초기화
        List<Topic> topics = topicRepository.findAll();
        Topic topic = topics.get(random.nextInt(topics.size()));       // 랜덤 주제
        s.roundActive = true;

        messaging.convertAndSend("/topic/rooms/" + s.roomId + "/game",
                GameEvent.roundStart(s.round, s.princessId, topic.getTopicId(), topic.getTopicHead()));

        // 3분 지나면 라운드 종료 (웃음과 무관하게 시간으로만 끝남)
        s.timer = scheduler.schedule(() -> onTimeout(s.roomId), s.timeLimitSec, TimeUnit.SECONDS);
    }

    // 공주가 웃음 (공주 클라이언트가 happy 감지해서 전송)
    // 라운드를 끝내지 않고, 하인들에게만 점수를 준다 (하인당 라운드 최대 3점)
    public synchronized void handleLaugh(Integer roomId, String userId) {
        GameState s = games.get(roomId);
        if (s == null || !s.roundActive || !userId.equals(s.princessId)) return;

        for (String p : s.players) {
            if (p.equals(s.princessId)) continue;
            int earned = s.roundScores.getOrDefault(p, 0);
            if (earned >= MAX_SCORE_PER_ROUND) continue; // 이번 라운드 상한 도달 시 스킵
            s.roundScores.put(p, earned + 1);
            s.scores.merge(p, 1, Integer::sum);
        }

        // 점수만 갱신해 방송, 타이머는 유지 → 라운드 계속 진행
        messaging.convertAndSend("/topic/rooms/" + roomId + "/game",
                GameEvent.laugh(s.round, s.scores));
    }

    // 제한시간(3분) 초과 → 라운드 종료 후 다음 라운드
    private synchronized void onTimeout(Integer roomId) {
        GameState s = games.get(roomId);
        if (s == null || !s.roundActive) return;

        s.roundActive = false;
        messaging.convertAndSend("/topic/rooms/" + roomId + "/game",
                GameEvent.roundEnd(s.round, s.scores));
        startRound(s);
    }

    // 공주가 하인에게 어점(御點) 하사 — 검증·점수·방송 모두 서버가 담당
    public synchronized void handleAward(Integer roomId, String senderId, String targetId) {
        GameState s = games.get(roomId);
        if (s == null || !s.roundActive) return;
        if (!senderId.equals(s.princessId)) return;          // 공주만 하사 가능
        if (targetId == null || !s.players.contains(targetId) || targetId.equals(s.princessId)) return;
        if (s.awardsThisRound >= AWARDS_PER_ROUND) return;   // 라운드당 한도

        s.awardsThisRound++;
        s.scores.merge(targetId, 1, Integer::sum);

        messaging.convertAndSend("/topic/rooms/" + roomId + "/game",
                GameEvent.award(s.round, s.scores, targetId));
    }

    // 게임 중 이탈 처리 (명시적 leave·소켓 끊김 공통)
    // - 남은 인원 1명 이하 → 게임 중단(GAME_ABORT) + 방 잠금 해제
    // - 공주가 나가면 현재 라운드를 접고 다음 라운드로
    public synchronized void handlePlayerLeave(Integer roomId, String userId) {
        GameState s = games.get(roomId);
        if (s == null || !s.players.remove(userId)) return;

        if (s.players.size() < 2) {
            if (s.timer != null) s.timer.cancel(false);
            games.remove(roomId);
            messaging.convertAndSend("/topic/rooms/" + roomId + "/game",
                    GameEvent.abort(s.scores));
            gameService.unlockRoom(roomId); // 다시 대기방으로 쓸 수 있게
            return;
        }
        if (userId.equals(s.princessId) && s.roundActive) {
            if (s.timer != null) s.timer.cancel(false);
            s.roundActive = false;
            messaging.convertAndSend("/topic/rooms/" + roomId + "/game",
                    GameEvent.roundEnd(s.round, s.scores));
            startRound(s, true); // 남은 유저 중 랜덤으로 공주 간택 후 다음 라운드
        }
    }

    // 게임 종료: 승자 계산 → 방송 → DB 집계
    private void endGame(GameState s) {
        games.remove(s.roomId);
        String winner = s.scores.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElse(null);

        messaging.convertAndSend("/topic/rooms/" + s.roomId + "/game",
                GameEvent.gameEnd(s.scores, winner));
        gameService.finish(s.roomId, s.scores, winner);
    }
}
// synchronized로 라운드 전환을 직렬화 → 타이머와 웃음 이벤트가 동시에 와도 라운드가 두 번 넘어가지 않음. roundActive 플래그가 이중처리 방지.
// 타이머는 스프링 스케줄러 대신 자체 ScheduledExecutorService 사용 → @EnableScheduling 설정 불필요, 라운드마다 하나 걸고 웃으면 취소.
// DB는 시작/종료 두 순간만 GameService에 위임(트랜잭션 경계 명확).