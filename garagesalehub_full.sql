-- ============================================
-- GarageSaleHub Full Setup (Tables + Data)
-- Run this once in MySQL Workbench
-- ============================================

DROP DATABASE IF EXISTS garage_salehub;
CREATE DATABASE garage_salehub;
USE garage_salehub;

SET FOREIGN_KEY_CHECKS=0;

-- ----------------
-- CREATE TABLES
-- ----------------

CREATE TABLE `users` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(200) NOT NULL,
    `role` VARCHAR(20) DEFAULT 'user',
    `avatar` VARCHAR(200) DEFAULT '',
    `address` VARCHAR(300) DEFAULT '',
    `phone` VARCHAR(30) DEFAULT '',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
);

CREATE TABLE `categories` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `icon` VARCHAR(50) DEFAULT '📦',
    PRIMARY KEY (`id`)
);

CREATE TABLE `products` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `condition` VARCHAR(50) DEFAULT 'Good',
    `price` FLOAT NOT NULL,
    `negotiated_price` FLOAT,
    `quantity` INT DEFAULT 1,
    `stock` INT DEFAULT 1,
    `images` TEXT,
    `status` VARCHAR(30) DEFAULT 'pending',
    `rejection_reason` VARCHAR(300) DEFAULT '',
    `category_id` INT,
    `seller_id` INT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`),
    FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`)
);

CREATE TABLE `orders` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `buyer_id` INT NOT NULL,
    `total_amount` FLOAT NOT NULL,
    `status` VARCHAR(30) DEFAULT 'pending',
    `payment_method` VARCHAR(50) DEFAULT 'cod',
    `payment_status` VARCHAR(30) DEFAULT 'pending',
    `delivery_address` VARCHAR(300) DEFAULT '',
    `tracking_number` VARCHAR(100) DEFAULT '',
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`)
);

CREATE TABLE `order_items` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `order_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `quantity` INT DEFAULT 1,
    `unit_price` FLOAT NOT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`),
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
);

CREATE TABLE `messages` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `sender_id` INT NOT NULL,
    `receiver_id` INT NOT NULL,
    `product_id` INT,
    `content` TEXT NOT NULL,
    `message_type` VARCHAR(30) DEFAULT 'chat',
    `proposed_price` FLOAT,
    `attachments` VARCHAR(1000) DEFAULT '',
    `is_read` BOOLEAN DEFAULT FALSE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
);

-- ----------------
-- INSERT DATA
-- ----------------

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `avatar`, `address`, `phone`, `created_at`) VALUES (1, 'Admin', 'admin@garagesalehub.com', 'scrypt:32768:8:1$mHpNNmvJYvCMkgus$8655bc4ba7ee4b3a12dc6cb4810cd3e9e451b9f6b589563de6f78a6984531f5959e402fecb6174d9c4b1e5c8d684c06872e33f9777e1bc6a79da0a6c71838781', 'admin', '', '', '', '2026-03-08 05:29:14');
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `avatar`, `address`, `phone`, `created_at`) VALUES (2, 'Juan Dela Cruz', 'user@garagesalehub.com', 'scrypt:32768:8:1$HaGqFUhZH3Vj4yeY$434fea59aeaaed3db2f0262d36cd9cea2a1db1abe98f7e3680dd55803765ed7d6ad747fdb55de01fab982a057db9e451960ae7430213eeffb3d8651f78498170', 'user', '', '123 Rizal St, Quezon City', '09171234567', '2026-03-08 05:29:14');

INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (1, 'Furniture', '🛋️');
INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (2, 'Electronics', '📱');
INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (3, 'Clothing', '👕');
INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (4, 'Books', '📚');
INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (5, 'Kitchen', '🍳');
INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (6, 'Toys & Games', '🎮');
INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (7, 'Sports', '⚽');
INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (8, 'Tools', '🔧');

INSERT INTO `products` (`id`, `title`, `description`, `condition`, `price`, `negotiated_price`, `quantity`, `stock`, `images`, `status`, `rejection_reason`, `category_id`, `seller_id`, `created_at`, `updated_at`) VALUES (1, '123123', 'asfafd', 'Good', 1234.0, 1234.0, 1, 0, '0d9b199d77864ac9b109e07f038afb71_646085416_122093750457125889_323916601095131083_n.jpg', 'sold', '', 7, 2, '2026-03-08 05:35:50', '2026-03-08 05:42:38');
INSERT INTO `products` (`id`, `title`, `description`, `condition`, `price`, `negotiated_price`, `quantity`, `stock`, `images`, `status`, `rejection_reason`, `category_id`, `seller_id`, `created_at`, `updated_at`) VALUES (2, 'tv', 'dafasf', 'Good', 123123.0, 123.0, 1, 1, '37141c9384164471bf080787b8c4e78e_628390256_775248105101881_4311850404359574616_n.jpg', 'approved', '', 2, 2, '2026-03-08 05:50:46', '2026-03-08 05:51:20');

INSERT INTO `orders` (`id`, `buyer_id`, `total_amount`, `status`, `payment_method`, `payment_status`, `delivery_address`, `tracking_number`, `notes`, `created_at`, `updated_at`) VALUES (1, 2, 1234.0, 'delivered', 'gcash', 'paid', '123 Rizal St, Quezon City', 'GSH-5T153TV2BD', '', '2026-03-08 05:42:38', '2026-03-08 05:43:31');

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `quantity`, `unit_price`) VALUES (1, 1, 1, 1, 1234.0);

INSERT INTO `messages` (`id`, `sender_id`, `receiver_id`, `product_id`, `content`, `is_read`, `created_at`, `message_type`, `proposed_price`, `attachments`) VALUES (1, 2, 2, 2, 'sybau', 1, '2026-03-08 05:52:13', 'chat', NULL, '');
INSERT INTO `messages` (`id`, `sender_id`, `receiver_id`, `product_id`, `content`, `is_read`, `created_at`, `message_type`, `proposed_price`, `attachments`) VALUES (2, 2, 1, NULL, 'hi', 1, '2026-03-13 13:50:43', 'chat', NULL, '');

SET FOREIGN_KEY_CHECKS=1;
