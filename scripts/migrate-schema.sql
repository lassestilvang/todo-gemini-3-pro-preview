-- Multi-User Schema Migration
-- Run this before db:push to prepare existing data

-- Step 1: Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 2: Create a migration user for existing data
INSERT INTO users (id, email, first_name, last_name)
VALUES ('migration_user_default', 'admin@localhost', 'Migration', 'User')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Add user_id columns as nullable first
ALTER TABLE lists ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE labels ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Step 4: Update all existing records to use migration user
UPDATE lists SET user_id = 'migration_user_default' WHERE user_id IS NULL;
UPDATE tasks SET user_id = 'migration_user_default' WHERE user_id IS NULL;
UPDATE labels SET user_id = 'migration_user_default' WHERE user_id IS NULL;
UPDATE templates SET user_id = 'migration_user_default' WHERE user_id IS NULL;
UPDATE task_logs SET user_id = 'migration_user_default' WHERE user_id IS NULL;

-- Step 5: Handle user_stats table (change from id PK to user_id PK)
-- First, backup existing data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'id') THEN
        -- Old schema exists, migrate it
        CREATE TABLE IF NOT EXISTS user_stats_new (
            user_id TEXT PRIMARY KEY,
            xp INTEGER NOT NULL DEFAULT 0,
            level INTEGER NOT NULL DEFAULT 1,
            last_login TIMESTAMP,
            current_streak INTEGER NOT NULL DEFAULT 0,
            longest_streak INTEGER NOT NULL DEFAULT 0
        );
        
        INSERT INTO user_stats_new (user_id, xp, level, last_login, current_streak, longest_streak)
        SELECT 'migration_user_default', xp, level, last_login, current_streak, longest_streak
        FROM user_stats
        LIMIT 1
        ON CONFLICT (user_id) DO NOTHING;
        
        DROP TABLE user_stats;
        ALTER TABLE user_stats_new RENAME TO user_stats;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stats') THEN
        -- Table doesn't exist, create it
        CREATE TABLE user_stats (
            user_id TEXT PRIMARY KEY,
            xp INTEGER NOT NULL DEFAULT 0,
            level INTEGER NOT NULL DEFAULT 1,
            last_login TIMESTAMP,
            current_streak INTEGER NOT NULL DEFAULT 0,
            longest_streak INTEGER NOT NULL DEFAULT 0
        );
    END IF;
END $$;

-- Step 6: Handle user_achievements table (add user_id to composite PK)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_achievements' AND column_name = 'user_id') THEN
        ALTER TABLE user_achievements ADD COLUMN user_id TEXT;
        UPDATE user_achievements SET user_id = 'migration_user_default' WHERE user_id IS NULL;
        
        -- Drop old primary key and create new one
        ALTER TABLE user_achievements DROP CONSTRAINT IF EXISTS user_achievements_pkey;
        ALTER TABLE user_achievements ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE user_achievements ADD PRIMARY KEY (user_id, achievement_id);
    END IF;
END $$;

-- Step 7: Handle view_settings table (add user_id to composite PK)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'view_settings') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'view_settings' AND column_name = 'user_id') THEN
            ALTER TABLE view_settings ADD COLUMN user_id TEXT;
            UPDATE view_settings SET user_id = 'migration_user_default' WHERE user_id IS NULL;
            
            -- Drop old primary key and create new one
            ALTER TABLE view_settings DROP CONSTRAINT IF EXISTS view_settings_pkey;
            ALTER TABLE view_settings ALTER COLUMN user_id SET NOT NULL;
            ALTER TABLE view_settings ADD PRIMARY KEY (user_id, view_id);
        END IF;
    END IF;
END $$;

-- Step 8: Now make user_id columns NOT NULL
ALTER TABLE lists ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE labels ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE templates ALTER COLUMN user_id SET NOT NULL;
-- task_logs user_id stays nullable per schema

-- Step 9: Add foreign key constraints (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'lists_user_id_fkey') THEN
        ALTER TABLE lists ADD CONSTRAINT lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_user_id_fkey') THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'labels_user_id_fkey') THEN
        ALTER TABLE labels ADD CONSTRAINT labels_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'templates_user_id_fkey') THEN
        ALTER TABLE templates ADD CONSTRAINT templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'task_logs_user_id_fkey') THEN
        ALTER TABLE task_logs ADD CONSTRAINT task_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_stats_user_id_fkey') THEN
        ALTER TABLE user_stats ADD CONSTRAINT user_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_achievements_user_id_fkey') THEN
        ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Done! Now run `bun run db:push` to sync any remaining schema differences
