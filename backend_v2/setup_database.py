#!/usr/bin/env python3
"""
Setup script to create required Supabase database tables.
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_database():
    """Create all required database tables."""
    
    # Initialize Supabase client
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # Use service role for admin operations
    
    if not supabase_url or not supabase_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file")
        return False
    
    try:
        client: Client = create_client(supabase_url, supabase_key)
        print("✅ Connected to Supabase")
        
        # Test database connection by trying to access tables
        print("🔧 Testing database connection...")
        
        # Try to access users table - if it fails, tables don't exist
        try:
            result = client.table('users').select('id').limit(1).execute()
            print("✅ Users table exists")
        except Exception as e:
            print(f"⚠️ Users table doesn't exist or is inaccessible: {e}")
            print("📝 Please create the following tables in your Supabase dashboard:")
            print("""
            -- Users table
            CREATE TABLE IF NOT EXISTS public.users (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) UNIQUE,
                name VARCHAR(100),
                age INTEGER,
                weight DECIMAL(5,2),
                height DECIMAL(5,2),
                fitness_goal VARCHAR(50),
                gender VARCHAR(10),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            -- Workout sessions table
            CREATE TABLE IF NOT EXISTS public.workout_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES public.users(id),
                session_id VARCHAR(100),
                start_time TIMESTAMP WITH TIME ZONE,
                end_time TIMESTAMP WITH TIME ZONE,
                duration_minutes DECIMAL(10,2),
                total_reps INTEGER DEFAULT 0,
                calories_estimate DECIMAL(10,2) DEFAULT 0,
                is_active BOOLEAN DEFAULT FALSE,
                exercises_performed JSONB DEFAULT '{}',
                performance_metrics JSONB DEFAULT '{}',
                recommendations TEXT[],
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            -- Nutrition goals table
            CREATE TABLE IF NOT EXISTS public.nutrition_goals (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES public.users(id),
                fitness_goal VARCHAR(50),
                weight DECIMAL(5,2),
                height DECIMAL(5,2),
                age INTEGER,
                gender VARCHAR(10),
                activity_level VARCHAR(20) DEFAULT 'moderate',
                daily_calories INTEGER,
                protein_grams DECIMAL(6,2),
                carbs_grams DECIMAL(6,2),
                fat_grams DECIMAL(6,2),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            -- Food entries table
            CREATE TABLE IF NOT EXISTS public.food_entries (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES public.users(id),
                food_name VARCHAR(200),
                calories DECIMAL(8,2) DEFAULT 0,
                protein DECIMAL(6,2) DEFAULT 0,
                carbs DECIMAL(6,2) DEFAULT 0,
                fat DECIMAL(6,2) DEFAULT 0,
                quantity DECIMAL(6,2) DEFAULT 1,
                meal_type VARCHAR(20) DEFAULT 'snack',
                logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """)
            return False
        
        # Create a demo user for testing
        demo_user_data = {
            'phone': '+1234567890',
            'name': 'Demo User',
            'age': 25,
            'weight': 70.0,
            'height': 175.0,
            'fitness_goal': 'weight_loss',
            'gender': 'other'
        }
        
        try:
            # Check if demo user already exists
            existing_user = client.table('users').select('*').eq('phone', demo_user_data['phone']).execute()
            
            if not existing_user.data:
                # Create demo user
                result = client.table('users').insert(demo_user_data).execute()
                if result.data:
                    print(f"✅ Demo user created with ID: {result.data[0]['id']}")
                else:
                    print("⚠️ Failed to create demo user")
            else:
                print(f"✅ Demo user already exists with ID: {existing_user.data[0]['id']}")
                
        except Exception as e:
            print(f"⚠️ Error creating demo user: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Setting up AI Fitness Trainer database...")
    success = setup_database()
    
    if success:
        print("\n🎉 Database setup completed successfully!")
        print("You can now run the backend server with: python app.py")
    else:
        print("\n❌ Database setup failed. Please check your configuration.")
