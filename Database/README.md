# BuildRight Database

## Overview

This directory contains the SQL scripts required to initialize the relational database for the BuildRight platform. The system uses **MySQL** to ensure data integrity and complex relationship management between projects, users, and reports.

## Files

- **`schema.sql`**: The Data Definition Language (DDL) script. It creates all necessary tables, defines primary/foreign keys, and sets up constraints (e.g., Cascading Deletes).

## Schema Summary

### Tables

1.  **`users`**: Stores authentication data and roles (ADMIN, CONTRACTOR, etc.).
2.  **`projects`**: The core entity. Stores title, budget, status, and contractor assignment.
3.  **`project_images`**: One-to-Many relationship with Projects. Stores gallery URLs.
4.  **`project_updates`**: Timeline events for projects.
5.  **`comments`**: Public citizen reports linked to projects.
6.  **`comment_images`**: Evidence photos attached to comments.
7.  **`access_codes`**: System for role-based invitation/registration.
8.  **`team_members`**: Static content for the "Developers" page.

## Installation

1.  Open your MySQL Client (Workbench, Command Line, or a VS Code extension).
2.  Create a new database:
    ```sql
    CREATE DATABASE buildright;
    USE buildright;
    ```
3.  Run the contents of **`schema.sql`**.

## Relationships

- **Users** 1 -- N **Projects** (As Contractor)
- **Projects** 1 -- N **Images**
- **Projects** 1 -- N **Comments**
- **Comments** 1 -- N **Comment Images**
