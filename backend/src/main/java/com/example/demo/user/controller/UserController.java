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

    private final UserService userService; // RequiredArgsConstructor랑 매치

    @GetMapping("/me")
    public ResponseEntity<MyPageResponse> me(Authentication auth) {
        return ResponseEntity.ok(userService.getProfile(auth.getName()));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<MyPageResponse> profile(@PathVariable String userId) {
        // URL 경로에 포함된 가변적인 값(경로 변수)을 추출하여 파라미터 변수에 담아줍니다.
        // (예: /users/minsu로 요청이 오면 userId 변수에 "minsu"가 들어감)
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @PatchMapping("/me/nickname")
    public ResponseEntity<Void> updateNickname(Authentication auth, @Valid @RequestBody NicknameUpdateRequest req) {
        // 특징: NicknameUpdateRequest 객체 내부에 걸려있을 제한 조건
        // (예: @NotBlank, @Size 등)이 올바른지 메서드 실행 전에 검사합니다.
        // 만약 규칙을 어긴 데이터가 들어오면 메서드가 실행되지 않고
        // 에러(MethodArgumentNotValidException)가 발생합니다.
        userService.updateNickname(auth.getName(), req.userNickname());
        return ResponseEntity.ok().build();
    }

}
