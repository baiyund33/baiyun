CREATE TABLE `user` (
                        `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户编号',
                        `name` VARCHAR(64) NOT NULL COMMENT '用户名',
                        `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
                        `password_hash` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '密码哈希',
                        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (`id`),
                        UNIQUE KEY `uk_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';