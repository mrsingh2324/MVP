import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkout } from '../contexts/WorkoutContext';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../services/aiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { generateWorkoutPlanAI } from "../services/aiPlanGenerator";


const PlanCreation = () => {
  const { user } = useAuth();
  const { createWorkoutPlan, workoutHistory } = useWorkout();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); // 1: Goals, 2: Preferences, 3: AI Generation, 4: Review
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState(null);
  
  const [planData, setPlanData] = useState({
    name: '',
    duration_weeks: 8,
    sessions_per_week: 3,
    session_duration: 45,
    difficulty_level: user?.activity_level || 'beginner',
    primary_goal: user?.fitness_goal || '',
    focus_areas: [],
    equipment_available: [],
    time_slots: [],
    restrictions: []
  });

  const fitnessGoals = [
    { id: 'weight_loss', label: 'Weight Loss', icon: '⚖️', description: 'Burn calories and reduce body fat' },
    { id: 'muscle_gain', label: 'Muscle Building', icon: '💪', description: 'Increase muscle mass and strength' },
    { id: 'endurance', label: 'Cardiovascular Endurance', icon: '🏃', description: 'Improve heart health and stamina' },
    { id: 'strength', label: 'Strength Training', icon: '🏋️', description: 'Build functional strength' },
    { id: 'flexibility', label: 'Flexibility & Mobility', icon: '🧘', description: 'Increase range of motion' },
    { id: 'general_fitness', label: 'General Fitness', icon: '🎯', description: 'Overall health and wellness' }
  ];

  const focusAreas = [
    'Upper Body', 'Lower Body', 'Core', 'Full Body', 'Cardio', 'Flexibility', 'Balance', 'Functional Movement'
  ];

  const equipmentOptions = [
    'No Equipment (Bodyweight)', 'Dumbbells', 'Resistance Bands', 'Pull-up Bar', 'Yoga Mat', 
    'Kettlebells', 'Barbell', 'Gym Access', 'Treadmill', 'Stationary Bike'
  ];

  const timeSlots = [
    'Early Morning (5-7 AM)', 'Morning (7-9 AM)', 'Mid-Morning (9-11 AM)', 
    'Lunch Time (11 AM-1 PM)', 'Afternoon (1-4 PM)', 'Evening (4-7 PM)', 'Night (7-9 PM)'
  ];

  const restrictions = [
    'Knee Problems', 'Back Issues', 'Shoulder Injury', 'Limited Mobility', 
    'Heart Condition', 'High Blood Pressure', 'Pregnancy', 'Recent Surgery'
  ];

  const handleInputChange = (field, value) => {
    setPlanData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleArrayChange = (field, value, checked) => {
    setPlanData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const validateStep = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        if (!planData.primary_goal) {
          setError('Please select your primary fitness goal');
          return false;
        }
        if (!planData.name.trim()) {
          setError('Please enter a plan name');
          return false;
        }
        break;
      case 2:
        if (planData.focus_areas.length === 0) {
          setError('Please select at least one focus area');
          return false;
        }
        if (planData.equipment_available.length === 0) {
          setError('Please select available equipment');
          return false;
        }
        break;
      default:
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
      setError('');
    }
  };

  const handlePrevious = () => {
    setStep(prev => prev - 1);
    setError('');
  };

  const generateAIPlan = async () => {
    setLoading(true);
    setError('');
  
    try {
      const userProfileForAI = {
        ...user,
        workout_history: workoutHistory.slice(0, 10), // Last 10 workouts
        plan_preferences: planData,
      };
  
      const result = await generateWorkoutPlanAI(userProfileForAI); // ✅ Use new service
  
      if (result.success) {
        setGeneratedPlan(result.plan);
        // Stay on Step 3 for preview
        // setStep(4); // remove this line to show result immediately on Step 3
      } else {
        setError(result.error || 'Failed to generate workout plan. Please try again.');
      }
    } catch (error) {
      console.error('AI plan generation error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreatePlan = async () => {
    if (!generatedPlan) {
      setError('No plan to create');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const planToCreate = {
        ...planData,
        ai_generated: true,
        exercises: generatedPlan.exercises || [],
        weekly_schedule: generatedPlan.weekly_schedule || {},
        progression: generatedPlan.progression || {},
        nutrition_tips: generatedPlan.nutrition_tips || [],
        created_at: new Date().toISOString()
      };

      const result = await createWorkoutPlan(planToCreate);
      
      if (result.success) {
        navigate('/dashboard', { 
          state: { 
            message: `🎉 Your personalized workout plan "${planData.name}" has been created successfully!` 
          }
        });
      } else {
        setError(result.error || 'Failed to create workout plan');
      }
    } catch (error) {
      setError('Failed to create workout plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && step === 3) {
    return <LoadingSpinner message="AI is creating your personalized workout plan..." />;
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Fitness Goals</h2>
        <p className="text-blue-200">What do you want to achieve?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Plan Name *
        </label>
        <input
          type="text"
          value={planData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="My Fitness Journey"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Primary Goal *
        </label>
        <div className="grid grid-cols-1 gap-3">
          {fitnessGoals.map((goal) => (
            <label
              key={goal.id}
              className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                planData.primary_goal === goal.id
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/30 bg-white/10 hover:bg-white/20'
              }`}
            >
              <input
                type="radio"
                name="primary_goal"
                value={goal.id}
                checked={planData.primary_goal === goal.id}
                onChange={(e) => handleInputChange('primary_goal', e.target.value)}
                className="sr-only"
              />
              <span className="text-2xl">{goal.icon}</span>
              <div>
                <div className="text-white font-medium">{goal.label}</div>
                <div className="text-blue-200 text-sm">{goal.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Duration (weeks)
          </label>
          <select
            value={planData.duration_weeks}
            onChange={(e) => handleInputChange('duration_weeks', parseInt(e.target.value))}
            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={4}>4 weeks</option>
            <option value={8}>8 weeks</option>
            <option value={12}>12 weeks</option>
            <option value={16}>16 weeks</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Sessions/Week
          </label>
          <select
            value={planData.sessions_per_week}
            onChange={(e) => handleInputChange('sessions_per_week', parseInt(e.target.value))}
            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={2}>2 sessions</option>
            <option value={3}>3 sessions</option>
            <option value={4}>4 sessions</option>
            <option value={5}>5 sessions</option>
            <option value={6}>6 sessions</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Session Length (min)
          </label>
          <select
            value={planData.session_duration}
            onChange={(e) => handleInputChange('session_duration', parseInt(e.target.value))}
            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Preferences & Equipment</h2>
        <p className="text-blue-200">Customize your workout experience</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Focus Areas * (Select all that apply)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {focusAreas.map((area) => (
            <label key={area} className="flex items-center space-x-2 text-white">
              <input
                type="checkbox"
                checked={planData.focus_areas.includes(area)}
                onChange={(e) => handleArrayChange('focus_areas', area, e.target.checked)}
                className="rounded border-white/30 bg-white/20 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">{area}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Available Equipment * (Select all that apply)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {equipmentOptions.map((equipment) => (
            <label key={equipment} className="flex items-center space-x-2 text-white">
              <input
                type="checkbox"
                checked={planData.equipment_available.includes(equipment)}
                onChange={(e) => handleArrayChange('equipment_available', equipment, e.target.checked)}
                className="rounded border-white/30 bg-white/20 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">{equipment}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Preferred Time Slots (Optional)
        </label>
        <div className="grid grid-cols-1 gap-2">
          {timeSlots.map((slot) => (
            <label key={slot} className="flex items-center space-x-2 text-white">
              <input
                type="checkbox"
                checked={planData.time_slots.includes(slot)}
                onChange={(e) => handleArrayChange('time_slots', slot, e.target.checked)}
                className="rounded border-white/30 bg-white/20 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">{slot}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Physical Restrictions (Optional)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {restrictions.map((restriction) => (
            <label key={restriction} className="flex items-center space-x-2 text-white">
              <input
                type="checkbox"
                checked={planData.restrictions.includes(restriction)}
                onChange={(e) => handleArrayChange('restrictions', restriction, e.target.checked)}
                className="rounded border-white/30 bg-white/20 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">{restriction}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">AI Plan Generation</h2>
        <p className="text-blue-200">Ready to create your personalized workout plan?</p>
      </div>

      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-6 border border-blue-500/30">
        <h3 className="text-white font-bold text-lg mb-4">🤖 Your AI Fitness Coach Will Create:</h3>
        <ul className="text-blue-200 space-y-2">
          <li>• Personalized exercise selection based on your goals</li>
          <li>• Progressive difficulty increases over {planData.duration_weeks} weeks</li>
          <li>• {planData.sessions_per_week} workouts per week, {planData.session_duration} minutes each</li>
          <li>• Equipment-specific exercises for your available gear</li>
          <li>• Modifications for any physical restrictions</li>
          <li>• Nutrition tips aligned with your fitness goals</li>
          <li>• Weekly progress milestones and assessments</li>
        </ul>
      </div>

      <div className="bg-white/10 rounded-lg p-4 border border-white/20">
        <h4 className="text-white font-medium mb-2">Plan Summary:</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-200">Goal:</span>
            <span className="text-white ml-2">{fitnessGoals.find(g => g.id === planData.primary_goal)?.label}</span>
          </div>
          <div>
            <span className="text-blue-200">Duration:</span>
            <span className="text-white ml-2">{planData.duration_weeks} weeks</span>
          </div>
          <div>
            <span className="text-blue-200">Frequency:</span>
            <span className="text-white ml-2">{planData.sessions_per_week}x per week</span>
          </div>
          <div>
            <span className="text-blue-200">Session Length:</span>
            <span className="text-white ml-2">{planData.session_duration} minutes</span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={generateAIPlan}
          disabled={loading}
          className="bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 px-8 rounded-lg font-bold text-lg hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Generating Plan...
            </div>
          ) : (
            '🚀 Generate My AI Workout Plan'
          )}
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">🎉 Your Personalized Plan</h2>
        <p className="text-blue-200">Review and activate your AI-generated workout plan</p>
      </div>

      {generatedPlan && (
  <div className="mt-6 bg-white/10 rounded-lg p-4 border border-white/20">
    <h4 className="text-white font-bold mb-2">Preview AI Generated Plan</h4>
    <p className="text-blue-200 mb-2">{generatedPlan.description}</p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
      <div>
        <strong>Exercises:</strong>
        <ul className="text-blue-200 text-sm mt-1">
          {generatedPlan.exercises.length > 0 ? (
            generatedPlan.exercises.map((ex, i) => (
              <li key={i}>
                {ex.name} - {ex.sets} sets x {ex.reps} reps ({ex.duration_min} min)
              </li>
            ))
          ) : (
            <li>No exercises generated yet</li>
          )}
        </ul>
      </div>

      <div>
        <strong>Weekly Schedule:</strong>
        <ul className="text-blue-200 text-sm mt-1">
          {Object.entries(generatedPlan.weekly_schedule).map(([day, val]) => (
            <li key={day}>
              {day.charAt(0).toUpperCase() + day.slice(1)}: {val}
            </li>
          ))}
        </ul>
      </div>
    </div>

    {generatedPlan.nutrition_tips?.length > 0 && (
      <div>
        <strong>Nutrition Tips:</strong>
        <ul className="text-blue-200 text-sm mt-1">
          {generatedPlan.nutrition_tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}


      <div className="text-center">
        <button
          onClick={handleCreatePlan}
          disabled={loading}
          className="bg-gradient-to-r from-green-500 to-blue-600 text-white py-4 px-8 rounded-lg font-bold text-lg hover:from-green-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Creating Plan...
            </div>
          ) : (
            '✅ Activate This Plan'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Create AI Workout Plan</h1>
              <p className="text-blue-200 mt-1">Let AI design your perfect fitness journey</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-white hover:text-blue-200 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white text-sm">Step {step} of 4</span>
            <span className="text-blue-200 text-sm">{Math.round((step / 4) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 4 && (
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={step === 1}
                className="px-6 py-3 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Previous
              </button>

              {step < 3 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Next
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PlanCreation;
