package com.example.demo.room.repository;

import com.example.demo.room.entity.RoomInfo;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<RoomInfo, Integer> {

    // 로비 목록: 게임 중인 방도 포함(전체), 최신순 — "연회중" 표시로 구분
    List<RoomInfo> findAllByOrderByRoomIdDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RoomInfo r where r.roomId = :roomId")
    Optional<RoomInfo> findByRoomIdForUpdate(@Param("roomId") Integer roomId);
}
