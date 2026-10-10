CREATE TABLE IF NOT EXISTS `friend_request` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '申请ID',
    `from_user_id` BIGINT NOT NULL COMMENT '申请人ID',
    `to_user_id` BIGINT NOT NULL COMMENT '接收人ID',
    `message` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '申请附言',
    `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0待处理 1已接受 2已拒绝',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_from_to` (`from_user_id`, `to_user_id`),
    KEY `idx_to_status` (`to_user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;