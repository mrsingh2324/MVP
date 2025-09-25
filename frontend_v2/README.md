# 🎯 Exercise Detection Frontend v2.0

Modern React frontend for the AI-powered exercise detection system. Built with React 18, Tailwind CSS, and integrates seamlessly with the FastAPI backend.

## 🚀 Features

- **🏋️ Multi-Exercise Support**: Bicep curls and squats with all variations
- **📹 Real-time Camera Feed**: Live video processing with pose detection
- **📊 Live Statistics**: Real-time rep counting and exercise stage tracking
- **🎨 Modern UI**: Beautiful glass-morphism design with smooth animations
- **📱 Responsive Design**: Works on desktop, tablet, and mobile devices
- **⚡ Fast Performance**: Optimized React components with efficient rendering
- **🔄 Real-time Updates**: Live exercise data updates every 200ms
- **🎯 Exercise Selection**: Easy switching between different exercise types

## 📁 Project Structure

```
frontend_v2/
├── public/
│   └── index.html              # Main HTML template
├── src/
│   ├── components/
│   │   ├── ExerciseSelector.js # Exercise type selection component
│   │   ├── CameraFeed.js       # Camera control and video display
│   │   ├── ExerciseStats.js    # Real-time statistics display
│   │   └── SystemStatus.js     # System health monitoring
│   ├── App.js                  # Main application component
│   ├── App.css                 # Custom styles and animations
│   ├── index.js                # React entry point
│   └── index.css               # Global styles and CSS reset
├── package.json                # Dependencies and scripts
├── tailwind.config.js          # Tailwind CSS configuration
└── README.md                   # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- FastAPI backend running on `http://localhost:8000`

### Install Dependencies
```bash
cd frontend_v2
npm install
```

### Install Tailwind CSS
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Start Development Server
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## 🎮 Usage

### 1. **Exercise Selection**
- Choose from available exercises (bicep curls, squats)
- Select specific variations (left, right, both limbs)
- Exercise selection automatically resets counters

### 2. **Camera Control**
- Click "Start Camera" to activate webcam
- Grant camera permissions when prompted
- Camera feed shows real-time pose detection

### 3. **Real-time Analysis**
- Perform selected exercise in camera view
- Watch live rep counting and stage tracking
- View detailed statistics for each limb

### 4. **System Monitoring**
- Monitor backend connection status
- Check camera and processing status
- View system health indicators

## 🎨 UI Components

### **ExerciseSelector**
- Grid layout of available exercises
- Color-coded exercise types
- Visual feedback for selection
- Disabled state when backend offline

### **CameraFeed** 
- Camera control buttons (Start/Stop/Reset)
- Live video feed with pose overlay
- Processing status indicators
- Camera tips and instructions

### **ExerciseStats**
- Main rep counter and stage display
- Detailed breakdown for multi-limb exercises
- Color-coded statistics (yellow=left, pink=right, etc.)
- Exercise-specific tips and guidance

### **SystemStatus**
- Backend API connection status
- Camera feed status
- AI processing status
- Connection quality indicators

## 🔧 Configuration

### **API Configuration**
```javascript
// src/App.js
const API_BASE_URL = 'http://localhost:8000';
```

### **Processing Interval**
```javascript
// Frame processing frequency (milliseconds)
processingIntervalRef.current = setInterval(processFrame, 200);
```

### **Camera Settings**
```javascript
// Camera resolution preferences
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: 'user'
  }
});
```

## 🎯 Supported Exercises

### **Bicep Curls** 💪
- `bicep_curl_left` - Left arm tracking
- `bicep_curl_right` - Right arm tracking  
- `bicep_curl_both` - Both arms simultaneously
- `bicep_curl` - Default (left arm)

### **Squats** 🦵
- `squat_left` - Left leg tracking
- `squat_right` - Right leg tracking
- `squat_both` - Both legs simultaneously  
- `squat` - Default (both legs)

## 🔄 API Integration

### **Exercise Analysis**
```javascript
// Analyze frame for exercise detection
const response = await axios.post(
  `${API_BASE_URL}/api/exercise/analyze/${selectedExercise}`,
  formData,
  { headers: { 'Content-Type': 'multipart/form-data' } }
);
```

### **Exercise Reset**
```javascript
// Reset exercise counters
const response = await axios.post(
  `${API_BASE_URL}/api/exercise/reset/${selectedExercise}`
);
```

### **Health Check**
```javascript
// Check backend health
const response = await axios.get(`${API_BASE_URL}/health`);
```

## 🎨 Styling & Theming

### **Color Scheme**
- **Background**: Gradient from indigo to purple to pink
- **Glass Morphism**: Semi-transparent cards with backdrop blur
- **Exercise Colors**: 
  - Bicep Curls: Yellow/Orange gradients
  - Squats: Blue/Green gradients
  - Left Limb: Yellow/Cyan
  - Right Limb: Pink/Orange

### **Animations**
- Fade-in animations for components
- Pulse effects for active states
- Smooth hover transitions
- Loading spinners for processing states

### **Responsive Design**
- Mobile-first approach
- Flexible grid layouts
- Touch-friendly buttons
- Optimized for all screen sizes

## 🚀 Performance Optimizations

### **React Optimizations**
- `useCallback` for event handlers
- `useRef` for DOM references
- Efficient re-rendering with proper dependencies
- Component memoization where appropriate

### **Network Optimizations**
- Image compression for frame uploads
- Request timeouts to prevent hanging
- Error handling and retry logic
- Efficient polling intervals

### **Memory Management**
- Proper cleanup of intervals
- Camera stream cleanup on unmount
- Canvas memory management
- Event listener cleanup

## 🧪 Testing

### **Manual Testing**
```bash
# Start backend first
cd ../backend_v2
python3 app.py

# Start frontend
cd ../frontend_v2
npm start
```

### **Test Scenarios**
1. **Backend Connection**: Verify status indicators
2. **Exercise Selection**: Test all exercise types
3. **Camera Feed**: Test start/stop/reset functionality
4. **Real-time Processing**: Verify live rep counting
5. **Error Handling**: Test offline scenarios

## 📱 Mobile Support

### **Responsive Features**
- Touch-optimized buttons
- Mobile camera access
- Responsive grid layouts
- Optimized for portrait/landscape

### **Mobile Considerations**
- Camera permissions handling
- Battery usage optimization
- Network usage awareness
- Touch gesture support

## 🔮 Future Enhancements

### **Planned Features**
- [ ] **Workout Sessions**: Save and track workout history
- [ ] **User Profiles**: Personal progress tracking
- [ ] **Exercise Library**: More exercise types (push-ups, lunges)
- [ ] **Form Analysis**: Real-time form scoring and feedback
- [ ] **Social Features**: Share workouts and compete
- [ ] **Offline Mode**: Local processing capabilities

### **Technical Improvements**
- [ ] **WebSocket Integration**: Real-time streaming
- [ ] **PWA Support**: Installable web app
- [ ] **Voice Commands**: Hands-free control
- [ ] **AR Overlays**: Augmented reality guidance
- [ ] **Performance Analytics**: Detailed metrics dashboard

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-component`)
3. Follow React best practices and component patterns
4. Add proper TypeScript types (future enhancement)
5. Test on multiple devices and browsers
6. Submit pull request with detailed description

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ using React 18, Tailwind CSS, and modern web technologies.**
