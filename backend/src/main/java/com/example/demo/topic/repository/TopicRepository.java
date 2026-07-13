package com.example.demo.topic.repository;

import com.example.demo.topic.entity.Topic;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TopicRepository extends JpaRepository<Topic, Integer> {
    // 주제 30개를 읽어와 랜덤으로 뽑기 위함.
}
