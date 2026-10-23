CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `accounts_user_id_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `distilleries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`country` text NOT NULL,
	`region` text NOT NULL,
	`coordinates` text,
	`description` text,
	`website` text,
	`founded` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `distilleries_name_unique` ON `distilleries` (`name`);--> statement-breakpoint
CREATE TABLE `gatherings` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`date` integer NOT NULL,
	`host_id` text NOT NULL,
	`theme` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gatherings_number_unique` ON `gatherings` (`number`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`user_id` text,
	`times_hosted` integer DEFAULT 0 NOT NULL,
	`last_hosted` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `tasting_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`tasting_id` text NOT NULL,
	`note` text NOT NULL,
	`intensity` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tasting_id`) REFERENCES `tastings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tastings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`whisky_id` text NOT NULL,
	`rating` integer NOT NULL,
	`notes` text,
	`tasting_date` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`whisky_id`) REFERENCES `whiskies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`name` text,
	`image` text,
	`role` text NOT NULL,
	`admin` integer DEFAULT false NOT NULL,
	`member` integer DEFAULT false NOT NULL,
	`last_login` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);--> statement-breakpoint
CREATE TABLE `whiskies` (
	`id` text PRIMARY KEY NOT NULL,
	`gathering_id` text NOT NULL,
	`provider` text NOT NULL,
	`distillery_id` text NOT NULL,
	`variety` text NOT NULL,
	`abv` text NOT NULL,
	`notes` text,
	`ranking` integer,
	`name` text,
	`type` text,
	`age` integer,
	`price_range` text,
	`description` text,
	`tasting_notes` text,
	`flavour_profile` text,
	`image_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`gathering_id`) REFERENCES `gatherings`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`distillery_id`) REFERENCES `distilleries`(`id`) ON UPDATE no action ON DELETE restrict
);
