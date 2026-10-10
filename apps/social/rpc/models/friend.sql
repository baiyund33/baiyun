CREATE TABLE IF NOT EXISTS `friend` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `friend_user_id` BIGINT NOT NULL COMMENT '好友ID',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_friend` (`user_id`, `friend_user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;