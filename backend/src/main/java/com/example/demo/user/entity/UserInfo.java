package com.example.demo.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// 계정정보
@Entity
@Table(name = "user_info")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@lombok.AllArgsConstructor(access = AccessLevel.PRIVATE)
public class UserInfo {

    @Id
    @Column(name = "user_id", length = 16)
    private String userId;

    @Column(name = "user_pw", length = 255)
    private String userPw;

    @Column(name = "registered_at", nullable = false)
    @Builder.Default
    private Instant registeredAt = Instant.now();

    @Column(name = "user_nickname", length = 12)
    private String userNickname;

    // 프로필사진 (BYTEA)
    @Column(name = "user_profile")
    private byte[] userProfile;
}
