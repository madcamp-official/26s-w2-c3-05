package com.example.demo.user.controller;

import com.example.demo.user.dto.RankingDto;
import com.example.demo.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// 천하(랭킹): 어점 순 상위 100위까지
@RestController
@RequestMapping("/rankings")
@RequiredArgsConstructor
public class RankingController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<RankingDto>> rankings(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(userService.getRankings(page, size));
    }
}
