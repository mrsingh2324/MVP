import analytics from './analytics';
import errorTracking from './errorTracking';

class DemoAccountService {
  constructor() {
    this.storageKey = 'ai_fitness_demo_data';
    this.userKey = 'ai_fitness_demo_user';
    this.initializeDemoData();
  }

  // Initialize demo data structure
  initializeDemoData() {
    const existingData = this.getDemoData();
    if (!existingData) {
      const initialData = {
        user: {
          id: 'demo_user_' + Date.now(),
          phone: '+1 (555) 123-4567',
          name: 'Demo User',
          email: 'demo@aifitnesstrainer.com',
          isDemo: true,
          createdAt: new Date().toISOString(),
          profile: {
            age: 28,
            height: 175, // cm
            weight: 70, // kg
            activityLevel: 'moderate',
            fitnessGoals: ['weight_loss', 'muscle_gain'],
            targetCalories: 2000,
            targetProtein: 150,
            targetCarbs: 200,
            targetFats: 67
          }
        },
        nutrition: {
          dailyLogs: {},
          favoriteFood: [],
          recentSearches: []
        },
        workouts: {
          history: [],
          favorites: [],
          currentStreak: 0,
          totalWorkouts: 0
        },
        dashboard: {
          weeklyStats: {
            workoutsCompleted: 0,
            caloriesBurned: 0,
            avgWorkoutDuration: 0
          },
          monthlyGoals: {
            workoutDays: 20,
            caloriesTarget: 60000,
            completed: {
              workoutDays: 0,
              calories: 0
            }
          }
        },
        preferences: {
          theme: 'light',
          notifications: true,
          units: 'metric',
          language: 'en'
        }
      };

      this.saveDemoData(initialData);
      analytics.event('demo_account_created', 'User', 'initial_setup');
    }
  }

