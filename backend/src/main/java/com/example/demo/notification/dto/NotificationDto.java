package com.example.demo.notification.dto;

import com.example.demo.notification.entity.Notification;
import com.example.demo.notification.entity.NotificationType;

import java.time.Instant;

// 알림 목록 응답 한 줄
public record NotificationDto(
    Long noticeNum,
    String actorId,          // 알림 유발자 (시스템 알림이면 null)
    String actorNickname,
    NotificationType type,
    boolean isRead,
    Instant createdAt
) {
    // 엔티티 → DTO 변환 (actor가 null인 시스템 알림 방어)
    public static NotificationDto from(Notification n) {
        return new NotificationDto(
            n.getNoticeNum(),
            n.getActor() != null ? n.getActor().getUserId() : null,
            n.getActor() != null ? n.getActor().getUserNickname() : null,
            n.getType(),
            n.isRead(),
            n.getCreatedAt()
        );
    }
}
