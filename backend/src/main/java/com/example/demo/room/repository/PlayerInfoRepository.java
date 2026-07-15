package com.example.demo.room.repository;

import com.example.demo.room.entity.PlayerInfo;
import com.example.demo.room.entity.PlayerInfoId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlayerInfoRepository extends JpaRepository<PlayerInfo, PlayerInfoId> {

    // 방의 현재 인원 수
    long countById_RoomId(Integer roomId);

    // 방의 참가자 목록
    List<PlayerInfo> findAllById_RoomId(Integer roomId);

    List<PlayerInfo> findAllById_RoomIdOrderById_UserIdAsc(Integer roomId);

    // 내가 이미 들어가 있는 방이 있는지 (동시에 한 방만 허용)
    boolean existsById_UserId(String userId);

    // 내가 참여 중인 모든 방 기록 (잔류 상태 정리용)
    List<PlayerInfo> findAllById_UserId(String userId);

    // 방 폐쇄 시 참가자 일괄 정리
    void deleteAllById_RoomId(Integer roomId);
}
