package com.example.demo.notification.controller;

import com.example.demo.notification.dto.NotificationDto;
import com.example.demo.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // 내 알림함 (최신순)
    @GetMapping
    public ResponseEntity<List<NotificationDto>> myNotifications(Authentication auth) {
        return ResponseEntity.ok(notificationService.getMyNotifications(auth.getName()));
    }

    // 안읽은 알림 개수
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(Authentication auth) {
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(auth.getName())));
    }

    // 알림 하나 읽음 처리
    @PatchMapping("/{noticeNum}/read")
    public ResponseEntity<Void> markRead(Authentication auth, @PathVariable Long noticeNum) {
        notificationService.markRead(auth.getName(), noticeNum);
        return ResponseEntity.ok().build();
    }

    // 모두 읽음 처리
    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead(Authentication auth) {
        notificationService.markAllRead(auth.getName());
        return ResponseEntity.ok().build();
    }
}
