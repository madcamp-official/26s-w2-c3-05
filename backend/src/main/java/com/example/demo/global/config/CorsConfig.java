package com.example.demo.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // set은 교체(replace)라 한 번에 모두 넣어야 함 (두 번 부르면 마지막 것만 남음)
        config.setAllowedOrigins(List.of(
            "http://localhost:5173",           // Vite 개발 서버
            "http://54.116.206.41",            // 배포 서버 (IP 직접 접근)
            "https://cheonha.duckdns.org"      // 배포 도메인(HTTPS) — nginx 뒤 Spring은
                                               // 내부 http로 받아 same-origin 판정이 깨지므로 명시 필요
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}