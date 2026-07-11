package com.example.demo.friend.entity;

import com.example.demo.user.entity.UserInfo;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

// 친구목록 (from → to 관계 1행)
@Entity
@Table(name = "user_friends")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@lombok.AllArgsConstructor(access = AccessLevel.PRIVATE)
public class UserFriends {

    @EmbeddedId
    private UserFriendsId id;

    // 발신자
    @MapsId("fromId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_id")
    private UserInfo fromUser;

    // 수신자
    @MapsId("toId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_id")
    private UserInfo toUser;

    @Column(name = "friend_date")
    @Builder.Default
    private Instant friendDate = Instant.now();

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM) // friendtype_t
    @Column(name = "friend_status", nullable = false, columnDefinition = "friendtype_t")
    @Builder.Default
    private FriendType friendStatus = FriendType.NONE;
}
