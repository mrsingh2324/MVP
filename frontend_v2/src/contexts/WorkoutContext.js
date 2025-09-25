import React, { createContext, useContext, useState, useEffect } from 'react';
import { workoutService } from '../services/workoutService';
import { useAuth } from './AuthContext';

const WorkoutContext = createContext();

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
};

export const WorkoutProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentSession, setCurrentSession] = useState(null);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [exerciseData, setExerciseData] = useState({
    reps: 0,
    stage: 'ready',
    angle: null,
    calories: 0
  });
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [availableExercises, setAvailableExercises] = useState([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadWorkoutData();
      loadAvailableExercises();
    }
  }, [isAuthenticated, user]);

  const loadWorkoutData = async () => {
    try {
      const [historyResult, plansResult] = await Promise.all([
        workoutService.getWorkoutHistory(),
        workoutService.getWorkoutPlans()
      ]);

      if (historyResult.success) {
        setWorkoutHistory(historyResult.sessions || []);
      }

      if (plansResult.success) {
        setWorkoutPlans(plansResult.plans || []);
        // Set current plan if exists
        const activePlan = plansResult.plans?.find(plan => plan.is_active);
        if (activePlan) {
          setCurrentPlan(activePlan);
        }
      }
    } catch (error) {
      console.error('Failed to load workout data:', error);
    }
  };

  const loadAvailableExercises = async () => {
    try {
      const result = await workoutService.getAvailableExercises();
      if (result.success) {
        setAvailableExercises(result.exercises || []);
        if (result.exercises?.length > 0 && !selectedExercise) {
          setSelectedExercise(result.exercises[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load exercises:', error);
    }
  };

  const startWorkoutSession = async (exerciseType, planId = null) => {
    try {
      const result = await workoutService.startSession(exerciseType, planId);
      if (result.success) {
        setCurrentSession(result.session);
        setIsWorkoutActive(true);
        setSelectedExercise(exerciseType);
        setExerciseData({ reps: 0, stage: 'ready', angle: null, calories: 0 });
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Failed to start workout session:', error);
      return { success: false, error: 'Failed to start workout session' };
    }
  };

  const endWorkoutSession = async () => {
    try {
      if (!currentSession) {
        return { success: false, error: 'No active session' };
      }

      const result = await workoutService.endSession(currentSession.session_id, {
        total_reps: exerciseData.reps,
        calories_burned: exerciseData.calories,
        exercises_performed: {
          [selectedExercise]: {
            reps: exerciseData.reps,
            calories: exerciseData.calories
          }
        }
      });

      if (result.success) {
        setCurrentSession(null);
        setIsWorkoutActive(false);
        setExerciseData({ reps: 0, stage: 'ready', angle: null, calories: 0 });
        
        // Reload workout history
        await loadWorkoutData();
        
        return { success: true, session: result.session };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Failed to end workout session:', error);
      return { success: false, error: 'Failed to end workout session' };
    }
  };

  const updateExerciseData = (newData) => {
    setExerciseData(prev => ({
      ...prev,
      ...newData
    }));
  };

  const resetExercise = async () => {
    try {
      if (selectedExercise) {
        const result = await workoutService.resetExercise(selectedExercise);
        if (result.success) {
          setExerciseData({ reps: 0, stage: 'ready', angle: null, calories: 0 });
          return { success: true };
        }
      }
      return { success: false, error: 'Failed to reset exercise' };
    } catch (error) {
      console.error('Failed to reset exercise:', error);
      return { success: false, error: 'Failed to reset exercise' };
    }
  };

  const createWorkoutPlan = async (planData) => {
    try {
      const result = await workoutService.createPlan(planData);
      if (result.success) {
        await loadWorkoutData(); // Reload plans
        return { success: true, plan: result.plan };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Failed to create workout plan:', error);
      return { success: false, error: 'Failed to create workout plan' };
    }
  };

  const activateWorkoutPlan = async (planId) => {
    try {
      const result = await workoutService.activatePlan(planId);
      if (result.success) {
        await loadWorkoutData(); // Reload plans
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Failed to activate workout plan:', error);
      return { success: false, error: 'Failed to activate workout plan' };
    }
  };

  const value = {
    // State
    currentSession,
    workoutHistory,
    workoutPlans,
    currentPlan,
    exerciseData,
    isWorkoutActive,
    selectedExercise,
    availableExercises,

    // Actions
    startWorkoutSession,
    endWorkoutSession,
    updateExerciseData,
    resetExercise,
    createWorkoutPlan,
    activateWorkoutPlan,
    setSelectedExercise,
    loadWorkoutData,
    loadAvailableExercises
  };

  return (
    <WorkoutContext.Provider value={value}>
      {children}
    </WorkoutContext.Provider>
  );
};
