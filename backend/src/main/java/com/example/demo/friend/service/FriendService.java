package com.example.demo.friend.service;

import com.example.demo.friend.dto.FriendDto;
import com.example.demo.friend.entity.FriendType;
import com.example.demo.friend.entity.UserFriends;
import com.example.demo.friend.entity.UserFriendsId;
import com.example.demo.friend.repository.UserFriendsRepository;
import com.example.demo.notification.entity.Notification;
import com.example.demo.notification.entity.NotificationType;
import com.example.demo.notification.repository.NotificationRepository;
import com.example.demo.user.entity.UserInfo;
import com.example.demo.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FriendService {

    private final UserFriendsRepository userFriendsRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    // 친구 요청 보내기: (me → toId) REQUESTED 행 생성 + 상대에게 알림
    @Transactional
    public void sendRequest(String myId, String toId) {
        if (myId.equals(toId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자기 자신에게는 요청할 수 없습니다.");
        }
        UserInfo target = userRepository.findById(toId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 유저입니다."));

        // 이미 관계가 있으면(내가 보냈든 상대가 보냈든) 중복 요청 막기
        if (userFriendsRepository.existsById(new UserFriendsId(myId, toId))
            || userFriendsRepository.existsById(new UserFriendsId(toId, myId))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 요청했거나 친구인 상대입니다.");
        }

        UserInfo me = userRepository.getReferenceById(myId); // 조회 없이 참조만
        UserFriends relation = UserFriends.builder()
            .id(new UserFriendsId(myId, toId))
            .fromUser(me)
            .toUser(target)
            .friendStatus(FriendType.REQUESTED)
            .build();
        userFriendsRepository.save(relation);

        notificationRepository.save(Notification.builder()
            .recipient(target)
            .actor(me)
            .type(NotificationType.FRIEND_REQUEST)
            .build());
    }

    // 요청 수락: (fromId → me) REQUESTED 행을 FRIENDS로 + 보낸 사람에게 알림
    @Transactional
    public void acceptRequest(String myId, String fromId) {
        UserFriends relation = userFriendsRepository.findById(new UserFriendsId(fromId, myId))
            .filter(r -> r.getFriendStatus() == FriendType.REQUESTED)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "받은 요청이 없습니다."));

        relation.setFriendStatus(FriendType.FRIENDS); // 더티체킹으로 UPDATE

        notificationRepository.save(Notification.builder()
            .recipient(relation.getFromUser())
            .actor(relation.getToUser())
            .type(NotificationType.FRIEND_ACCEPT)
            .build());
    }

    // 요청 거절: (fromId → me) REQUESTED 행 삭제
    @Transactional
    public void rejectRequest(String myId, String fromId) {
        UserFriends relation = userFriendsRepository.findById(new UserFriendsId(fromId, myId))
            .filter(r -> r.getFriendStatus() == FriendType.REQUESTED)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "받은 요청이 없습니다."));

        userFriendsRepository.delete(relation);
    }

    // 내가 보낸 대기중 요청 목록 (받는 사람 정보로 변환)
    @Transactional(readOnly = true)
    public List<FriendDto> getSentRequests(String myId) {
        return userFriendsRepository.findAllById_FromIdAndFriendStatus(myId, FriendType.REQUESTED)
            .stream()
            .map(r -> new FriendDto(r.getToUser().getUserId(), r.getToUser().getUserNickname()))
            .toList();
    }

    // 내가 보낸 요청 취소: (me → toId) REQUESTED 행 삭제
    @Transactional
    public void cancelSentRequest(String myId, String toId) {
        UserFriends relation = userFriendsRepository.findById(new UserFriendsId(myId, toId))
            .filter(r -> r.getFriendStatus() == FriendType.REQUESTED)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "보낸 요청이 없습니다."));
        userFriendsRepository.delete(relation);
    }

    // 친구 삭제: 방향 무관하게 FRIENDS 관계 행 삭제
    @Transactional
    public void removeFriend(String myId, String otherId) {
        UserFriends relation = userFriendsRepository.findById(new UserFriendsId(myId, otherId))
            .filter(r -> r.getFriendStatus() == FriendType.FRIENDS)
            .or(() -> userFriendsRepository.findById(new UserFriendsId(otherId, myId))
                .filter(r -> r.getFriendStatus() == FriendType.FRIENDS))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "벗이 아닙니다."));
        userFriendsRepository.delete(relation);
    }

    // 내가 받은 대기중 요청 목록 (보낸 사람 정보로 변환)
    @Transactional(readOnly = true)
    public List<FriendDto> getReceivedRequests(String myId) {
        return userFriendsRepository.findAllById_ToIdAndFriendStatus(myId, FriendType.REQUESTED)
            .stream()
            .map(r -> new FriendDto(r.getFromUser().getUserId(), r.getFromUser().getUserNickname()))
            .toList();
    }

    // 친구 목록: 한 행이 방향을 가지므로 양방향 다 모아서 "상대방"으로 변환
    @Transactional(readOnly = true)
    public List<FriendDto> getFriends(String myId) {
        List<FriendDto> result = new ArrayList<>();
        userFriendsRepository.findAllById_FromIdAndFriendStatus(myId, FriendType.FRIENDS)
            .forEach(r -> result.add(new FriendDto(r.getToUser().getUserId(), r.getToUser().getUserNickname())));
        userFriendsRepository.findAllById_ToIdAndFriendStatus(myId, FriendType.FRIENDS)
            .forEach(r -> result.add(new FriendDto(r.getFromUser().getUserId(), r.getFromUser().getUserNickname())));
        return result;
    }
}
