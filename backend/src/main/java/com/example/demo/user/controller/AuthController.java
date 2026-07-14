package com.example.demo.user.controller;

import com.example.demo.user.dto.LoginRequest;
import com.example.demo.user.dto.SignupRequest;
import com.example.demo.user.dto.TokenResponse;
import com.example.demo.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/signup")
    public ResponseEntity<Void> signup(@Valid @RequestBody SignupRequest req) {
        userService.signup(req);
        return ResponseEntity.status(HttpStatus.CREATED).build(); // 201
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest req) {
        String token = userService.login(req);
        return ResponseEntity.ok(new TokenResponse(token)); // 200
    }

    // 아이디 중복확인: true = 사용 가능
    @GetMapping("/check-id")
    public ResponseEntity<Boolean> checkId(@RequestParam String userId) {
        // 특징: 예를 들어 /users/check-id?userId=minsu 형태로 요청이 들어오면,
        // ?userId= 뒤에 붙은 "minsu"라는 값을 추출해서 매개변수에 꽂아줍니다.
        return ResponseEntity.ok(userService.isUserIdAvailable(userId));
    }

    // 닉네임 중복확인
    @GetMapping("/check-nickname")
    public ResponseEntity<Boolean> checkNickname(@RequestParam String nickname) {
        return ResponseEntity.ok(userService.isNicknameAvailable(nickname));
    }

//    POST /auth/login {userId, userPw}
//   → 비번 matches 검증 → JWT 발급 → {accessToken: "..."} 반환
//    이후 인증 필요한 API: 헤더에 Authorization: Bearer <token>
//   → JwtAuthenticationFilter가 검증 → SecurityContext에 등록
}
