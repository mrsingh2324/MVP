import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

const ProfileSetup = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    age: user?.age || '',
    gender: user?.gender || '',
    weight: user?.weight || '',
    height: user?.height || '',
    fitness_goal: user?.fitness_goal || '',
    activity_level: user?.activity_level || 'beginner',
    medical_conditions: user?.medical_conditions || [],
    dietary_preferences: user?.dietary_preferences || []
  });

  const fitnessGoals = [
    { id: 'weight_loss', label: 'Weight Loss', icon: '⚖️', description: 'Burn calories and lose weight' },
    { id: 'muscle_gain', label: 'Muscle Gain', icon: '💪', description: 'Build strength and muscle mass' },
    { id: 'endurance', label: 'Endurance', icon: '🏃', description: 'Improve cardiovascular fitness' },
    { id: 'flexibility', label: 'Flexibility', icon: '🧘', description: 'Increase mobility and flexibility' },
    { id: 'general_fitness', label: 'General Fitness', icon: '🎯', description: 'Overall health and wellness' },
    { id: 'strength', label: 'Strength', icon: '🏋️', description: 'Build functional strength' }
  ];

  const activityLevels = [
    { id: 'beginner', label: 'Beginner', description: 'New to fitness or returning after a break' },
    { id: 'intermediate', label: 'Intermediate', description: 'Regular exercise 2-3 times per week' },
    { id: 'advanced', label: 'Advanced', description: 'Consistent training 4+ times per week' },
    { id: 'athlete', label: 'Athlete', label: 'Professional or competitive athlete level' }
  ];

  const medicalConditions = [
    'None',
    'Heart Disease',
    'Diabetes',
    'High Blood Pressure',
    'Arthritis',
    'Back Problems',
    'Knee Problems',
    'Other Joint Issues',
    'Asthma',
    'Other'
  ];

  const dietaryPreferences = [
    'None',
    'Vegetarian',
    'Vegan',
    'Keto',
    'Paleo',
    'Mediterranean',
    'Low Carb',
    'High Protein',
    'Gluten Free',
    'Dairy Free'
  ];

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleArrayChange = (field, value, checked) => {
    setProfileData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!profileData.name.trim()) {
          setError('Please enter your name');
          return false;
        }
        if (!profileData.age || profileData.age < 13 || profileData.age > 100) {
          setError('Please enter a valid age (13-100)');
          return false;
        }
        if (!profileData.gender) {
          setError('Please select your gender');
          return false;
        }
        break;
      case 2:
        if (!profileData.weight || profileData.weight < 30 || profileData.weight > 300) {
          setError('Please enter a valid weight (30-300 kg)');
          return false;
        }
        if (!profileData.height || profileData.height < 100 || profileData.height > 250) {
          setError('Please enter a valid height (100-250 cm)');
          return false;
        }
        break;
      case 3:
        if (!profileData.fitness_goal) {
          setError('Please select your fitness goal');
          return false;
        }
        if (!profileData.activity_level) {
          setError('Please select your activity level');
          return false;
        }
        break;
      default:
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      setError('');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError('');

    try {
      const result = await updateProfile(profileData);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Setting up your profile..." />;
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Personal Information</h2>
        <p className="text-blue-200">Let's get to know you better</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Full Name *
        </label>
        <input
          type="text"
          value={profileData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your full name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Age *
          </label>
          <input
            type="number"
            min="13"
            max="100"
            value={profileData.age}
            onChange={(e) => handleInputChange('age', parseInt(e.target.value))}
            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="25"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Gender *
          </label>
          <select
            value={profileData.gender}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Body Measurements</h2>
        <p className="text-blue-200">Help us personalize your workouts</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Weight (kg) *
          </label>
          <input
            type="number"
            min="30"
            max="300"
            step="0.1"
            value={profileData.weight}
            onChange={(e) => handleInputChange('weight', parseFloat(e.target.value))}
            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="70.0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Height (cm) *
          </label>
          <input
            type="number"
            min="100"
            max="250"
            value={profileData.height}
            onChange={(e) => handleInputChange('height', parseInt(e.target.value))}
            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="175"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Medical Conditions (Select all that apply)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {medicalConditions.map((condition) => (
            <label key={condition} className="flex items-center space-x-2 text-white">
              <input
                type="checkbox"
                checked={profileData.medical_conditions.includes(condition)}
                onChange={(e) => handleArrayChange('medical_conditions', condition, e.target.checked)}
                className="rounded border-white/30 bg-white/20 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">{condition}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Fitness Goals</h2>
        <p className="text-blue-200">What do you want to achieve?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Primary Fitness Goal *
        </label>
        <div className="grid grid-cols-1 gap-3">
          {fitnessGoals.map((goal) => (
            <label
              key={goal.id}
              className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                profileData.fitness_goal === goal.id
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/30 bg-white/10 hover:bg-white/20'
              }`}
            >
              <input
                type="radio"
                name="fitness_goal"
                value={goal.id}
                checked={profileData.fitness_goal === goal.id}
                onChange={(e) => handleInputChange('fitness_goal', e.target.value)}
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

      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Activity Level *
        </label>
        <div className="space-y-2">
          {activityLevels.map((level) => (
            <label
              key={level.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                profileData.activity_level === level.id
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/30 bg-white/10 hover:bg-white/20'
              }`}
            >
              <input
                type="radio"
                name="activity_level"
                value={level.id}
                checked={profileData.activity_level === level.id}
                onChange={(e) => handleInputChange('activity_level', e.target.value)}
                className="sr-only"
              />
              <div>
                <div className="text-white font-medium">{level.label}</div>
                <div className="text-blue-200 text-sm">{level.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Preferences</h2>
        <p className="text-blue-200">Optional dietary preferences</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Dietary Preferences (Optional)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {dietaryPreferences.map((preference) => (
            <label key={preference} className="flex items-center space-x-2 text-white">
              <input
                type="checkbox"
                checked={profileData.dietary_preferences.includes(preference)}
                onChange={(e) => handleArrayChange('dietary_preferences', preference, e.target.checked)}
                className="rounded border-white/30 bg-white/20 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">{preference}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-white font-medium mb-2">🎉 Almost Done!</h3>
        <p className="text-blue-200 text-sm">
          Your AI fitness trainer will use this information to create personalized workout plans and nutrition recommendations just for you.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 px-4">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white text-sm">Step {currentStep} of 4</span>
            <span className="text-blue-200 text-sm">{Math.round((currentStep / 4) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Previous
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? 'Creating Profile...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
