package com.example.demo.room.dto;

import java.util.Map;

//  게임 채널 방송 페이로드
public record GameEvent(
        String type,               // ROUND_START | LAUGH | AWARD | ROUND_END | GAME_END | GAME_ABORT
        Integer round,
        String princessId,         // ROUND_START
        Integer topicId,           // ROUND_START
        String topicHead,          // ROUND_START
        Map<String, Integer> scores, // LAUGH | AWARD | ROUND_END | GAME_END
        String winnerId,           // GAME_END
        String targetId            // AWARD: 어점을 받은 하인
) {
    public static GameEvent roundStart(int round, String princessId, int topicId, String topicHead) {
        return new GameEvent("ROUND_START", round, princessId, topicId, topicHead, null, null, null);
    }
    // 공주가 웃어서 하인들이 득점 (라운드는 계속 진행)
    public static GameEvent laugh(int round, Map<String, Integer> scores) {
        return new GameEvent("LAUGH", round, null, null, null, scores, null, null);
    }
    // 공주가 하인에게 어점(御點) 하사
    public static GameEvent award(int round, Map<String, Integer> scores, String targetId) {
        return new GameEvent("AWARD", round, null, null, null, scores, null, targetId);
    }
    // 라운드 종료(제한시간 만료)
    public static GameEvent roundEnd(int round, Map<String, Integer> scores) {
        return new GameEvent("ROUND_END", round, null, null, null, scores, null, null);
    }
    public static GameEvent gameEnd(Map<String, Integer> scores, String winnerId) {
        return new GameEvent("GAME_END", null, null, null, null, scores, winnerId, null);
    }
    // 인원 부족(1명 잔류)으로 게임 중단 → 클라는 대기화면으로 복귀
    public static GameEvent abort(Map<String, Integer> scores) {
        return new GameEvent("GAME_ABORT", null, null, null, null, scores, null, null);
    }
}
