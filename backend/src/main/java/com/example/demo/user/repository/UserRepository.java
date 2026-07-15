package com.example.demo.user.repository;

import com.example.demo.user.entity.UserInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserRepository extends JpaRepository<UserInfo, String> {
    // existsById(userId) 는 JpaRepository가 기본 제공
    boolean existsByUserNickname(String userNickname);   // 닉네임 중복확인용

    // 벗 찾기: 아이디/닉네임 부분일치 검색 (상위 10명)
    List<UserInfo> findTop10ByUserIdContainingIgnoreCaseOrUserNicknameContainingIgnoreCase(
        String userId, String userNickname);
}
