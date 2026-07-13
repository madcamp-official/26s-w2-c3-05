package com.example.demo.user.service;

import com.example.demo.global.jwt.JwtProvider;
import com.example.demo.user.dto.LoginRequest;
import com.example.demo.user.dto.SignupRequest;
import com.example.demo.user.entity.Stat;
import com.example.demo.user.entity.UserInfo;
import com.example.demo.user.repository.StatRepository;
import com.example.demo.user.repository.UserRepository;
import com.example.demo.user.dto.MyPageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final StatRepository statRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    @Transactional
    public void signup(SignupRequest req) {
        if (userRepository.existsById(req.userId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 입궁한 내신입니다.");
        }

        UserInfo user = UserInfo.builder()
                .userId(req.userId())
                .userPw(passwordEncoder.encode(req.userPw()))
                .userNickname(req.userNickname())
                .build();
        userRepository.save(user);

        Stat stat = Stat.builder().user(user).build();
        statRepository.save(stat);

    }

    @Transactional(readOnly = true)
    public String login(LoginRequest req) {
        UserInfo user = userRepository.findById(req.userId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "존함과 암문서가 올바르지 않습니다."));

        if (!passwordEncoder.matches(req.userPw(), user.getUserPw())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "존함 혹은 암문서가 올바르지 않습니다.");
        }
        return jwtProvider.createToken(user.getUserId());
    }

    @Transactional(readOnly = true)
    public MyPageResponse getProfile(String userId) {
        UserInfo user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 재상(宰相)입니다."));
        Stat stat = statRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "연회 내역이 없습니다."));
        return MyPageResponse.of(user, stat);
    }

    @Transactional
    public void updateNickname(String userId, String nickname) {
        UserInfo user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 내신입니다."));
        user.setUserNickname(nickname); // 더티체킹으로 UPDATE
    }
}