  // Get all demo data
  getDemoData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      errorTracking.captureException(error, { function: 'getDemoData' });
      return null;
    }
  }

  // Save demo data
  saveDemoData(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      errorTracking.captureException(error, { function: 'saveDemoData' });
      return false;
    }
  }

  // Get user profile
  getUserProfile() {
    const data = this.getDemoData();
    return data?.user || null;
  }

  // Update user profile
  updateUserProfile(updates) {
    const data = this.getDemoData();
    if (data) {
      data.user = { ...data.user, ...updates };
      data.user.updatedAt = new Date().toISOString();
      this.saveDemoData(data);
      analytics.event('profile_updated', 'User', Object.keys(updates).join(','));
      return data.user;
    }
    return null;
  }

  // Nutrition methods
  getTodayNutrition() {
    const today = new Date().toISOString().split('T')[0];
    const data = this.getDemoData();
    
    if (!data?.nutrition?.dailyLogs?.[today]) {
      // Initialize today's log
      const todayLog = {
        date: today,
        meals: {
          breakfast: [],
          lunch: [],
          dinner: [],
          snack: []
        },
        totals: { calories: 0, protein: 0, carbs: 0, fats: 0 }
      };
      
      if (data) {
        data.nutrition.dailyLogs[today] = todayLog;
        this.saveDemoData(data);
      }
      
      return todayLog;
    }
    
    return data.nutrition.dailyLogs[today];
  }

  // Add food entry
  addFoodEntry(foodData) {
    const data = this.getDemoData();
    const today = new Date().toISOString().split('T')[0];
    
    if (data) {
      if (!data.nutrition.dailyLogs[today]) {
        data.nutrition.dailyLogs[today] = {
          date: today,
          meals: { breakfast: [], lunch: [], dinner: [], snack: [] },
          totals: { calories: 0, protein: 0, carbs: 0, fats: 0 }
        };
      }

      const entry = {
        id: 'food_' + Date.now(),
        ...foodData,
        timestamp: new Date().toISOString()
      };

      data.nutrition.dailyLogs[today].meals[foodData.meal_type].push(entry);
      
      // Update totals
      const totals = data.nutrition.dailyLogs[today].totals;
      totals.calories += foodData.calories || 0;
      totals.protein += foodData.protein || 0;
      totals.carbs += foodData.carbs || 0;
      totals.fats += foodData.fats || 0;

      this.saveDemoData(data);
      analytics.logFood(foodData.name, foodData.calories);
      
      return entry;
    }
    return null;
  }

  // Delete food entry
  deleteFoodEntry(entryId) {
    const data = this.getDemoData();
    const today = new Date().toISOString().split('T')[0];
    
    if (data?.nutrition?.dailyLogs?.[today]) {
      const todayLog = data.nutrition.dailyLogs[today];
      let deletedEntry = null;

      // Find and remove the entry
      Object.keys(todayLog.meals).forEach(mealType => {
        const mealIndex = todayLog.meals[mealType].findIndex(entry => entry.id === entryId);
        if (mealIndex !== -1) {
          deletedEntry = todayLog.meals[mealType][mealIndex];
          todayLog.meals[mealType].splice(mealIndex, 1);
        }
      });

      if (deletedEntry) {
        // Update totals
        const totals = todayLog.totals;
        totals.calories -= deletedEntry.calories || 0;
        totals.protein -= deletedEntry.protein || 0;
        totals.carbs -= deletedEntry.carbs || 0;
        totals.fats -= deletedEntry.fats || 0;

        this.saveDemoData(data);
        analytics.event('delete_food', 'Nutrition', deletedEntry.name);
        return true;
      }
    }
    return false;
  }

  // Workout methods
  addWorkout(workoutData) {
    const data = this.getDemoData();
    if (data) {
      const workout = {
        id: 'workout_' + Date.now(),
        ...workoutData,
        date: new Date().toISOString(),
        completed: true
      };

      data.workouts.history.unshift(workout);
      data.workouts.totalWorkouts += 1;
      
      // Update streak
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
      const lastWorkout = data.workouts.history[1]; // Second item (first is current)
      
      if (lastWorkout && new Date(lastWorkout.date).toDateString() === yesterday) {
        data.workouts.currentStreak += 1;
      } else if (!lastWorkout || new Date(lastWorkout.date).toDateString() !== today) {
        data.workouts.currentStreak = 1;
      }

      // Update weekly stats
      data.dashboard.weeklyStats.workoutsCompleted += 1;
      data.dashboard.weeklyStats.caloriesBurned += workoutData.caloriesBurned || 0;
      
      this.saveDemoData(data);
      analytics.completeWorkout(workoutData.type, workoutData.duration);
      
      return workout;
    }
    return null;
  }

  // Get workout history
  getWorkoutHistory(limit = 10) {
    const data = this.getDemoData();
    return data?.workouts?.history?.slice(0, limit) || [];
  }

  // Dashboard methods
  getDashboardStats() {
    const data = this.getDemoData();
    const user = data?.user;
    const nutrition = this.getTodayNutrition();
    const workouts = data?.workouts;
    
    return {
      user: {
        name: user?.name || 'Demo User',
        streak: workouts?.currentStreak || 0,
        totalWorkouts: workouts?.totalWorkouts || 0
      },
      today: {
        calories: nutrition?.totals?.calories || 0,
        protein: nutrition?.totals?.protein || 0,
        workoutsCompleted: this.getTodayWorkoutCount()
      },
      targets: user?.profile || {
        targetCalories: 2000,
        targetProtein: 150,
        targetCarbs: 200,
        targetFats: 67
      },
      weekly: data?.dashboard?.weeklyStats || {
        workoutsCompleted: 0,
        caloriesBurned: 0,
        avgWorkoutDuration: 0
      }
    };
  }

  // Get today's workout count
  getTodayWorkoutCount() {
    const data = this.getDemoData();
    const today = new Date().toDateString();
    return data?.workouts?.history?.filter(workout => 
      new Date(workout.date).toDateString() === today
    ).length || 0;
  }

  // Clear all demo data (for testing)
  clearDemoData() {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.userKey);
    this.initializeDemoData();
    analytics.event('demo_data_cleared', 'User', 'reset');
  }

  // Export demo data (for backup)
  exportDemoData() {
    const data = this.getDemoData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai_fitness_demo_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    analytics.event('export_data', 'User', 'demo_backup');
  }
}

// Create singleton instance
const demoAccount = new DemoAccountService();

export default demoAccount;
