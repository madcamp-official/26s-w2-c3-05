package com.example.demo.user.controller;

import com.example.demo.user.dto.MyPageResponse;
import com.example.demo.user.dto.NicknameUpdateRequest;
import com.example.demo.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<MyPageResponse> me(Authentication auth) {
        return ResponseEntity.ok(userService.getProfile(auth.getName()));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<MyPageResponse> profile(@PathVariable String userId) {
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @PatchMapping("/me/nickname")
    public ResponseEntity<Void> updateNickname(Authentication auth, @Valid @RequestBody NicknameUpdateRequest req) {
        userService.updateNickname(auth.getName(), req.userNickname());
        return ResponseEntity.ok().build();
    }

}
