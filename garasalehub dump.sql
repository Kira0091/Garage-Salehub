-- GarageSaleHub data dump (INSERT statements only)
-- Tables must already exist in MySQL before import

SET FOREIGN_KEY_CHECKS=0;

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `avatar`, `address`, `phone`, `created_at`) VALUES (1, 'Admin', 'admin@garagesalehub.com', 'scrypt:32768:8:1$mHpNNmvJYvCMkgus$8655bc4ba7ee4b3a12dc6cb4810cd3e9e451b9f6b589563de6f78a6984531f5959e402fecb6174d9c4b1e5c8d684c06872e33f9777e1bc6a79da0a6c71838781', 'admin', '', '', '', '2026-03-08 05:29:14.111573');
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `avatar`, `address`, `phone`, `created_at`) VALUES (2, 'Juan Dela Cruz', 'user@garagesalehub.com', 'scrypt:32768:8:1$HaGqFUhZH3Vj4yeY$434fea59aeaaed3db2f0262d36cd9cea2a1db1abe98f7e3680dd55803765ed7d6ad747fdb55de01fab982a057db9e451960ae7430213eeffb3d8651f78498170', 'user', '', '123 Rizal St, Quezon City', '09171234567', '2026-03-08 05:29:14.213152');

INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (1, 'Furniture', '🛋️');
INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (2, 'Electronics', '📱');
INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (3, 'Clothing', '👕');
INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (4, 'Books', '📚');
INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (5, 'Kitchen', '🍳');
INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (6, 'Toys & Games', '🎮');
INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (7, 'Sports', '⚽');
INSERT INTO `categories` (`id`, `name`, `icon`) VALUES (8, 'Tools', '🔧');

INSERT INTO `products` (`id`, `title`, `description`, `condition`, `price`, `negotiated_price`, `quantity`, `stock`, `images`, `status`, `rejection_reason`, `category_id`, `seller_id`, `created_at`, `updated_at`) VALUES (1, '123123', 'asfafd', 'Good', 1234.0, 1234.0, 1, 0, '0d9b199d77864ac9b109e07f038afb71_646085416_122093750457125889_323916601095131083_n.jpg', 'sold', '', 7, 2, '2026-03-08 05:35:50.685491', '2026-03-08 05:42:38.352935');
INSERT INTO `products` (`id`, `title`, `description`, `condition`, `price`, `negotiated_price`, `quantity`, `stock`, `images`, `status`, `rejection_reason`, `category_id`, `seller_id`, `created_at`, `updated_at`) VALUES (2, 'tv', 'dafasf', 'Good', 123123.0, 123.0, 1, 1, '37141c9384164471bf080787b8c4e78e_628390256_775248105101881_4311850404359574616_n.jpg', 'approved', '', 2, 2, '2026-03-08 05:50:46.884585', '2026-03-08 05:51:20.718070');

INSERT INTO `orders` (`id`, `buyer_id`, `total_amount`, `status`, `payment_method`, `payment_status`, `delivery_address`, `tracking_number`, `notes`, `created_at`, `updated_at`) VALUES (1, 2, 1234.0, 'delivered', 'gcash', 'paid', '123 Rizal St, Quezon City', 'GSH-5T153TV2BD', '', '2026-03-08 05:42:38.349509', '2026-03-08 05:43:31.290056');

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `quantity`, `unit_price`) VALUES (1, 1, 1, 1, 1234.0);

INSERT INTO `messages` (`id`, `sender_id`, `receiver_id`, `product_id`, `content`, `is_read`, `created_at`, `message_type`, `proposed_price`, `attachments`) VALUES (1, 2, 2, 2, 'sybau', 1, '2026-03-08 05:52:13.340460', 'chat', NULL, '');
INSERT INTO `messages` (`id`, `sender_id`, `receiver_id`, `product_id`, `content`, `is_read`, `created_at`, `message_type`, `proposed_price`, `attachments`) VALUES (2, 2, 1, NULL, 'hi', 1, '2026-03-13 13:50:43.719223', 'chat', NULL, '');

SET FOREIGN_KEY_CHECKS=1;
