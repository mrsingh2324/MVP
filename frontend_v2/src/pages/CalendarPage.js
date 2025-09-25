import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkout } from '../contexts/WorkoutContext';
import { useNavigate } from 'react-router-dom';

const CalendarPage = () => {
  const { user } = useAuth();
  const { workoutHistory } = useWorkout();
  const navigate = useNavigate();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Pre-process workouts by date with useMemo
  const workoutsByDate = useMemo(() => {
    const map = {};
    workoutHistory.forEach(session => {
      if (!session.start_time) return;
      const dateKey = new Date(session.start_time).toISOString().split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(session);
    });
    return map;
  }, [workoutHistory]);

  // Monthly stats memoized
  const monthlyStats = useMemo(() => {
    let totalWorkouts = 0, totalReps = 0, totalCalories = 0;
    const activeDaysSet = new Set();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    workoutHistory.forEach(session => {
      if (!session.start_time) return;
      const d = new Date(session.start_time);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        totalWorkouts++;
        totalReps += session.total_reps || 0;
        totalCalories += session.calories_estimate || 0;
        activeDaysSet.add(d.toISOString().split('T')[0]);
      }
    });

    return {
      totalWorkouts,
      totalReps,
      totalCalories: Math.round(totalCalories),
      activeDays: activeDaysSet.size,
    };
  }, [workoutHistory, currentDate]);

  // Calculate streaks memoized
  const currentStreak = useMemo(() => {
    let streak = 0;
    let date = new Date();
    for (let i = 0; i < 365; i++) {
      const key = date.toISOString().split('T')[0];
      if (workoutsByDate[key] && workoutsByDate[key].length > 0) streak++;
      else if (streak > 0) break;
      date.setDate(date.getDate() - 1);
    }
    return streak;
  }, [workoutsByDate]);

  const getDaysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [currentDate]);

  const formatDate = (date) => date.toISOString().split('T')[0];

  const handlePreviousMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };
  const handleDateClick = (date) => setSelectedDate(date);

  const selectedDateWorkouts = useMemo(() => {
    if (!selectedDate) return [];
    const key = formatDate(selectedDate);
    return workoutsByDate[key] || [];
  }, [selectedDate, workoutsByDate]);

  const getWorkoutIntensity = (date) => {
    const workouts = workoutsByDate[formatDate(date)] || [];
    const totalReps = workouts.reduce((sum, w) => sum + (w.total_reps || 0), 0);
    if (totalReps >= 50) return 3;
    if (totalReps >= 20) return 2;
    return 1;
  };

  const isToday = (date) => date.toDateString() === new Date().toDateString();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Workout Calendar</h1>
        <button onClick={() => navigate('/dashboard')} className="text-white hover:text-blue-200">← Dashboard</button>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Monthly Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Workouts This Month', value: monthlyStats.totalWorkouts },
            { label: 'Active Days', value: monthlyStats.activeDays },
            { label: 'Total Reps', value: monthlyStats.totalReps },
            { label: 'Current Streak', value: `${currentStreak}${currentStreak >= 7 ? '🔥' : currentStreak >= 3 ? '⚡' : '💪'}` },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white/10 rounded-xl p-4 text-center border border-white/20">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-blue-200 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white/10 rounded-2xl p-6 border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <button onClick={handlePreviousMonth} className="p-2 text-white hover:bg-white/20 rounded-lg">←</button>
              <h2 className="text-xl font-bold text-white">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
              <button onClick={handleNextMonth} className="p-2 text-white hover:bg-white/20 rounded-lg">→</button>
            </div>
            <button onClick={handleToday} className="bg-blue-500/20 text-blue-200 px-4 py-2 rounded-lg mb-4 hover:bg-blue-500/30">Today</button>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center text-blue-200 font-medium">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth.map((day, idx) => (
                <div key={idx} className="aspect-square">
                  {day ? (
                    <button
                      onClick={() => handleDateClick(day)}
                      className={`w-full h-full p-1 rounded-lg border transition-all relative ${
                        isToday(day)
                          ? 'border-yellow-400 bg-yellow-400/20 text-yellow-200'
                          : selectedDate && formatDate(day) === formatDate(selectedDate)
                          ? 'border-blue-400 bg-blue-400/20 text-blue-200'
                          : workoutsByDate[formatDate(day)]
                          ? 'border-green-400/50 bg-green-400/10 text-white hover:bg-green-400/20'
                          : 'border-white/20 text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="text-sm font-medium">{day.getDate()}</div>
                      {workoutsByDate[formatDate(day)] && (
                        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                          <div className={`w-2 h-2 rounded-full ${
                            getWorkoutIntensity(day) === 3 ? 'bg-red-400' :
                            getWorkoutIntensity(day) === 2 ? 'bg-yellow-400' :
                            'bg-green-400'
                          }`}></div>
                        </div>
                      )}
                    </button>
                  ) : <div className="w-full h-full"></div>}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Date */}
          <div className="lg:col-span-1 bg-white/10 rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">
              {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }) : '📅 Select a Date'}
            </h3>

            {selectedDateWorkouts.length > 0 ? (
              <div className="space-y-4">
                {selectedDateWorkouts.map((w, idx) => (
                  <div key={idx} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between mb-2">
                      <h4 className="text-white font-medium">{w.exercises_performed ? Object.keys(w.exercises_performed)[0] : 'Workout'}</h4>
                      <span className="text-blue-200 text-sm">{new Date(w.start_time).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>Reps: <span className="text-white ml-1">{w.total_reps || 0}</span></div>
                      <div>Calories: <span className="text-white ml-1">{Math.round(w.calories_estimate || 0)}</span></div>
                      <div>Duration: <span className="text-white ml-1">{w.duration_minutes || 0} min</span></div>
                      <div>Status: <span className="text-green-300 ml-1">Completed</span></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-blue-200">
                <div className="text-4xl mb-4 opacity-50">{isToday(selectedDate) ? '💤' : '📅'}</div>
                <p>No workouts on this day</p>
                {isToday(selectedDate) && (
                  <button onClick={() => navigate('/workout')} className="mt-4 bg-gradient-to-r from-green-500 to-blue-600 text-white px-4 py-2 rounded-lg">Start Today's Workout</button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CalendarPage;
