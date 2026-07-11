package com.example.demo.topic.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// 발언주제 (seed_topic.json으로 시딩, 자동발번 없음)
@Entity
@Table(name = "topic")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@lombok.AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Topic {

    @Id
    @Column(name = "topic_id")
    private Integer topicId;

    @Column(name = "topic_head", columnDefinition = "TEXT")
    private String topicHead;
}
