package com.example.demo.room.dto;

import java.util.Map;

//  게임 채널 방송 페이로드
public record GameEvent(
        String type,               // ROUND_START | LAUGH | ROUND_END | GAME_END
        Integer round,
        String princessId,         // ROUND_START
        Integer topicId,           // ROUND_START
        String topicHead,          // ROUND_START
        Map<String, Integer> scores, // LAUGH | ROUND_END | GAME_END
        String winnerId            // GAME_END
) {
    public static GameEvent roundStart(int round, String princessId, int topicId, String topicHead) {
        return new GameEvent("ROUND_START", round, princessId, topicId, topicHead, null, null);
    }
    // 공주가 웃어서 하인들이 득점 (라운드는 계속 진행)
    public static GameEvent laugh(int round, Map<String, Integer> scores) {
        return new GameEvent("LAUGH", round, null, null, null, scores, null);
    }
    // 라운드 종료(제한시간 만료)
    public static GameEvent roundEnd(int round, Map<String, Integer> scores) {
        return new GameEvent("ROUND_END", round, null, null, null, scores, null);
    }
    public static GameEvent gameEnd(Map<String, Integer> scores, String winnerId) {
        return new GameEvent("GAME_END", null, null, null, null, scores, winnerId);
    }
}
