/* =========================================================
   ReLOL - MSSQL Schema
   Run this once against an empty database, e.g.:
     sqlcmd -S localhost -d ReLOL -i schema.sql
   ========================================================= */

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'ReLOL')
BEGIN
    PRINT 'Create the ReLOL database first: CREATE DATABASE ReLOL;';
END
GO

/* ---------- Users ---------- */
CREATE TABLE Users (
    UserId            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Email             NVARCHAR(256)    NOT NULL UNIQUE,
    PasswordHash      NVARCHAR(256)    NOT NULL,
    DisplayName       NVARCHAR(100)    NULL,
    UserType          NVARCHAR(30)     NULL,         -- e.g. 'professional','parent','student','other'
    ReminderTime      TIME             NULL,          -- local time for the daily nudge
    NotificationsOn   BIT              NOT NULL DEFAULT 1,
    ShareDefault      BIT              NOT NULL DEFAULT 0,  -- pre-checks "share anonymously" toggle
    CreatedAt         DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted         BIT              NOT NULL DEFAULT 0,
    DeletedAt         DATETIME2        NULL
);
GO

/* ---------- Streaks (1:1 with Users) ---------- */
CREATE TABLE Streaks (
    UserId            UNIQUEIDENTIFIER NOT NULL PRIMARY KEY REFERENCES Users(UserId),
    CurrentStreak     INT NOT NULL DEFAULT 0,
    LongestStreak     INT NOT NULL DEFAULT 0,
    LastCheckinDate   DATE NULL
);
GO

/* ---------- Daily Entries ---------- */
CREATE TABLE Entries (
    EntryId           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    UserId            UNIQUEIDENTIFIER NOT NULL REFERENCES Users(UserId),
    Category          NVARCHAR(30)     NOT NULL,     -- frustrated | angry | upset | tired | funny
    RawText           NVARCHAR(2000)   NOT NULL,
    CleanedText       NVARCHAR(2000)   NOT NULL,
    Mood              TINYINT          NOT NULL,      -- 1..5 (1 = rough, 5 = great)
    HumorText         NVARCHAR(500)    NOT NULL,
    PerspectiveText   NVARCHAR(500)    NOT NULL,
    ActionText        NVARCHAR(500)    NOT NULL,
    IsSharedAnonymously BIT            NOT NULL DEFAULT 0,
    CreatedAt         DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    EntryDate         AS CAST(CreatedAt AS DATE) PERSISTED  -- used for one-check-in-per-day logic
);
CREATE INDEX IX_Entries_User_Date ON Entries(UserId, EntryDate);
GO

/* ---------- Community Feed (anonymized copies only) ---------- */
CREATE TABLE CommunityPosts (
    PostId            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    EntryId           UNIQUEIDENTIFIER NOT NULL REFERENCES Entries(EntryId),
    Category          NVARCHAR(30)     NOT NULL,
    AnonymizedText    NVARCHAR(2000)   NOT NULL,      -- names / companies stripped
    HumorText         NVARCHAR(500)    NOT NULL,
    PerspectiveText   NVARCHAR(500)    NOT NULL,
    FunnyVotes        INT NOT NULL DEFAULT 0,
    SmileVotes        INT NOT NULL DEFAULT 0,
    NotFunnyVotes     INT NOT NULL DEFAULT 0,
    CreatedAt         DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_CommunityPosts_CreatedAt ON CommunityPosts(CreatedAt DESC);
GO

/* ---------- Votes (one vote per user per post) ---------- */
CREATE TABLE Votes (
    VoteId            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    PostId            UNIQUEIDENTIFIER NOT NULL REFERENCES CommunityPosts(PostId),
    UserId            UNIQUEIDENTIFIER NOT NULL REFERENCES Users(UserId),
    VoteType          NVARCHAR(10)     NOT NULL,      -- funny | smile | not_funny
    CreatedAt         DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Vote_PerUserPost UNIQUE (PostId, UserId)
);
GO

/* ---------- Joke History (for the 10,000-joke similarity / dedupe check) ---------- */
CREATE TABLE JokeHistory (
    JokeId            BIGINT IDENTITY(1,1) PRIMARY KEY,
    JokeText          NVARCHAR(500) NOT NULL,
    NormalizedTokens  NVARCHAR(1000) NOT NULL,        -- sorted, lower-cased token set, used for similarity
    CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_JokeHistory_CreatedAt ON JokeHistory(CreatedAt DESC);
GO

/* ---------- Refresh tokens (simple session handling) ---------- */
CREATE TABLE RefreshTokens (
    TokenId           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    UserId            UNIQUEIDENTIFIER NOT NULL REFERENCES Users(UserId),
    TokenHash         NVARCHAR(256) NOT NULL,
    ExpiresAt         DATETIME2 NOT NULL,
    CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
