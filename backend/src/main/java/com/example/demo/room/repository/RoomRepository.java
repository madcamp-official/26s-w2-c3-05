package com.example.demo.room.repository;

import com.example.demo.room.entity.RoomInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomRepository extends JpaRepository<RoomInfo, Integer> {

    // 로비 목록: 입장 가능한 방만
    List<RoomInfo> findAllByCanAccessTrueOrderByRoomIdDesc();
}
