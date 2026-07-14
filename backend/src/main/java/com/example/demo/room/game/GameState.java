package com.example.demo.room.game;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ScheduledFuture;

// 방 하나의 게임 상태 (메모리)
// DB 아님. 게임 중에만 서버 메모리에 존재
// 엔티티가 아니라 순수 자바 객체입니다. userId 문자열만 담아서,
// 나중에 LAZY 로딩 문제 없이 어느 스레드에서든 다룰 수 있게 함.
public class GameState {
    public final int roomId;
    public final List<String> players;   // 시작 시점 참가자 (고정)
    public final int totalRounds;
    public final int timeLimitSec;
    public final Map<String, Integer> scores = new HashMap<>();
    public final Map<String, Integer> roundScores = new HashMap<>(); // 이번 라운드 하인별 획득(라운드당 상한 3점 체크용)
    public int awardsThisRound = 0;      // 이번 라운드에 공주가 하사한 어점 수

    public int round = 0;
    public String princessId;            // 이번 라운드의 공주 (웃음 대상)
    public boolean roundActive = false;
    public ScheduledFuture<?> timer;     // 이번 라운드 제한시간 타이머

    public GameState(int roomId, List<String> players, int totalRounds, int timeLimitSec) {
        this.roomId = roomId;
        this.players = players;
        this.totalRounds = totalRounds;
        this.timeLimitSec = timeLimitSec;
        players.forEach(p -> scores.put(p, 0));
    }
}