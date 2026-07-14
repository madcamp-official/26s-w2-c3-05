package com.example.demo.room.service;

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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final PlayerInfoRepository playerInfoRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // 방 생성: 방 저장 + 방장을 첫 참가자로 입장시킴
    @Transactional
    public RoomDto createRoom(String myId, RoomCreateRequest req) {
        if (playerInfoRepository.existsById_UserId(myId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 다른 방에 참여 중입니다.");
        }
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

        if (!room.isCanAccess()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "입장할 수 없는 방입니다."); // 게임 중 등
        }
        if (room.getRoomPw() != null
            && (roomPw == null || !passwordEncoder.matches(roomPw, room.getRoomPw()))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "방 비밀번호가 올바르지 않습니다.");
        }
        if (playerInfoRepository.existsById_UserId(myId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 다른 방에 참여 중입니다.");
        }
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

    // 방 나가기: 내 참가 기록 삭제, 방이 비면 방도 삭제
    @Transactional
    public void leaveRoom(String myId, Integer roomId) {
        PlayerInfo player = playerInfoRepository.findById(new PlayerInfoId(myId, roomId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "참여 중인 방이 아닙니다."));

        playerInfoRepository.delete(player);

        if (playerInfoRepository.countById_RoomId(roomId) == 0) {
            roomRepository.deleteById(roomId); // 빈 방 정리
        }
    }
}
