package com.example.demo.user.repository;

import com.example.demo.user.entity.Stat;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StatRepository extends JpaRepository<Stat, String> {
}
