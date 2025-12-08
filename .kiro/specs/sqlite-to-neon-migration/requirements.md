# Requirements Document

## Introduction

This document specifies the requirements for migrating the Todo Gemini application from SQLite to Neon PostgreSQL. The migration includes setting up a new Neon project, converting the database schema from SQLite to PostgreSQL, implementing Git branch-based database branching for development workflows, and updating the application's database connection layer.

## Glossary

- **Neon**: A serverless PostgreSQL platform with database branching, autoscaling, and scale-to-zero capabilities
- **Database Branch**: An isolated copy of the database that can be created for development, testing, or feature work
- **Drizzle ORM**: The TypeScript ORM used by the application for database operations
- **Connection String**: A PostgreSQL URL containing credentials and connection parameters
- **Git Branch**: A version control branch in the Git repository
- **Main Branch**: The primary database branch in Neon, corresponding to the main/production Git branch

## Requirements

### Requirement 1

**User Story:** As a developer, I want to create a new Neon PostgreSQL project, so that I can migrate the application from SQLite to a serverless PostgreSQL database.

#### Acceptance Criteria

1. WHEN the migration is initiated THEN the System SHALL create a new Neon project in the "Lasse" organization (org-broad-haze-11674340)
2. WHEN the Neon project is created THEN the System SHALL store the connection string securely in environment variables
3. WHEN the project is created THEN the System SHALL configure the project in the AWS eu-central-1 (Frankfurt) region

### Requirement 1.5

**User Story:** As a developer, I want to migrate existing data from SQLite to PostgreSQL, so that no data is lost during the migration.

#### Acceptance Criteria

1. WHEN migrating data THEN the System SHALL export all existing data from the SQLite database
2. WHEN migrating data THEN the System SHALL transform data types as needed for PostgreSQL compatibility (timestamps, booleans)
3. WHEN migrating data THEN the System SHALL import all data into the new Neon PostgreSQL database preserving relationships
4. WHEN migrating data THEN the System SHALL verify data integrity by comparing record counts between source and destination

### Requirement 2

**User Story:** As a developer, I want to convert the SQLite schema to PostgreSQL, so that all existing data models work correctly with the new database.

#### Acceptance Criteria

1. WHEN converting the schema THEN the System SHALL replace SQLite-specific column types with PostgreSQL equivalents (integer timestamps to TIMESTAMP, text enums to PostgreSQL enums or text)
2. WHEN converting the schema THEN the System SHALL preserve all existing table relationships, foreign keys, and indexes
3. WHEN converting the schema THEN the System SHALL update the Drizzle ORM schema file to use PostgreSQL-specific imports and syntax
4. WHEN converting the schema THEN the System SHALL maintain backward compatibility with existing application code that uses the schema

### Requirement 3

**User Story:** As a developer, I want to update the database connection layer, so that the application connects to Neon PostgreSQL instead of SQLite.

#### Acceptance Criteria

1. WHEN updating the connection layer THEN the System SHALL replace better-sqlite3 with the Neon serverless driver (@neondatabase/serverless)
2. WHEN updating the connection layer THEN the System SHALL configure Drizzle ORM to use the PostgreSQL dialect
3. WHEN updating the connection layer THEN the System SHALL read the database connection string from environment variables
4. WHEN updating the connection layer THEN the System SHALL support both production and test environments with appropriate connection handling

### Requirement 4

**User Story:** As a developer, I want automatic database branching via GitHub Actions, so that each feature branch automatically gets its own isolated database environment.

#### Acceptance Criteria

1. WHEN a new Git branch is pushed to GitHub THEN the System SHALL automatically create a corresponding Neon database branch via GitHub Actions
2. WHEN a database branch is created THEN the System SHALL inherit all data and schema from the parent branch (main)
3. WHEN a pull request is opened THEN the System SHALL provide the branch-specific database connection string as an environment variable
4. WHEN a Git branch is merged or deleted THEN the System SHALL automatically delete the corresponding Neon database branch via GitHub Actions
5. WHEN the GitHub Action runs THEN the System SHALL use the Neon API with secure credentials stored in GitHub Secrets

### Requirement 5

**User Story:** As a developer, I want the test suite to work with the new PostgreSQL setup, so that I can continue running tests during and after the migration.

#### Acceptance Criteria

1. WHEN running tests THEN the System SHALL use an isolated test database or in-memory approach that does not affect production data
2. WHEN running tests THEN the System SHALL maintain compatibility with the existing test setup patterns
3. WHEN running tests THEN the System SHALL ensure all existing tests pass with the new PostgreSQL backend

### Requirement 6

**User Story:** As a developer, I want updated configuration files, so that the build and development workflows work with PostgreSQL.

#### Acceptance Criteria

1. WHEN updating configuration THEN the System SHALL modify drizzle.config.ts to use the PostgreSQL dialect
2. WHEN updating configuration THEN the System SHALL update package.json with new PostgreSQL-related dependencies
3. WHEN updating configuration THEN the System SHALL provide environment variable templates (.env.example) for the new database configuration
4. WHEN updating configuration THEN the System SHALL update any CI/CD configuration to work with the new database setup

### Requirement 7

**User Story:** As a developer, I want documentation for the new database setup, so that team members understand how to work with Neon branching.

#### Acceptance Criteria

1. WHEN the migration is complete THEN the System SHALL update the README or create documentation explaining the Neon setup
2. WHEN documenting THEN the System SHALL include instructions for creating new database branches for feature development
3. WHEN documenting THEN the System SHALL include instructions for connecting to different database branches locally
