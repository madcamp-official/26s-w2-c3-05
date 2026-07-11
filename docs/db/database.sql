-- ENUM 타입 (테이블보다 먼저)
CREATE TYPE ranktype_t         AS ENUM ('NONE','BRONZE','SILVER','GOLD','PLATINUM','DIAMOND');
CREATE TYPE friendtype_t       AS ENUM ('NONE','REQUESTED','FRIENDS');
CREATE TYPE roletype_t         AS ENUM ('PRINCESS','SERVANT','NONE');
CREATE TYPE wintype_t          AS ENUM ('WIN','OTHER','LOSE','NONE');
CREATE TYPE notificationtype_t AS ENUM ('FRIEND_REQUEST','FRIEND_ACCEPT','SYSTEM');

CREATE TABLE user_info (
                           user_id        VARCHAR(16)  NOT NULL,
                           user_pw        VARCHAR(255),
                           registered_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
                           user_nickname  VARCHAR(12),
                           user_profile   BYTEA,
                           CONSTRAINT pk_user_info PRIMARY KEY (user_id)
);

CREATE TABLE stat (
                      user_id      VARCHAR(16) NOT NULL,
                      user_rank    ranktype_t  NOT NULL DEFAULT 'NONE',
                      user_point   INT         NOT NULL DEFAULT 0,
                      user_win     INT         NOT NULL DEFAULT 0,
                      user_lose    INT         NOT NULL DEFAULT 0,
                      user_played  INT         NOT NULL DEFAULT 0,
                      CONSTRAINT pk_stat PRIMARY KEY (user_id),
                      CONSTRAINT fk_stat_user FOREIGN KEY (user_id) REFERENCES user_info(user_id) ON DELETE CASCADE
);

CREATE TABLE topic (
                       topic_id    INT NOT NULL,
                       topic_head  TEXT,
                       CONSTRAINT pk_topic PRIMARY KEY (topic_id)
);

CREATE TABLE room_info (
                           room_id       INT         NOT NULL GENERATED ALWAYS AS IDENTITY,
                           creator_id    VARCHAR(16) NOT NULL,
                           player_limit  INT,
                           round_limit   INT,
                           time_limit    INT,
                           room_pw       VARCHAR(255),
                           can_access    BOOLEAN     NOT NULL DEFAULT true,
                           CONSTRAINT pk_room_info PRIMARY KEY (room_id),
                           CONSTRAINT fk_room_creator FOREIGN KEY (creator_id) REFERENCES user_info(user_id)
);

CREATE TABLE user_friends (
                              from_id        VARCHAR(16)  NOT NULL,
                              to_id          VARCHAR(16)  NOT NULL,
                              friend_date    TIMESTAMPTZ  DEFAULT now(),
                              friend_status  friendtype_t NOT NULL DEFAULT 'NONE',
                              CONSTRAINT pk_user_friends PRIMARY KEY (from_id, to_id),
                              CONSTRAINT fk_friends_from FOREIGN KEY (from_id) REFERENCES user_info(user_id) ON DELETE CASCADE,
                              CONSTRAINT fk_friends_to   FOREIGN KEY (to_id)   REFERENCES user_info(user_id) ON DELETE CASCADE
);

CREATE TABLE player_info (
                             user_id        VARCHAR(16) NOT NULL,
                             room_id        INT         NOT NULL,
                             player_role    roletype_t  DEFAULT 'NONE',
                             player_result  wintype_t   DEFAULT 'NONE',
                             player_rank    INT,
                             CONSTRAINT pk_player_info PRIMARY KEY (user_id, room_id),
                             CONSTRAINT fk_player_user FOREIGN KEY (user_id) REFERENCES user_info(user_id) ON DELETE CASCADE,
                             CONSTRAINT fk_player_room FOREIGN KEY (room_id) REFERENCES room_info(room_id) ON DELETE CASCADE
);

CREATE TABLE notification (
                              notice_num    BIGINT             NOT NULL GENERATED ALWAYS AS IDENTITY,
                              recipient_id  VARCHAR(16)        NOT NULL,
                              actor_id      VARCHAR(16),
                              type          notificationtype_t NOT NULL,
                              is_read       BOOLEAN            NOT NULL DEFAULT false,
                              created_at    TIMESTAMPTZ        NOT NULL DEFAULT now(),
                              CONSTRAINT pk_notification PRIMARY KEY (notice_num),
                              CONSTRAINT fk_noti_recipient FOREIGN KEY (recipient_id) REFERENCES user_info(user_id) ON DELETE CASCADE,
                              CONSTRAINT fk_noti_actor     FOREIGN KEY (actor_id)     REFERENCES user_info(user_id) ON DELETE SET NULL
);

-- 발언주제 시드 (seed_topic.json)
INSERT INTO topic (topic_id, topic_head) VALUES
                                             (0,'자유주제'),(1,'몰입캠프'),(2,'마지막 식사'),(3,'의식의 흐름 3행시'),
                                             (4,'순우리말만 쓰기'),(5,'아무말 대잔치'),(6,'만화 최강 캐릭터'),(7,'지인이 겪은 이야기'),
                                             (8,'나만의 작은 취미'),(9,'공주님 외모칭찬'),(10,'참신한 나쁜 말'),(11,'인생 소원'),
                                             (12,'부먹 vs 찍먹'),(13,'순간이동 vs 비행'),(14,'죽는 방법 정하기 vs 죽는 날 정하기'),
                                             (15,'평생 안 눕기 vs 평생 안 서기'),(16,'옷에 들어갔던 것'),(17,'지각 대책'),(18,'지하철'),
                                             (19,'국내 힙합'),(20,'북쪽'),(21,'우리나라'),(22,'대학교'),(23,'군대'),(24,'모기'),
                                             (25,'자기소개'),(26,'팔 1개 vs 다리 1개'),(27,'사과문'),(28,'AI'),(29,'잊고 싶은 순간')
    ON CONFLICT (topic_id) DO NOTHING;