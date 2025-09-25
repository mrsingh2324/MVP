# Supabase Setup Guide for AI Fitness Trainer

## 🚀 Quick Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for it to be ready

### 2. Get Your Credentials
1. Go to Project Settings → API
2. Copy your Project URL and anon/public key
3. Update your `.env` file:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set Up Database Tables
1. Go to SQL Editor in your Supabase dashboard
2. Copy and run the SQL from `database/supabase_migration.sql`
3. This will create all required tables, indexes, and security policies

### 4. Install Dependencies
```bash
cd backend_v2
pip install -r requirements.txt
```

### 5. Test Connection
```bash
cd backend_v2
python -c "from database.db import db_manager; print('Connection:', db_manager.connect())"
```

## 📊 Database Schema

### Tables Created:
- **users** - User profiles and authentication
- **workout_sessions** - Exercise session data
- **nutrition_goals** - User nutrition targets
- **food_entries** - Daily food logging

### Security Features:
- Row Level Security (RLS) enabled
- Users can only access their own data
- Secure policies for all operations

## 🔧 Environment Variables

Create a `.env` file in the `backend_v2` directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Optional: For service role operations (admin operations)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## 🧪 Testing

### Test User Creation:
```bash
curl -X POST "http://localhost:8000/api/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "otp": "123456"}'
```

### Test Database Connection:
```python
from database.db import db_manager

# Test connection
connected = db_manager.connect()
print(f"Connected: {connected}")

# Test user creation
user_id = db_manager.create_user({
    'phone': '+1234567890',
    'name': 'Test User'
})
print(f"Created user: {user_id}")
```

## 🔒 Security Notes

- **RLS Policies**: Users can only access their own data
- **Environment Variables**: Never commit API keys to git
- **Session Management**: Tokens expire after 24 hours
- **OTP Security**: For demo purposes only (implement proper SMS service for production)

## 🚀 Production Deployment

For production deployment:

1. **Enable Authentication**: Set up proper SMS OTP service
2. **Environment Security**: Use secure environment variable management
3. **Database Backups**: Configure automated backups
4. **Monitoring**: Set up error logging and monitoring
5. **Rate Limiting**: Implement API rate limiting

## 🆘 Troubleshooting

### Connection Issues:
- Check your `.env` file has correct credentials
- Ensure Supabase project is active
- Verify network connectivity

### Table Creation Errors:
- Run the migration SQL again
- Check Supabase dashboard for errors
- Ensure you have proper permissions

### Authentication Issues:
- Verify OTP implementation (currently demo-only)
- Check session token handling
- Review RLS policies

---

**🎉 Your AI Fitness Trainer now has persistent data storage with Supabase!**
