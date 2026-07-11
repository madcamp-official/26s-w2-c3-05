package com.example.demo.room.entity;

import com.example.demo.user.entity.UserInfo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// 방정보 (room_id는 DB IDENTITY 자동발번)
@Entity
@Table(name = "room_info")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@lombok.AllArgsConstructor(access = AccessLevel.PRIVATE)
public class RoomInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_id")
    private Integer roomId;

    // 방장
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "creator_id", nullable = false)
    private UserInfo creator;

    @Column(name = "player_limit")
    private Integer playerLimit;

    @Column(name = "round_limit")
    private Integer roundLimit;

    @Column(name = "time_limit")
    private Integer timeLimit;

    @Column(name = "room_pw", length = 255)
    private String roomPw;

    @Column(name = "can_access", nullable = false)
    @Builder.Default
    private boolean canAccess = true;
}
