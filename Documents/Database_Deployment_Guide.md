# Cloud Database Deployment Guide

Since Vercel only hosts your application code (Frontend & Backend), you need a separate service to host your **MySQL Database**.

I recommend using **Aiven** (Free Tier available) or **Railway** (Trial available) to host your MySQL database in the cloud.

## Step 1: Create a Cloud Database (Option A: Aiven)

1.  Go to [Aiven.io](https://aiven.io/) and create a free account.
2.  Create a **New Service** -> Select **MySQL**.
3.  Choose the **Free Plan** (Cloud: Google Cloud, Region: Any nearby).
4.  Once created, Aiven will provide you with connection details:
    - **Host**: `mysql-...aivencloud.com`
    - **Port**: `20923` (Example)
    - **User**: `avnadmin`
    - **Password**: `...`
    - **Database Name**: `defaultdb` (You can create a new one named `buildright` or use the default).

## Step 2: Export Your Local Data

You need to move your data from your local computer to the cloud.

1.  Open your terminal.
2.  Run this command to export your local database to a file:
    ```bash
    mysqldump -u root -p buildright > backup.sql
    ```
    _(Enter your local password when prompted)_

## Step 3: Import Data to Cloud

1.  Connect to your cloud database using a tool like **MySQL Workbench**, **DBeaver**, or the terminal.
2.  Run the contents of `backup.sql` (or `schema.sql` + `contractors_seed.sql`) in the cloud database query window.

## Step 4: Update Vercel Environment Variables

1.  Go to your **Backend Project** settings on Vercel.
2.  Update/Add the Environment Variables:
    - `DB_HOST`: (The host from Aiven/Railway)
    - `DB_PORT`: (The port from Aiven/Railway)
    - `DB_USER`: (The username)
    - `DB_PASS`: (The password)
    - `DB_NAME`: (The database name)
    - `DB_SSL`: `true` (Add this new variable for secure connection)

## Important Update

I have updated your backend code (`Backend/config/db.js`) to support **SSL connections**, which are required by most cloud providers. Ensure you add `DB_SSL=true` to your Vercel Environment Variables.
