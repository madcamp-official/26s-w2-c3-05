package com.example.demo.notification.service;

import com.example.demo.notification.dto.NotificationDto;
import com.example.demo.notification.entity.Notification;
import com.example.demo.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    // 내 알림함 (최신순)
    @Transactional(readOnly = true)
    public List<NotificationDto> getMyNotifications(String myId) {
        return notificationRepository.findAllByRecipient_UserIdOrderByCreatedAtDesc(myId)
            .stream()
            .map(NotificationDto::from)
            .toList();
    }

    // 안읽은 개수 (프론트 뱃지용)
    @Transactional(readOnly = true)
    public long getUnreadCount(String myId) {
        return notificationRepository.countByRecipient_UserIdAndIsReadFalse(myId);
    }

    // 알림 하나 읽음 처리
    @Transactional
    public void markRead(String myId, Long noticeNum) {
        Notification notification = notificationRepository.findById(noticeNum)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "알림이 없습니다."));

        // 남의 알림 읽음 처리 방지 (존재 여부 노출 안 하려고 404로 통일)
        if (!notification.getRecipient().getUserId().equals(myId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "알림이 없습니다.");
        }
        notification.setRead(true); // 더티체킹으로 UPDATE
    }

    // 모두 읽음 처리
    @Transactional
    public void markAllRead(String myId) {
        notificationRepository.findAllByRecipient_UserIdAndIsReadFalse(myId)
            .forEach(n -> n.setRead(true));
    }
}
