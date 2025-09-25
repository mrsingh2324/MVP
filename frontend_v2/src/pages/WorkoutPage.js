import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkout } from '../contexts/WorkoutContext';
import { useNavigate } from 'react-router-dom';
import { workoutService } from '../services/workoutService';

const WorkoutPage = () => {
  const { user } = useAuth();
  const { 
    availableExercises, 
    selectedExercise, 
    setSelectedExercise,
    exerciseData, 
    updateExerciseData,
    isWorkoutActive,
    startWorkoutSession,
    endWorkoutSession,
    resetExercise
  } = useWorkout();
  
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const processingIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const [cameraStatus, setCameraStatus] = useState('inactive');
  const [processingStatus, setProcessingStatus] = useState('inactive');
  const [processedImage, setProcessedImage] = useState(null);
  const [backendStatus, setBackendStatus] = useState('offline');
  const [error, setError] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    isMountedRef.current = true;
    checkBackendHealth();
    
    return () => {
      isMountedRef.current = false;
      stopCameraAndProcessing();
    };
  }, []);

  useEffect(() => {
    // Update session duration every second when workout is active
    let timer;
    if (isWorkoutActive && sessionStartTime) {
      timer = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isWorkoutActive, sessionStartTime]);

  const checkBackendHealth = async () => {
    try {
      const result = await workoutService.healthCheck();
      if (result.success) {
        setBackendStatus('online');
        setError(null);
      } else {
        setBackendStatus('offline');
        setError('Backend service is unavailable');
      }
    } catch (error) {
      setBackendStatus('offline');
      setError('Failed to connect to backend service');
    }
  };

  const canvasToBlob = (canvas, type = 'image/jpeg', quality = 0.8) => {
    return new Promise((resolve) => {
      if (!canvas || !canvas.toBlob) return resolve(null);
      canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  };

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !selectedExercise) return;

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      if (!video.videoWidth || !video.videoHeight) return;

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.8);
      if (!blob) return;

      setProcessingStatus('active');

      try {
        const result = await workoutService.analyzeFrame(selectedExercise, blob);

        if (!isMountedRef.current) return;

        if (result.success && result.data.success) {
          const data = result.data;
          
          // Update exercise data
          updateExerciseData({
            reps: data.reps || exerciseData.reps,
            stage: data.stage || exerciseData.stage,
            angle: data.angle || exerciseData.angle,
            calories: data.calories || exerciseData.calories
          });

          if (data.processed_image) {
            const img = data.processed_image.startsWith('data:') 
              ? data.processed_image 
              : `data:image/jpeg;base64,${data.processed_image}`;
            setProcessedImage(img);
          }

          setLastUpdate(new Date().toISOString());
          setError(null);
        } else {
          console.warn('Frame analysis failed:', result);
          setProcessingStatus('inactive');
        }
      } catch (err) {
        console.error('Frame processing error:', err);
        if (!isMountedRef.current) return;
        setProcessingStatus('error');
        setError('Frame processing failed');
      }
    } catch (err) {
      console.error('Frame capture error:', err);
      if (!isMountedRef.current) return;
      setProcessingStatus('error');
      setError('Frame capture failed');
    }
  }, [selectedExercise, exerciseData, updateExerciseData]);

  const handleCameraStart = useCallback(async () => {
    try {
      if (cameraStatus === 'active') return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        const onLoaded = () => {
          if (!canvasRef.current || !videoRef.current) return;
          canvasRef.current.width = videoRef.current.videoWidth || 640;
          canvasRef.current.height = videoRef.current.videoHeight || 480;

          if (selectedExercise && backendStatus === 'online') {
            if (processingIntervalRef.current) {
              clearInterval(processingIntervalRef.current);
              processingIntervalRef.current = null;
            }

            setIsProcessing(true);
            setProcessingStatus('active');
            processingIntervalRef.current = setInterval(() => {
              processFrame();
            }, 100); // 10 FPS
          }

          videoRef.current.removeEventListener('loadedmetadata', onLoaded);
        };

        videoRef.current.addEventListener('loadedmetadata', onLoaded);
        await videoRef.current.play();

        setCameraStatus('active');
        setError(null);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
    }
  }, [backendStatus, selectedExercise, processFrame, cameraStatus]);

  const stopCameraAndProcessing = useCallback(() => {
    try {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
        processingIntervalRef.current = null;
      }

      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks() || [];
        tracks.forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }

      if (streamRef.current) {
        const tracks = streamRef.current.getTracks() || [];
        tracks.forEach((t) => t.stop());
        streamRef.current = null;
      }

      setCameraStatus('inactive');
      setIsProcessing(false);
      setProcessingStatus('inactive');
      setProcessedImage(null);
    } catch (err) {
      console.error('Error stopping camera:', err);
    }
  }, []);

  const handleStartWorkout = async () => {
    if (!selectedExercise) {
      setError('Please select an exercise first');
      return;
    }

    try {
      const result = await startWorkoutSession(selectedExercise);
      if (result.success) {
        setSessionStartTime(Date.now());
        setError(null);
        
        // Start camera if not already active
        if (cameraStatus !== 'active') {
          await handleCameraStart();
        }
      } else {
        setError(result.error || 'Failed to start workout session');
      }
    } catch (error) {
      setError('Failed to start workout session');
    }
  };

  const handleEndWorkout = async () => {
    try {
      const result = await endWorkoutSession();
      if (result.success) {
        setSessionStartTime(null);
        setSessionDuration(0);
        stopCameraAndProcessing();
        
        // Navigate to dashboard with success message
        navigate('/dashboard', { 
          state: { 
            message: `Great workout! You completed ${exerciseData.reps} reps and burned approximately ${Math.round(exerciseData.calories)} calories.` 
          }
        });
      } else {
        setError(result.error || 'Failed to end workout session');
      }
    } catch (error) {
      setError('Failed to end workout session');
    }
  };

  const handleResetExercise = async () => {
    try {
      const result = await resetExercise();
      if (result.success) {
        setError(null);
      } else {
        setError(result.error || 'Failed to reset exercise');
      }
    } catch (error) {
      setError('Failed to reset exercise');
    }
  };

  const handleExerciseChange = async (exercise) => {
    stopCameraAndProcessing();
    setSelectedExercise(exercise);
    await handleResetExercise();
    
    if (isWorkoutActive) {
      await handleCameraStart();
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatExerciseName = (exercise) => {
    if (!exercise) return 'No Exercise Selected';
    return String(exercise).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getStageColor = (stage) => {
    switch (String(stage || '').toLowerCase()) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      case 'ready':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-white">AI Workout Session</h1>
              <p className="text-blue-200 mt-1">Real-time pose detection and rep counting</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                backendStatus === 'online' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  backendStatus === 'online' ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <span className="text-sm">{backendStatus === 'online' ? 'Connected' : 'Offline'}</span>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-white hover:text-blue-200 transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-200">⚠️ {error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Exercise Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">🎯 Select Exercise</h3>
              <div className="space-y-2">
                {availableExercises.map((exercise) => (
                  <button
                    key={exercise}
                    onClick={() => handleExerciseChange(exercise)}
                    disabled={backendStatus !== 'online'}
                    className={`w-full p-3 rounded-lg border transition-all ${
                      selectedExercise === exercise
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-white/30 bg-white/5 text-blue-200 hover:bg-white/10'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {formatExerciseName(exercise)}
                  </button>
                ))}
              </div>
            </div>

            {/* Workout Controls */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">🎮 Controls</h3>
              <div className="space-y-3">
                {!isWorkoutActive ? (
                  <button
                    onClick={handleStartWorkout}
                    disabled={!selectedExercise || backendStatus !== 'online'}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-green-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Start Workout
                  </button>
                ) : (
                  <button
                    onClick={handleEndWorkout}
                    className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-red-600 hover:to-pink-700 transition-all"
                  >
                    End Workout
                  </button>
                )}

                <button
                  onClick={cameraStatus === 'active' ? stopCameraAndProcessing : handleCameraStart}
                  disabled={backendStatus !== 'online'}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    cameraStatus === 'active'
                      ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30'
                      : 'bg-blue-500/20 text-blue-200 hover:bg-blue-500/30'
                  }`}
                >
                  {cameraStatus === 'active' ? '⏹️ Stop Camera' : '▶️ Start Camera'}
                </button>

                <button
                  onClick={handleResetExercise}
                  disabled={backendStatus !== 'online'}
                  className="w-full bg-white/20 text-white py-3 px-4 rounded-lg font-medium hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  🔄 Reset
                </button>
              </div>
            </div>
          </div>

          {/* Camera Feed */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">📹 Camera Feed</h3>
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                  cameraStatus === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    cameraStatus === 'active' ? 'bg-green-400' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-sm">{cameraStatus === 'active' ? 'Active' : 'Inactive'}</span>
                </div>
              </div>

              <div className="relative aspect-video bg-black/20 rounded-lg overflow-hidden border border-white/10">
                {processedImage ? (
                  <div className="relative w-full h-full">
                    <img
                      src={processedImage}
                      alt="Processed video feed with pose detection"
                      className="w-full h-full object-cover"
                    />
                    {isProcessing && (
                      <div className="absolute top-4 right-4 bg-green-500/80 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span>Processing</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <div className="text-6xl mb-4 opacity-50">📷</div>
                      <p className="text-white text-lg font-medium mb-2">
                        {cameraStatus === 'active' ? 'Initializing camera...' : 'Camera feed will appear here'}
                      </p>
                      <p className="text-blue-200">
                        {cameraStatus === 'active' ? 'Please wait while we set up your camera' : 'Click "Start Camera" to begin'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Hidden video and canvas elements */}
                <video
                  ref={videoRef}
                  style={{ display: 'none' }}
                  autoPlay
                  muted
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Exercise Stats */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">📊 Live Stats</h3>
              
              {/* Session Timer */}
              {isWorkoutActive && (
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-white mb-1">
                    {formatDuration(sessionDuration)}
                  </div>
                  <div className="text-blue-200 text-sm">Session Time</div>
                </div>
              )}

              {/* Primary Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">
                    {exerciseData?.reps || 0}
                  </div>
                  <div className="text-blue-200 text-sm">Reps</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">
                    {Math.round(exerciseData?.calories || 0)}
                  </div>
                  <div className="text-blue-200 text-sm">Calories</div>
                </div>
              </div>

              {/* Current Stage */}
              <div className="text-center mb-6">
                <div className={`text-lg font-semibold mb-1 ${getStageColor(exerciseData?.stage)}`}>
                  {(exerciseData?.stage || 'Ready').toUpperCase()}
                </div>
                <div className="text-blue-200 text-sm">Current Stage</div>
              </div>

              {/* Exercise Info */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex justify-between mb-2">
                  <span className="text-blue-200 text-sm">Exercise:</span>
                  <span className="text-white text-sm font-medium">
                    {formatExerciseName(selectedExercise)}
                  </span>
                </div>

                {exerciseData?.angle != null && (
                  <div className="flex justify-between">
                    <span className="text-blue-200 text-sm">Angle:</span>
                    <span className="text-white text-sm font-mono">
                      {typeof exerciseData.angle === 'number' 
                        ? `${exerciseData.angle.toFixed(1)}°` 
                        : exerciseData.angle}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Exercise Tips */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">💡 Tips</h3>
              <div className="text-blue-200 text-sm space-y-2">
                {String(selectedExercise || '').toLowerCase().includes('bicep') ? (
                  <>
                    <p>• Keep your upper arms stationary</p>
                    <p>• Fully extend your arms for "down" position</p>
                    <p>• Curl up completely for "up" position</p>
                    <p>• Control the movement, don't swing</p>
                  </>
                ) : String(selectedExercise || '').toLowerCase().includes('squat') ? (
                  <>
                    <p>• Keep your back straight</p>
                    <p>• Lower until thighs are parallel to ground</p>
                    <p>• Push through your heels to stand up</p>
                    <p>• Keep your knees aligned with your toes</p>
                  </>
                ) : String(selectedExercise || '').toLowerCase().includes('pushup') ? (
                  <>
                    <p>• Keep your body in a straight line</p>
                    <p>• Lower your chest to the ground</p>
                    <p>• Push up with control</p>
                    <p>• Don't let your hips sag</p>
                  </>
                ) : (
                  <>
                    <p>• Select an exercise to see specific tips</p>
                    <p>• Maintain proper form throughout</p>
                    <p>• Focus on controlled movements</p>
                    <p>• Stay within the camera frame</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WorkoutPage;
