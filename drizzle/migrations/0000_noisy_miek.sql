CREATE TABLE `academische_kalender` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`programma` text NOT NULL,
	`start_datum` text NOT NULL,
	`eind_datum` text NOT NULL,
	`omschrijving` text,
	`aangemaakt_op` text DEFAULT (datetime('now')) NOT NULL,
	`bijgewerkt_op` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `beschikbaarheid` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`surveillant_id` integer NOT NULL,
	`slot_id` integer NOT NULL,
	`beschikbaar` integer DEFAULT true NOT NULL,
	`aangemaakt_op` text DEFAULT (datetime('now')) NOT NULL,
	`bijgewerkt_op` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`surveillant_id`) REFERENCES `surveillanten`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`slot_id`) REFERENCES `slots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `examens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`naam` text NOT NULL,
	`programma` text NOT NULL,
	`afdeling` text,
	`examtype` text DEFAULT 'C' NOT NULL,
	`is_fau` integer DEFAULT false NOT NULL,
	`voorkeur_datum` text,
	`voorkeur_week` integer,
	`voorkeur_tijdblok` text,
	`duur_minuten` integer DEFAULT 210 NOT NULL,
	`geschat_aantal` integer DEFAULT 0 NOT NULL,
	`locatie_voorkeur` text,
	`format` text,
	`bijlage_vereist` integer DEFAULT false NOT NULL,
	`nieuwe_studenten` integer DEFAULT false NOT NULL,
	`contactpersoon` text,
	`budgetnummer` text,
	`opmerkingen` text,
	`status` text DEFAULT 'concept' NOT NULL,
	`ingediend_door` text,
	`aangemaakt_op` text DEFAULT (datetime('now')) NOT NULL,
	`bijgewerkt_op` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gebruikers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`naam` text NOT NULL,
	`email` text NOT NULL,
	`pincode_hash` text NOT NULL,
	`rol` text NOT NULL,
	`surveillant_id` integer,
	`actief` integer DEFAULT true NOT NULL,
	`aangemaakt_op` text DEFAULT (datetime('now')) NOT NULL,
	`bijgewerkt_op` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`surveillant_id`) REFERENCES `surveillanten`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gebruikers_email_unique` ON `gebruikers` (`email`);--> statement-breakpoint
CREATE TABLE `locaties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`naam` text NOT NULL,
	`campus` text NOT NULL,
	`capaciteit` integer NOT NULL,
	`is_primair` integer DEFAULT false NOT NULL,
	`voorkeur_volgorde` integer DEFAULT 0 NOT NULL,
	`aangemaakt_op` text DEFAULT (datetime('now')) NOT NULL,
	`bijgewerkt_op` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`datum` text NOT NULL,
	`tijdblok` text NOT NULL,
	`start_tijd` text NOT NULL,
	`eind_tijd` text NOT NULL,
	`locatie_id` integer NOT NULL,
	`geblokkeerd` integer DEFAULT false NOT NULL,
	`blok_reden` text,
	`aangemaakt_op` text DEFAULT (datetime('now')) NOT NULL,
	`bijgewerkt_op` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`locatie_id`) REFERENCES `locaties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `surv_toewijzingen` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`surveillant_id` integer NOT NULL,
	`slot_id` integer NOT NULL,
	`rol` text NOT NULL,
	`aangemaakt_op` text DEFAULT (datetime('now')) NOT NULL,
	`bijgewerkt_op` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`surveillant_id`) REFERENCES `surveillanten`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`slot_id`) REFERENCES `slots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `surveillanten` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`naam` text NOT NULL,
	`email` text NOT NULL,
	`kan_hs` integer DEFAULT false NOT NULL,
	`kan_surv` integer DEFAULT true NOT NULL,
	`actief` integer DEFAULT true NOT NULL,
	`aangemaakt_op` text DEFAULT (datetime('now')) NOT NULL,
	`bijgewerkt_op` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `surveillanten_email_unique` ON `surveillanten` (`email`);--> statement-breakpoint
CREATE TABLE `toewijzingen` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`examen_id` integer NOT NULL,
	`slot_id` integer NOT NULL,
	`halve_zaal` integer DEFAULT false NOT NULL,
	`aangemeld_door` text NOT NULL,
	`override_reden` text,
	`aangemaakt_op` text DEFAULT (datetime('now')) NOT NULL,
	`bijgewerkt_op` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`examen_id`) REFERENCES `examens`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`slot_id`) REFERENCES `slots`(`id`) ON UPDATE no action ON DELETE no action
);
