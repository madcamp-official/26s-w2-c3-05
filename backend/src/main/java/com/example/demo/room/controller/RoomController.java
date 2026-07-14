package com.example.demo.room.controller;

import com.example.demo.room.dto.PlayerDto;
import com.example.demo.room.dto.RoomCreateRequest;
import com.example.demo.room.dto.RoomDto;
import com.example.demo.room.dto.RoomJoinRequest;
import com.example.demo.room.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    // 방 생성 (생성자가 방장으로 자동 입장)
    @PostMapping
    public ResponseEntity<RoomDto> create(Authentication auth,
                                          @Valid @RequestBody RoomCreateRequest req) {
        RoomDto room = roomService.createRoom(auth.getName(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(room);
    }

    // 로비 방 목록
    @GetMapping
    public ResponseEntity<List<RoomDto>> list() {
        return ResponseEntity.ok(roomService.getRooms());
    }

    // 방 입장 (비밀방이면 body에 roomPw)
    @PostMapping("/{roomId}/join")
    public ResponseEntity<RoomDto> join(Authentication auth,
                                        @PathVariable Integer roomId,
                                        @RequestBody(required = false) RoomJoinRequest req) {
        String pw = req != null ? req.roomPw() : null;
        return ResponseEntity.ok(roomService.joinRoom(auth.getName(), roomId, pw));
    }

    // 방 참가자 목록
    @GetMapping("/{roomId}/players")
    public ResponseEntity<List<PlayerDto>> players(@PathVariable Integer roomId) {
        return ResponseEntity.ok(roomService.getPlayers(roomId));
    }

    // 방 나가기
    @DeleteMapping("/{roomId}/leave")
    public ResponseEntity<Void> leave(Authentication auth, @PathVariable Integer roomId) {
        roomService.leaveRoom(auth.getName(), roomId);
        return ResponseEntity.noContent().build(); // 204
    }
}
