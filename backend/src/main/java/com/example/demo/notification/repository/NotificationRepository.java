package com.example.demo.notification.repository;

import com.example.demo.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // 내 알림함: 최신순 정렬
    List<Notification> findAllByRecipient_UserIdOrderByCreatedAtDesc(String recipientId);

    // 내 안읽은 알림들 (모두 읽음 처리용)
    List<Notification> findAllByRecipient_UserIdAndIsReadFalse(String recipientId);

    // 안읽은 알림 개수 (뱃지 표시용)
    long countByRecipient_UserIdAndIsReadFalse(String recipientId);
}
