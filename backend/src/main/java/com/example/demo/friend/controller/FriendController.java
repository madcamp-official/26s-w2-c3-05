package com.example.demo.friend.controller;

import com.example.demo.friend.dto.FriendDto;
import com.example.demo.friend.dto.FriendSendRequest;
import com.example.demo.friend.service.FriendService;
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
@RequestMapping("/friends")
@RequiredArgsConstructor
public class FriendController {

    private final FriendService friendService;

    // 친구 요청 보내기
    @PostMapping("/requests")
    public ResponseEntity<Void> sendRequest(Authentication auth,
                                            @Valid @RequestBody FriendSendRequest req) {
        friendService.sendRequest(auth.getName(), req.toId()); // auth.getName() = JWT의 userId
        return ResponseEntity.status(HttpStatus.CREATED).build();
        // 보내줄 body가 존재하지 않기 때문에 .build()
    }

    // 내가 받은 대기중 요청 목록
    @GetMapping("/requests")
    public ResponseEntity<List<FriendDto>> receivedRequests(Authentication auth) {
        return ResponseEntity.ok(friendService.getReceivedRequests(auth.getName()));
    }

    // 요청 수락
    @PostMapping("/requests/{fromId}/accept")
    public ResponseEntity<Void> accept(Authentication auth, @PathVariable String fromId) {
        friendService.acceptRequest(auth.getName(), fromId);
        return ResponseEntity.ok().build();
    }

    // 요청 거절
    @DeleteMapping("/requests/{fromId}")
    public ResponseEntity<Void> reject(Authentication auth, @PathVariable String fromId) {
        friendService.rejectRequest(auth.getName(), fromId);
        return ResponseEntity.noContent().build(); // 204
    }

    // 친구 목록
    @GetMapping
    public ResponseEntity<List<FriendDto>> friends(Authentication auth) {
        return ResponseEntity.ok(friendService.getFriends(auth.getName()));
    }
}
