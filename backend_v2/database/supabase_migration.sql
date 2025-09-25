-- Supabase Migration: AI Fitness Trainer Database Schema
-- Run this in your Supabase SQL Editor to create the required tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    age INTEGER,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    fitness_goal TEXT,
    gender TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Workout sessions table
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes DECIMAL(6,2) DEFAULT 0,
    total_reps INTEGER DEFAULT 0,
    calories_estimate DECIMAL(8,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT FALSE,
    exercises_performed JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Nutrition goals table
CREATE TABLE IF NOT EXISTS nutrition_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    fitness_goal TEXT,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    age INTEGER,
    gender TEXT,
    activity_level TEXT DEFAULT 'moderate',
    daily_calories INTEGER,
    protein_grams DECIMAL(6,2),
    carbs_grams DECIMAL(6,2),
    fat_grams DECIMAL(6,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Food entries table
CREATE TABLE IF NOT EXISTS food_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    food_name TEXT NOT NULL,
    calories DECIMAL(7,2) DEFAULT 0,
    protein DECIMAL(6,2) DEFAULT 0,
    carbs DECIMAL(6,2) DEFAULT 0,
    fat DECIMAL(6,2) DEFAULT 0,
    quantity DECIMAL(4,2) DEFAULT 1,
    meal_type TEXT DEFAULT 'snack',
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_created_at ON workout_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_entries_user_id ON food_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_logged_at ON food_entries(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_user_id ON nutrition_goals(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated access
-- These policies allow users to only access their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own workout sessions" ON workout_sessions
    FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert own workout sessions" ON workout_sessions
    FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own workout sessions" ON workout_sessions
    FOR UPDATE USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can view own nutrition goals" ON nutrition_goals
    FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert own nutrition goals" ON nutrition_goals
    FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own nutrition goals" ON nutrition_goals
    FOR UPDATE USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can view own food entries" ON food_entries
    FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert own food entries" ON food_entries
    FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own food entries" ON food_entries
    FOR UPDATE USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete own food entries" ON food_entries
    FOR DELETE USING (user_id::text = auth.uid()::text);
