package com.example.demo.room.service;

import com.example.demo.room.dto.PlayerDto;
import com.example.demo.room.dto.RoomCreateRequest;
import com.example.demo.room.dto.RoomDto;
import com.example.demo.room.entity.PlayerInfo;
import com.example.demo.room.entity.PlayerInfoId;
import com.example.demo.room.entity.RoomInfo;
import com.example.demo.room.repository.PlayerInfoRepository;
import com.example.demo.room.repository.RoomRepository;
import com.example.demo.user.entity.UserInfo;
import com.example.demo.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomService {

    public record LeaveResult(boolean roomDeleted, String newHostId) {}

    private final RoomRepository roomRepository;
    private final PlayerInfoRepository playerInfoRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SimpMessagingTemplate messaging;

    // 유저를 현재 참여 중인 모든 방에서 떼어낸다 (새 방 생성/입장 전 상태 정리)
    // 이전 세션이 비정상 종료(새로고침·탭닫기 등)돼 잔류한 참여 기록 때문에
    // "이미 다른 방에 참여 중" 409로 영영 막히는 문제를 방지한다.
    private void detachFromAnyRoom(String myId) {
        for (PlayerInfo p : playerInfoRepository.findAllById_UserId(myId)) {
            Integer oldRoomId = p.getId().getRoomId();
            RoomInfo oldRoom = roomRepository.findByRoomIdForUpdate(oldRoomId).orElse(null);
            boolean iAmCreator = oldRoom != null && oldRoom.getCreator().getUserId().equals(myId);
            if (iAmCreator) {
                // 내가 방장이던 방은 폐쇄: 참가자 전원 → 방 순서로 명시 삭제
                // (DB CASCADE에 맡기면 Hibernate flush 순서에 따라 삭제가 묻히는 경우가 있음)
                LeaveResult result = transferHostOrDelete(oldRoom, p);
                if (result.newHostId() != null) {
                    messaging.convertAndSend("/topic/rooms/" + oldRoomId,
                            com.example.demo.room.dto.RoomEvent.hostChanged(result.newHostId()));
                }
            } else {
                playerInfoRepository.delete(p);
                if (playerInfoRepository.countById_RoomId(oldRoomId) == 0) {
                    roomRepository.deleteById(oldRoomId); // 빈 방 정리
                }
            }
        }
        // 삭제를 즉시 DB에 반영 — 이어지는 INSERT(새 방 생성)와 순서가 꼬이지 않게
        playerInfoRepository.flush();
        roomRepository.flush();
    }

    // 방 생성: 기존 참여 정리 → 방 저장 + 방장을 첫 참가자로 입장시킴
    @Transactional
    public RoomDto createRoom(String myId, RoomCreateRequest req) {
        detachFromAnyRoom(myId);
        UserInfo me = userRepository.getReferenceById(myId);

        RoomInfo room = RoomInfo.builder()
            .creator(me).roomName(req.roomName())
            .playerLimit(req.playerLimit())
            .roundLimit(req.roundLimit())
            .timeLimit(req.timeLimit())
            // 비밀번호도 유저 비번처럼 해시로 저장 (평문 저장 금지)
            .roomPw(req.roomPw() != null && !req.roomPw().isBlank()
                ? passwordEncoder.encode(req.roomPw()) : null)
            .build();
        roomRepository.save(room); // 저장 시점에 room_id 자동발번

        playerInfoRepository.save(PlayerInfo.builder()
            .id(new PlayerInfoId(myId, room.getRoomId()))
            .user(me)
            .room(room)
            .build());

        return RoomDto.of(room, 1);
    }

    // 로비 방 목록 (입장 가능한 방만, 최신순)
    @Transactional(readOnly = true)
    public List<RoomDto> getRooms() {
        return roomRepository.findAllByCanAccessTrueOrderByRoomIdDesc()
            .stream()
            .map(room -> RoomDto.of(room, playerInfoRepository.countById_RoomId(room.getRoomId())))
            .toList();
    }

    // 방 입장: 존재/접근가능/비번/정원/중복 검증 후 참가자 등록
    @Transactional
    public RoomDto joinRoom(String myId, Integer roomId, String roomPw) {
        RoomInfo room = roomRepository.findById(roomId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 방입니다."));

        // 이미 이 방에 있으면 그대로 통과 (방장 자동입장 후 재클릭, 새로고침 대비)
        if (playerInfoRepository.existsById(new PlayerInfoId(myId, roomId))) {
            return RoomDto.of(room, playerInfoRepository.countById_RoomId(roomId));
        }

        if (!room.isCanAccess()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "입장할 수 없는 방입니다."); // 게임 중 등
        }
        if (room.getRoomPw() != null
            && (roomPw == null || !passwordEncoder.matches(roomPw, room.getRoomPw()))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "방 비밀번호가 올바르지 않습니다.");
        }
        detachFromAnyRoom(myId); // 다른 방에 잔류 중이면 자동 이탈 후 입장
        long current = playerInfoRepository.countById_RoomId(roomId);
        if (current >= room.getPlayerLimit()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "정원이 가득 찼습니다.");
        }

        UserInfo me = userRepository.getReferenceById(myId);
        playerInfoRepository.save(PlayerInfo.builder()
            .id(new PlayerInfoId(myId, roomId))
            .user(me)
            .room(room)
            .build());

        return RoomDto.of(room, current + 1);
    }

    // 방 참가자 목록 (대기방 명단)
    @Transactional(readOnly = true)
    public List<PlayerDto> getPlayers(Integer roomId) {
        return playerInfoRepository.findAllById_RoomId(roomId).stream()
                .map(p -> new PlayerDto(p.getUser().getUserId(), p.getUser().getUserNickname()))
                .toList();
    }

    // 방 나가기: 내 참가 기록 삭제, 방이 비면 방도 삭제
    // 방장이 나가면 방 자체를 폐쇄 (참가자 기록은 FK ON DELETE CASCADE로 함께 정리)
    @Transactional
    public LeaveResult leaveRoom(String myId, Integer roomId) {
        PlayerInfo player = playerInfoRepository.findById(new PlayerInfoId(myId, roomId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "참여 중인 방이 아닙니다."));

        RoomInfo room = roomRepository.findByRoomIdForUpdate(roomId).orElse(null);
        if (room != null && room.getCreator().getUserId().equals(myId)) {
            // 방장 퇴장 = 연회 폐쇄 (참가자 → 방 순서로 명시 삭제)
            return transferHostOrDelete(room, player);
        }

        playerInfoRepository.delete(player);

        if (playerInfoRepository.countById_RoomId(roomId) == 0) {
            roomRepository.deleteById(roomId); // 빈 방 정리
        }
        return new LeaveResult(false, null);
    }

    private LeaveResult transferHostOrDelete(RoomInfo room, PlayerInfo leavingPlayer) {
        playerInfoRepository.delete(leavingPlayer);
        playerInfoRepository.flush();

        List<PlayerInfo> remaining = playerInfoRepository
            .findAllById_RoomIdOrderById_UserIdAsc(room.getRoomId());
        if (remaining.isEmpty()) {
            roomRepository.delete(room);
            return new LeaveResult(true, null);
        }

        String newHostId = remaining.get(0).getUser().getUserId();
        room.setCreator(remaining.get(0).getUser());
        return new LeaveResult(false, newHostId);
    }
}
