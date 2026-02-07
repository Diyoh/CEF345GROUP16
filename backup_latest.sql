-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: buildright_db1
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */
;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */
;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */
;
/*!50503 SET NAMES utf8mb4 */
;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */
;
/*!40103 SET TIME_ZONE='+00:00' */
;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */
;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */
;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */
;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */
;

--
-- Table structure for table `access_codes`
--

DROP TABLE IF EXISTS `access_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!50503 SET character_set_client = utf8mb4 */
;
CREATE TABLE `access_codes` (
    `code` varchar(50) NOT NULL,
    `role` enum(
        'ADMIN',
        'CONTRACTOR',
        'DEVELOPER_ADMIN',
        'PUBLIC'
    ) NOT NULL,
    `is_used` tinyint(1) DEFAULT 0,
    `generated_by_user_id` char(36) DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`code`),
    KEY `generated_by_user_id` (`generated_by_user_id`),
    CONSTRAINT `access_codes_ibfk_1` FOREIGN KEY (`generated_by_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;

--
-- Dumping data for table `access_codes`
--

LOCK TABLES `access_codes` WRITE;
/*!40000 ALTER TABLE `access_codes` DISABLE KEYS */
;
INSERT INTO
    `access_codes`
VALUES (
        'ADMIN-LB5VCZ',
        'ADMIN',
        0,
        'dev2',
        '2026-01-21 18:10:20'
    ),
    (
        'ADMIN123',
        'ADMIN',
        0,
        'u1',
        '2026-01-21 18:03:28'
    ),
    (
        'CONTR-CTTKS7',
        'CONTRACTOR',
        1,
        'dev1',
        '2026-01-21 18:06:05'
    ),
    (
        'CONTR123',
        'CONTRACTOR',
        0,
        'u1',
        '2026-01-21 18:03:28'
    ),
    (
        'DEV123',
        'DEVELOPER_ADMIN',
        0,
        'u1',
        '2026-01-21 18:03:28'
    ),
    (
        'DEVEL-476XRL',
        'DEVELOPER_ADMIN',
        0,
        'dev2',
        '2026-01-21 18:10:24'
    );
/*!40000 ALTER TABLE `access_codes` ENABLE KEYS */
;
UNLOCK TABLES;

--
-- Table structure for table `comment_images`
--

