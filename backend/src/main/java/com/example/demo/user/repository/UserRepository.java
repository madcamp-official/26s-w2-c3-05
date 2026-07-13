package com.example.demo.user.repository;

import com.example.demo.user.entity.UserInfo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserInfo, String> {
    // existsById(userId) 는 JpaRepository가 기본 제공
}