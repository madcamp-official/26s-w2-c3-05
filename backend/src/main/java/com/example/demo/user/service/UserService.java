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

        // save()가 반환한 "관리(managed) 인스턴스"를 이어서 써야 함.
        // PK를 직접 지정하는 엔티티라 save가 merge로 동작해 원본 변수는 비관리로 남는데,
        // 그 원본을 Stat에 넣으면 같은 ID 엔티티가 세션에 2개가 되어 NonUniqueObjectException 발생.
        UserInfo user = userRepository.save(UserInfo.builder()
                .userId(req.userId())
                .userPw(passwordEncoder.encode(req.userPw()))
                .userNickname(req.userNickname())
                .build());

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

    // 천하(랭킹): 어점 순 상위 최대 100위까지만 공개
    private static final int RANKING_CAP = 100;

    @Transactional(readOnly = true)
    public java.util.List<com.example.demo.user.dto.RankingDto> getRankings(int page, int size) {
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(size, RANKING_CAP));
        int offset = (safePage - 1) * safeSize;
        if (offset >= RANKING_CAP) return java.util.List.of();  // 100위 밖은 없음
        int limit = Math.min(safeSize, RANKING_CAP - offset);   // 마지막 페이지는 잘라서
        return statRepository
            .findAllByOrderByUserPointDescUserIdAsc(
                org.springframework.data.domain.PageRequest.of(offset / limit, limit))
            .stream().map(com.example.demo.user.dto.RankingDto::of).toList();
    }

    // 벗 찾기: 아이디/닉네임 부분일치 (본인 제외, 상위 10명)
    @Transactional(readOnly = true)
    public java.util.List<com.example.demo.user.dto.UserSummaryDto> searchUsers(String keyword, String myId) {
        return userRepository
            .findTop10ByUserIdContainingIgnoreCaseOrUserNicknameContainingIgnoreCase(keyword, keyword)
            .stream()
            .filter(u -> !u.getUserId().equals(myId))
            .map(u -> new com.example.demo.user.dto.UserSummaryDto(u.getUserId(), u.getUserNickname()))
            .toList();
    }

    @Transactional(readOnly = true)
    public boolean isUserIdAvailable(String userId) {
        return !userRepository.existsById(userId);
    }

    @Transactional(readOnly = true)
    public boolean isNicknameAvailable(String nickname) {
        return !userRepository.existsByUserNickname(nickname);
    }
}
