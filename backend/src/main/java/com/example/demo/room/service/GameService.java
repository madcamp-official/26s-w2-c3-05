package com.example.demo.room.service;

import com.example.demo.room.entity.RoomInfo;
import com.example.demo.room.repository.PlayerInfoRepository;
import com.example.demo.room.repository.RoomRepository;
import com.example.demo.user.repository.StatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

// DB를 만지는 부분만 분리 (@Transactional)
@Service
@RequiredArgsConstructor
public class GameService {

    private final RoomRepository roomRepository;
    private final PlayerInfoRepository playerInfoRepository;
    private final StatRepository statRepository;

    // 게임 시작 정보 (참가자/라운드수/시간)
    public record GameInit(List<String> players, int totalRounds, int timeLimitSec) {}

    // 시작 검증 + 방 잠금 + 참가자/설정 반환
    @Transactional
    public GameInit startAndLock(Integer roomId, String requesterId) {
        RoomInfo room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 방입니다."));
        if (!room.getCreator().getUserId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "방장만 게임을 시작할 수 있습니다.");
        }
        List<String> players = playerInfoRepository.findAllById_RoomId(roomId).stream()
                .map(p -> p.getId().getUserId())
                .toList();
        if (players.size() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "2명 이상이어야 시작할 수 있습니다.");
        }
        room.setCanAccess(false); // 입장 잠금 (더티체킹)

        int rounds = room.getRoundLimit() != null ? room.getRoundLimit() : players.size();
        int time = room.getTimeLimit() != null ? room.getTimeLimit() : 60;
        return new GameInit(players, rounds, time);
    }

    // 게임 종료: 전적 집계 + 방 잠금 해제
    @Transactional
    public void finish(Integer roomId, Map<String, Integer> scores, String winnerId) {
        scores.forEach((userId, score) -> statRepository.findById(userId).ifPresent(stat -> {
            stat.setUserPlayed(stat.getUserPlayed() + 1);
            stat.setUserPoint(stat.getUserPoint() + score);
            if (userId.equals(winnerId)) stat.setUserWin(stat.getUserWin() + 1);
            else stat.setUserLose(stat.getUserLose() + 1);
        }));
        roomRepository.findById(roomId).ifPresent(r -> r.setCanAccess(true)); // 다시 입장 가능
    }
}
// 의도: LAZY 접근(room.getCreator())과 DB 쓰기는 반드시 트랜잭션 안에서만 안전합니다.
// 그래서 DB 건드리는 두 순간(시작 잠금 / 종료 집계)만
// 여기 @Transactional 메서드로 떼어냈어요.
// 타이머 콜백(다른 스레드)에서 호출돼도 별도 빈이라 프록시가 정상 작동합니다.