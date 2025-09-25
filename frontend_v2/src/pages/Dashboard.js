import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkout } from '../contexts/WorkoutContext';
import { useNavigate } from 'react-router-dom';
import { workoutService } from '../services/workoutService';
import { aiService } from '../services/aiService';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { workoutHistory, currentPlan, isWorkoutActive } = useWorkout();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalReps: 0,
    totalCalories: 0,
    currentStreak: 0
  });
  const [dailySuggestions, setDailySuggestions] = useState([]);
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Calculate stats from workout history
      const totalWorkouts = workoutHistory.length;
      const totalReps = workoutHistory.reduce((sum, session) => sum + (session.total_reps || 0), 0);
      const totalCalories = workoutHistory.reduce((sum, session) => sum + (session.calories_estimate || 0), 0);
      
      // Calculate current streak (consecutive days with workouts)
      const currentStreak = calculateWorkoutStreak(workoutHistory);
      
      setStats({
        totalWorkouts,
        totalReps,
        totalCalories: Math.round(totalCalories),
        currentStreak
      });

      // Get AI-powered daily suggestions
      try {
        const suggestionsResult = await aiService.getDailyWorkoutSuggestions(user, workoutHistory);
        if (suggestionsResult.success) {
          setDailySuggestions(suggestionsResult.suggestions || []);
        }
      } catch (error) {
        console.error('Failed to load daily suggestions:', error);
      }

      // Get motivational message
      try {
        const motivationResult = await aiService.getMotivationalMessage({
          user_profile: user,
          workout_stats: { totalWorkouts, currentStreak },
          recent_activity: workoutHistory.slice(0, 3)
        });
        if (motivationResult.success) {
          setMotivationalMessage(motivationResult.message);
        }
      } catch (error) {
        console.error('Failed to load motivational message:', error);
        setMotivationalMessage("You're doing great! Keep up the excellent work! 💪");
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkoutStreak = (sessions) => {
    if (!sessions || sessions.length === 0) return 0;
    
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    // Sort sessions by date (most recent first)
    const sortedSessions = sessions
      .filter(session => session.start_time)
      .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    
    for (let i = 0; i < 30; i++) { // Check last 30 days
      const dateStr = currentDate.toISOString().split('T')[0];
      const hasWorkout = sortedSessions.some(session => 
        session.start_time.startsWith(dateStr)
      );
      
      if (hasWorkout) {
        streak++;
      } else if (streak > 0) {
        break; // Streak broken
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  };

  const handleStartWorkout = () => {
    navigate('/workout');
  };

  const handleCreatePlan = () => {
    navigate('/plan-creation');
  };

  const handleViewCalendar = () => {
    navigate('/calendar');
  };

  const handleLogout = async () => {
    await logout();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getStreakEmoji = (streak) => {
    if (streak >= 30) return '🔥';
    if (streak >= 14) return '⚡';
    if (streak >= 7) return '💪';
    if (streak >= 3) return '🌟';
    return '👍';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {getGreeting()}, {user?.name || 'Fitness Enthusiast'}! 👋
              </h1>
              <p className="text-blue-200 mt-1">Ready to crush your fitness goals today?</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleViewCalendar}
                className="text-white hover:text-blue-200 transition-colors"
              >
                📅 Calendar
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500/20 text-red-200 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={handleStartWorkout}
            className="bg-gradient-to-r from-green-500 to-blue-600 p-6 rounded-2xl text-white hover:from-green-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
          >
            <div className="text-3xl mb-2">🏋️‍♂️</div>
            <h3 className="text-xl font-bold mb-1">
              {isWorkoutActive ? 'Continue Workout' : 'Start Workout'}
            </h3>
            <p className="text-green-100">Begin your fitness journey</p>
          </button>

          <button
            onClick={handleCreatePlan}
            className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 rounded-2xl text-white hover:from-purple-600 hover:to-pink-700 transition-all duration-200 transform hover:scale-105"
          >
            <div className="text-3xl mb-2">📋</div>
            <h3 className="text-xl font-bold mb-1">Create Plan</h3>
            <p className="text-purple-100">AI-powered workout plans</p>
          </button>

          <button
            onClick={handleViewCalendar}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-2xl text-white hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105"
          >
            <div className="text-3xl mb-2">📊</div>
            <h3 className="text-xl font-bold mb-1">View Progress</h3>
            <p className="text-blue-100">Track your achievements</p>
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-2xl font-bold text-white">{stats.totalWorkouts}</div>
            <div className="text-blue-200 text-sm">Total Workouts</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-2xl font-bold text-white">{stats.totalReps}</div>
            <div className="text-blue-200 text-sm">Total Reps</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-2xl font-bold text-white">{stats.totalCalories}</div>
            <div className="text-blue-200 text-sm">Calories Burned</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-2xl font-bold text-white flex items-center">
              {stats.currentStreak} {getStreakEmoji(stats.currentStreak)}
            </div>
            <div className="text-blue-200 text-sm">Day Streak</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Motivational Message */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">💬 Your AI Coach Says</h3>
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4">
              <p className="text-white leading-relaxed">{motivationalMessage}</p>
            </div>
          </div>

          {/* Current Plan */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">📋 Current Plan</h3>
            {currentPlan ? (
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">{currentPlan.name}</h4>
                <p className="text-blue-200 mb-3">{currentPlan.description}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-white">Progress: {currentPlan.progress || 0}%</span>
                  <span className="text-blue-200">{currentPlan.duration_weeks} weeks</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                    style={{ width: `${currentPlan.progress || 0}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-blue-200 mb-4">No active plan</p>
                <button
                  onClick={handleCreatePlan}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-colors"
                >
                  Create Your First Plan
                </button>
              </div>
            )}
          </div>

          {/* Daily Suggestions */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">🎯 Today's Suggestions</h3>
            {dailySuggestions.length > 0 ? (
              <div className="space-y-3">
                {dailySuggestions.slice(0, 3).map((suggestion, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="text-lg">{suggestion.icon || '💡'}</div>
                    <div>
                      <h4 className="text-white font-medium">{suggestion.title}</h4>
                      <p className="text-blue-200 text-sm">{suggestion.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-blue-200">Loading personalized suggestions...</p>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">📈 Recent Activity</h3>
            {workoutHistory.length > 0 ? (
              <div className="space-y-3">
                {workoutHistory.slice(0, 3).map((session, index) => (
                  <div key={session.session_id || index} className="flex justify-between items-center">
                    <div>
                      <h4 className="text-white font-medium">
                        {session.exercises_performed ? Object.keys(session.exercises_performed)[0] : 'Workout'}
                      </h4>
                      <p className="text-blue-200 text-sm">
                        {new Date(session.start_time).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">{session.total_reps || 0} reps</div>
                      <div className="text-blue-200 text-sm">{Math.round(session.calories_estimate || 0)} cal</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-blue-200 mb-4">No workouts yet</p>
                <button
                  onClick={handleStartWorkout}
                  className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-blue-700 transition-colors"
                >
                  Start Your First Workout
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
