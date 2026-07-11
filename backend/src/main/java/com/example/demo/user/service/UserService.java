package com.example.demo.user.service;

import com.example.demo.user.dto.SignupRequest;
import com.example.demo.user.entity.Stat;
import com.example.demo.user.entity.UserInfo;
import com.example.demo.user.repository.StatRepository;
import com.example.demo.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final StatRepository statRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void signup(SignupRequest req) {
        if (userRepository.existsById(req.userId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 입궁한 환관입니다.");
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

}
