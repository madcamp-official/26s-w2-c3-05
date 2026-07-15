package com.example.demo.user.repository;

import com.example.demo.user.entity.Stat;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StatRepository extends JpaRepository<Stat, String> {

    // 천하(랭킹): 어점 내림차순, 동점이면 아이디순 — Pageable로 페이지 조회
    List<Stat> findAllByOrderByUserPointDescUserIdAsc(Pageable pageable);
}
