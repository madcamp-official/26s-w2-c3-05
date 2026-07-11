package com.example.demo.friend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

// user_friends 복합 PK (from_id, to_id)
@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@EqualsAndHashCode
public class UserFriendsId implements Serializable {

    @Column(name = "from_id", length = 16)
    private String fromId;

    @Column(name = "to_id", length = 16)
    private String toId;
}
