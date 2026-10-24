ALTER TABLE `members` ADD `email` text;--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_unique` ON `members` (`email`);