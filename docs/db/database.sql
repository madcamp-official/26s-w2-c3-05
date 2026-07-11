CREATE TABLE `user_info` (
	`user_id`	VARCHAR(16)	NOT NULL,
	`user_pw`	VARCHAR(255)	NULL,
	`registered_at`	TIMESTAMPTZ	NOT NULL	DEFAULT now(),
	`user_nickname`	VARCHAR(12)	NULL,
	`user_profile`	BYTEA	NULL
);

CREATE TABLE `stat` (
	`user_id`	VARCHAR(16)	NOT NULL,
	`user_rank`	ranktype_t	NOT NULL	DEFAULT 'NONE',
	`user_point`	INT	NOT NULL	DEFAULT 0,
	`user_win`	INT	NOT NULL	DEFAULT 0,
	`user_lose`	INT	NOT NULL	DEFAULT 0,
	`user_played`	INT	NOT NULL	DEFAULT 0
);

CREATE TABLE `topic` (
	`topic_id`	INT	NOT NULL,
	`topic_head`	TEXT	NULL
);

CREATE TABLE `room_info` (
	`room_id`	INT	NOT NULL,
	`creator_id`	VARCHAR(16)	NOT NULL,
	`player_limit`	INT	NULL,
	`round_limit`	INT	NULL,
	`time_limit`	INT	NULL,
	`room_pw`	VARCHAR(255)	NULL,
	`can_access`	BOOLEAN	NOT NULL	DEFAULT true
);

CREATE TABLE `user_friends` (
	`from_id`	VARCHAR(16)	NOT NULL,
	`to_id`	VARCHAR(16)	NOT NULL,
	`friend_date`	TIMESTAMPTZ	NULL	DEFAULT now(),
	`friend_status`	friendtype_t	NOT NULL	DEFAULT 'NONE'
);

CREATE TABLE `player_info` (
	`user_id`	VARCHAR(16)	NOT NULL,
	`room_id`	INT	NOT NULL,
	`player_role`	roletype_t	NULL	DEFAULT 'NONE',
	`player_result`	wintype_t	NULL	DEFAULT 'NONE',
	`player_rank`	INT	NULL
);

CREATE TABLE `notification` (
	`notice_num`	BIGINT	NOT NULL,
	`recipient_id`	VARCHAR(16)	NOT NULL,
	`actor_id`	VARCHAR(16)	NULL,
	`type`	notificationtype_t	NOT NULL,
	`is_read`	BOOLEAN	NOT NULL	DEFAULT false,
	`created_at`	TIMESTAMPTZ	NOT NULL	DEFAULT now()
);

ALTER TABLE `user_info` ADD CONSTRAINT `PK_USER_INFO` PRIMARY KEY (
	`user_id`
);

ALTER TABLE `stat` ADD CONSTRAINT `PK_STAT` PRIMARY KEY (
	`user_id`
);

ALTER TABLE `topic` ADD CONSTRAINT `PK_TOPIC` PRIMARY KEY (
	`topic_id`
);

ALTER TABLE `room_info` ADD CONSTRAINT `PK_ROOM_INFO` PRIMARY KEY (
	`room_id`
);

ALTER TABLE `user_friends` ADD CONSTRAINT `PK_USER_FRIENDS` PRIMARY KEY (
	`from_id`,
	`to_id`
);

ALTER TABLE `player_info` ADD CONSTRAINT `PK_PLAYER_INFO` PRIMARY KEY (
	`user_id`,
	`room_id`
);

ALTER TABLE `notification` ADD CONSTRAINT `PK_NOTIFICATION` PRIMARY KEY (
	`notice_num`
);

ALTER TABLE `stat` ADD CONSTRAINT `FK_user_info_TO_stat_1` FOREIGN KEY (
	`user_id`
)
REFERENCES `user_info` (
	`user_id`
);

ALTER TABLE `user_friends` ADD CONSTRAINT `FK_user_info_TO_user_friends_1` FOREIGN KEY (
	`from_id`
)
REFERENCES `user_info` (
	`user_id`
);

ALTER TABLE `user_friends` ADD CONSTRAINT `FK_user_info_TO_user_friends_2` FOREIGN KEY (
	`to_id`
)
REFERENCES `user_info` (
	`user_id`
);

ALTER TABLE `player_info` ADD CONSTRAINT `FK_user_info_TO_player_info_1` FOREIGN KEY (
	`user_id`
)
REFERENCES `user_info` (
	`user_id`
);

ALTER TABLE `player_info` ADD CONSTRAINT `FK_room_info_TO_player_info_1` FOREIGN KEY (
	`room_id`
)
REFERENCES `room_info` (
	`room_id`
);

