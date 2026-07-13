package com.example.demo.user.controller;

import com.example.demo.user.dto.LoginRequest;
import com.example.demo.user.dto.SignupRequest;
import com.example.demo.user.dto.TokenResponse;
import com.example.demo.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

//    POST /auth/login {userId, userPw}
//   → 비번 matches 검증 → JWT 발급 → {accessToken: "..."} 반환
//    이후 인증 필요한 API: 헤더에 Authorization: Bearer <token>
//   → JwtAuthenticationFilter가 검증 → SecurityContext에 등록
}
