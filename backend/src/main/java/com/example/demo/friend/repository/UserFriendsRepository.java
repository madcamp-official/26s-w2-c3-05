package com.example.demo.friend.repository;

import com.example.demo.friend.entity.FriendType;
import com.example.demo.friend.entity.UserFriends;
import com.example.demo.friend.entity.UserFriendsId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserFriendsRepository extends JpaRepository<UserFriends, UserFriendsId> {

    // from = 나 인 관계들 (REQUESTED: 내가 보낸 요청 / FRIENDS: 친구)
    List<UserFriends> findAllById_FromIdAndFriendStatus(String fromId, FriendType status);

    // to = 나 인 관계들 (REQUESTED: 내가 받은 요청 / FRIENDS: 친구)
    List<UserFriends> findAllById_ToIdAndFriendStatus(String toId, FriendType status);
}
