package com.example.demo.room.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

// player_info 복합 PK (user_id, room_id)
@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@EqualsAndHashCode
public class PlayerInfoId implements Serializable {

    @Column(name = "user_id", length = 16)
    private String userId;

    @Column(name = "room_id")
    private Integer roomId;
}