DROP TABLE IF EXISTS `comment_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!50503 SET character_set_client = utf8mb4 */
;
CREATE TABLE `comment_images` (
    `id` char(36) NOT NULL DEFAULT(uuid()),
    `comment_id` char(36) NOT NULL,
    `image_url` text NOT NULL,
    PRIMARY KEY (`id`),
    KEY `comment_id` (`comment_id`),
    CONSTRAINT `comment_images_ibfk_1` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;

--
-- Dumping data for table `comment_images`
--

LOCK TABLES `comment_images` WRITE;
/*!40000 ALTER TABLE `comment_images` DISABLE KEYS */
;
/*!40000 ALTER TABLE `comment_images` ENABLE KEYS */
;
UNLOCK TABLES;

--
-- Table structure for table `comments`
--

DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!50503 SET character_set_client = utf8mb4 */
;
CREATE TABLE `comments` (
    `id` char(36) NOT NULL DEFAULT(uuid()),
    `project_id` char(36) NOT NULL,
    `author_name` varchar(255) NOT NULL,
    `author_type` enum('Citizen', 'NGO') DEFAULT 'Citizen',
    `text` text NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `project_id` (`project_id`),
    CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;

--
-- Dumping data for table `comments`
--

LOCK TABLES `comments` WRITE;
/*!40000 ALTER TABLE `comments` DISABLE KEYS */
;
INSERT INTO
    `comments`
VALUES (
        '11a95b36-f761-11f0-8c0d-f875a4049563',
        '8b9f40ed-f6fe-11f0-900e-f875a4049563',
        'sg',
        'Citizen',
        'Kudos to you.\nYou did well massa \n',
        '2026-01-22 07:07:52'
    ),
    (
        'c1',
        'p1',
        'Jean K.',
        'Citizen',
        'Work seems to be moving fast near the river.',
        '2026-01-21 18:03:28'
    ),
    (
        'c2',
        'p1',
        'EcoWatch Cameroon',
        'NGO',
        'We are concerned about the drainage system planning.',
        '2026-01-21 18:03:28'
    ),
    (
        'e8dc99b1-f760-11f0-8c0d-f875a4049563',
        '8b9f40ed-f6fe-11f0-900e-f875a4049563',
        'sg',
        'Citizen',
        'this is a great job kudos',
        '2026-01-22 07:06:44'
    );
/*!40000 ALTER TABLE `comments` ENABLE KEYS */
;
UNLOCK TABLES;

--
-- Table structure for table `project_images`
--

DROP TABLE IF EXISTS `project_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!50503 SET character_set_client = utf8mb4 */
;
CREATE TABLE `project_images` (
    `id` char(36) NOT NULL DEFAULT(uuid()),
    `project_id` char(36) NOT NULL,
    `image_url` text NOT NULL,
    `is_main_cover` tinyint(1) DEFAULT 0,
    `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `project_id` (`project_id`),
    CONSTRAINT `project_images_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;

--
-- Dumping data for table `project_images`
--

LOCK TABLES `project_images` WRITE;
/*!40000 ALTER TABLE `project_images` DISABLE KEYS */
;
INSERT INTO
    `project_images`
VALUES (
        '7d81a1e4-0424-11f1-b496-f875a4049563',
        '7d8028e4-0424-11f1-b496-f875a4049563',
        'https://res.cloudinary.com/dt1teauvs/image/upload/v1770468964/buildright_uploads/pngwing-1770468959985.png',
        1,
        '2026-02-07 12:56:05'
    ),
    (
        'img1',
        'p1',
        '/pictures/upbeat-gen-z-girl-reading-messages-phone.jpg',
        1,
        '2026-01-21 18:03:28'
    ),
    (
        'img2',
        'p1',
        '/pictures/beautiful-smiling-african-american-woman-using-phone-outdoors.jpg',
        0,
        '2026-01-21 18:03:28'
    ),
    (
        'img3',
        'p2',
        '/pictures/upbeat-gen-z-girl-reading-messages-phone.jpg',
        1,
        '2026-01-21 18:03:28'
    ),
    (
        'img4',
        'p2',
        '/pictures/beautiful-smiling-african-american-woman-using-phone-outdoors.jpg',
        0,
        '2026-01-21 18:03:28'
    ),
    (
        'img5',
        'p3',
        '/pictures/upbeat-gen-z-girl-reading-messages-phone.jpg',
        1,
        '2026-01-21 18:03:28'
    ),
    (
        'img6',
        'p4',
        '/pictures/Bullseye PNG.jpg',
        1,
        '2026-01-21 18:03:28'
    );
/*!40000 ALTER TABLE `project_images` ENABLE KEYS */
;
UNLOCK TABLES;

--
-- Table structure for table `project_updates`
--

DROP TABLE IF EXISTS `project_updates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!50503 SET character_set_client = utf8mb4 */
;
CREATE TABLE `project_updates` (
    `id` char(36) NOT NULL DEFAULT(uuid()),
    `project_id` char(36) NOT NULL,
    `message` text NOT NULL,
    `author_name` varchar(255) NOT NULL,
    `update_date` date DEFAULT(curdate()),
    PRIMARY KEY (`id`),
    KEY `project_id` (`project_id`),
    CONSTRAINT `project_updates_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;

--
-- Dumping data for table `project_updates`
--

LOCK TABLES `project_updates` WRITE;
/*!40000 ALTER TABLE `project_updates` DISABLE KEYS */
;
INSERT INTO
    `project_updates`
VALUES (
        'up1',
        'p1',
        'Foundation work completed for bridge section.',
        'Admin User',
        '2023-11-20'
    ),
    (
        'up2',
        'p3',
        'Equipment delivery delayed due to customs.',
        'BTP Cameroun S.A.',
        '2024-02-15'
    );
/*!40000 ALTER TABLE `project_updates` ENABLE KEYS */
;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!50503 SET character_set_client = utf8mb4 */
;
CREATE TABLE `projects` (
    `id` char(36) NOT NULL DEFAULT(uuid()),
    `title` varchar(255) NOT NULL,
    `description` text NOT NULL,
    `location` varchar(255) NOT NULL,
    `region` varchar(100) NOT NULL,
    `budget` decimal(15, 2) DEFAULT 0.00,
    `spent` decimal(15, 2) DEFAULT 0.00,
    `progress` int(11) DEFAULT 0,
    `status` enum(
        'Planned',
        'Ongoing',
        'Stalled',
        'Completed'
    ) DEFAULT 'Planned',
    `contractor_id` char(36) DEFAULT NULL,
    `start_date` date DEFAULT NULL,
    `completion_date` date DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `contractor_id` (`contractor_id`),
    CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`contractor_id`) REFERENCES `users` (`id`),
    CONSTRAINT `chk_progress` CHECK (
        `progress` >= 0
        and `progress` <= 100
    )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */
;
INSERT INTO
    `projects`
VALUES (
        '7d8028e4-0424-11f1-b496-f875a4049563',
        'asdc',
        'asgvasdvasva',
        'Buea',
        'Far North',
        88.00,
        0.00,
        0,
        'Planned',
        'eafddc30-f6f3-11f0-900e-f875a4049563',
        '2026-02-07',
        '2026-03-26',
        '2026-02-07 12:56:05',
        '2026-02-07 12:56:05'
    ),
    (
        '8b9f40ed-f6fe-11f0-900e-f875a4049563',
        'Finish this web app massa',
        'Yes i have finished with what i want to do',
        'Buea',
        'Centre',
        12000000000.00,
        2090000000.00,
        60,
        'Ongoing',
        'eafddc30-f6f3-11f0-900e-f875a4049563',
        '2024-01-01',
        '2025-01-01',
        '2026-01-21 19:22:37',
        '2026-01-21 19:34:27'
    ),
    (
        'p1',
        'Yaoundé-Douala Highway Phase 2',
        'Construction of the remaining 60km section connecting the two major economic hubs.',
        'Edéa',
        'Littoral',
        85000000000.00,
        45000000000.00,
        55,
        'Ongoing',
        'u2',
        '2023-01-15',
        '2026-06-30',
        '2026-01-21 18:03:28',
        '2026-01-21 18:03:28'
    ),
    (
        'p2',
        'Regional Hospital Maroua',
        'Modernization of the regional hospital including new pediatric wing.',
        'Maroua',
        'Far North',
        12000000000.00,
        11500000000.00,
        100,
        'Completed',
        'u3',
        '2022-03-10',
        '2024-01-20',
        '2026-01-21 18:03:28',
        '2026-01-21 18:03:28'
    ),
    (
        'p3',
        'Rural Electrification - East Region',
        'Installation of solar grids in 50 villages.',
        'Bertoua',
        'East',
        5000000000.00,
        1000000000.00,
        20,
        'Stalled',
        'u2',
        '2024-01-01',
        '2025-12-31',
        '2026-01-21 18:03:28',
        '2026-01-21 18:03:28'
    ),
    (
        'p4',
        'New Community Library',
        'A modern library facility for the university district.',
        'Buea',
        'South West',
        250000000.00,
        0.00,
        0,
        'Planned',
        'u3',
        '2025-06-01',
        '2026-01-01',
        '2026-01-21 18:03:28',
        '2026-01-21 18:03:28'
    );
/*!40000 ALTER TABLE `projects` ENABLE KEYS */
;
UNLOCK TABLES;

--
-- Table structure for table `team_members`
--

DROP TABLE IF EXISTS `team_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!50503 SET character_set_client = utf8mb4 */
;
CREATE TABLE `team_members` (
    `id` char(36) NOT NULL DEFAULT(uuid()),
    `name` varchar(255) NOT NULL,
    `role` varchar(100) NOT NULL,
    `bio` text DEFAULT NULL,
    `image_url` text DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;

--
-- Dumping data for table `team_members`
--

LOCK TABLES `team_members` WRITE;
/*!40000 ALTER TABLE `team_members` DISABLE KEYS */
;
INSERT INTO
    `team_members`
VALUES (
        't1',
        'Diyoh shiloh',
        'Lead Engineer',
        'SOFTWARE engineer with 15 years experience in public works monitoring.',
        NULL
    ),
    (
        't2',
        'ASOBO JOYCE',
        'Data Scientist',
        'Specialist in detecting financial anomalies in public datasets.',
        NULL
    ),
    (
        't3',
        'SHOTS FO REAL',
        'Development Team',
        'The brilliant minds behind the BuildRight platform.',
        NULL
    ),
    (
        't4',
        'soh marrious',
        'Development Team',
        'The brilliant minds behind the BuildRight platform.',
        '/pictures/Doc 2.png'
    ),
    (
        't5',
        'Gboyz',
        'Development Team',
        'The brilliant minds behind the BuildRight platform.',
        '/pictures/Doc 2.png'
    );
/*!40000 ALTER TABLE `team_members` ENABLE KEYS */
;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!50503 SET character_set_client = utf8mb4 */
;
CREATE TABLE `users` (
    `id` char(36) NOT NULL DEFAULT(uuid()),
    `email` varchar(255) NOT NULL,
    `password_hash` varchar(255) NOT NULL,
    `name` varchar(255) NOT NULL,
    `role` enum(
        'ADMIN',
        'CONTRACTOR',
        'DEVELOPER_ADMIN',
        'PUBLIC'
    ) NOT NULL DEFAULT 'PUBLIC',
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `email` (`email`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */
;
INSERT INTO
    `users`
VALUES (
        'con1',
        'contact@kottoconst.cm',
        '$2a$10$FMjCH6EGdyMvqAMGQdwSS.M3MsJfmWqH7O8rPEJEL3JQBnjlkob4a',
        'Kotto Construction',
        'CONTRACTOR',
        '2026-01-21 19:19:04',
        '2026-01-21 19:19:04'
    ),
    (
        'con2',
        'contact@sobea.cm',
        '$2a$10$FMjCH6EGdyMvqAMGQdwSS.M3MsJfmWqH7O8rPEJEL3JQBnjlkob4a',
        'Sogea Satom',
        'CONTRACTOR',
        '2026-01-21 19:19:04',
        '2026-01-21 19:19:04'
    ),
    (
        'dev1',
        'diyoh@buildright.cm',
        '$2a$10$F8UQc5l4/DEwj10ywyLmeuOTp48eDlA7rZDkiDO5qB9y0Go/QAE.6',
        'Diyoh Shiloh',
        'DEVELOPER_ADMIN',
        '2026-01-21 18:03:28',
        '2026-01-21 18:03:28'
    ),
    (
        'dev2',
        'joyce@buildright.cm',
        '$2a$10$F8UQc5l4/DEwj10ywyLmeuOTp48eDlA7rZDkiDO5qB9y0Go/QAE.6',
        'Asobo Joyce',
        'DEVELOPER_ADMIN',
        '2026-01-21 18:03:28',
        '2026-01-21 18:03:28'
    ),
    (
        'dev3',
        'shots@buildright.cm',
        '$2a$10$F8UQc5l4/DEwj10ywyLmeuOTp48eDlA7rZDkiDO5qB9y0Go/QAE.6',
        'Shots Fo Real',
        'DEVELOPER_ADMIN',
        '2026-01-21 18:03:28',
        '2026-01-21 18:03:28'
    ),
    (
        'dev4',
        'soh@buildright.cm',
        '$2a$10$F8UQc5l4/DEwj10ywyLmeuOTp48eDlA7rZDkiDO5qB9y0Go/QAE.6',
        'Soh Marrious',
        'DEVELOPER_ADMIN',
        '2026-01-21 18:03:28',
        '2026-01-21 18:03:28'
    ),
    (
        'dev5',
        'gboyz@buildright.cm',
        '$2a$10$F8UQc5l4/DEwj10ywyLmeuOTp48eDlA7rZDkiDO5qB9y0Go/QAE.6',
        'Gboyz',
        'DEVELOPER_ADMIN',
        '2026-01-21 18:03:28',
        '2026-01-21 18:03:28'
    ),
    (
        'eafddc30-f6f3-11f0-900e-f875a4049563',
        'sg@buildright.cm',
        '$2a$10$kk5h4p68kX1F7iD4gkkbBeaOQ3iUf/aym61seI7hloGaIMkR84ICm',
        'sg',
        'CONTRACTOR',
        '2026-01-21 18:06:32',
        '2026-01-21 18:55:13'
    ),
    (
        'u1',
        'admin@buildright.cm',
        '$2a$10$F8UQc5l4/DEwj10ywyLmeuOTp48eDlA7rZDkiDO5qB9y0Go/QAE.6',
        'Admin User',
        'ADMIN',
        '2026-01-21 18:03:28',
        '2026-01-21 18:03:28'
    ),
    (
        'u2',
        'contact@btpcameroun.cm',
        '$2a$10$F8UQc5l4/DEwj10ywyLmeuOTp48eDlA7rZDkiDO5qB9y0Go/QAE.6',
        'BTP Cameroun S.A.',
        'CONTRACTOR',
        '2026-01-21 18:03:28',
        '2026-01-21 18:03:28'
    ),
    (
        'u3',
        'info@buildfast.cm',
        '$2a$10$F8UQc5l4/DEwj10ywyLmeuOTp48eDlA7rZDkiDO5qB9y0Go/QAE.6',
        'BuildFast Const',
        'CONTRACTOR',
        '2026-01-21 18:03:28',
        '2026-01-21 18:03:28'
    ),
    (
        'u4',
        'dev@buildright.cm',
        '$2a$10$F8UQc5l4/DEwj10ywyLmeuOTp48eDlA7rZDkiDO5qB9y0Go/QAE.6',
        'Dev Team Lead',
        'DEVELOPER_ADMIN',
        '2026-01-21 18:03:28',
        '2026-01-21 18:03:28'
    );
/*!40000 ALTER TABLE `users` ENABLE KEYS */
;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */
;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */
;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */
;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */
;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */
;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */
;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */
;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */
;

-- Dump completed on 2026-02-07 17:49:32