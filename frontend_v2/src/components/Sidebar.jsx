import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Dumbbell, 
  Utensils, 
  User, 
  LogOut,
  Activity,
  Moon,
  Sun,
  Brain,
  Menu,
  X,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/badge';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from './ui/use-toast';
import analytics from '../services/analytics';
import errorTracking from '../services/errorTracking';

const Sidebar = ({ isOpen, onClose, user, onLogout, theme, toggleTheme }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const menuItems = [
    { 
      icon: Home, 
      label: 'Dashboard', 
      path: '/dashboard',
      description: 'Overview & Stats'
    },
    { 
      icon: Dumbbell, 
      label: 'Workouts', 
      path: '/workouts',
      description: 'Exercise & Training'
    },
    { 
      icon: Utensils, 
      label: 'Nutrition', 
      path: '/nutrition',
      description: 'Food & Calories'
    },
    { 
      icon: Brain, 
      label: 'AI Coach', 
      path: '/coach',
      description: 'Smart Guidance'
    },
    { 
      icon: User, 
      label: 'Profile', 
      path: '/profile',
      description: 'Settings & Goals'
    },
  ];

  const handleNavigation = (path, label) => {
    navigate(path);
    onClose();
    analytics.event('navigate', 'Navigation', label);
  };

  const handleLogout = () => {
    analytics.event('logout_click', 'Authentication');
    onLogout();
  };

  const handleThemeToggle = () => {
    toggleTheme();
    analytics.event('theme_toggle', 'UI', theme === 'light' ? 'dark' : 'light');
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <motion.div 
        initial={false}
        animate={{ 
          x: isOpen ? 0 : -320,
          width: isCollapsed ? 80 : 320
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-50 lg:relative lg:translate-x-0 ${
          isCollapsed ? 'w-20' : 'w-80'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <Activity className="h-6 w-6 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-bold text-lg text-gray-900 dark:text-white">AI Fitness</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Trainer</p>
              </div>
            )}
          </div>
          
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
          
          {/* Desktop collapse button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* User Info */}
        {user && !isCollapsed && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                  {user.name || 'Demo User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.isDemo ? 'Demo Account' : user.phone || user.email}
                </p>
              </div>
              {user.isDemo && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-600">
                  <Zap className="h-3 w-3 mr-1" />
                  Demo
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <motion.button
                key={item.path}
                onClick={() => handleNavigation(item.path, item.label)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} />
                {!isCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {item.description}
                    </div>
                  </div>
                )}
                {isActive && !isCollapsed && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {/* Theme Toggle */}
          <Button
            onClick={handleThemeToggle}
            variant="ghost"
            className={`w-full justify-start gap-3 ${isCollapsed ? 'px-3' : ''}`}
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
            {!isCollapsed && (
              <span className="text-sm">
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </span>
            )}
          </Button>

          {/* Settings */}
          {!isCollapsed && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={() => navigate('/profile')}
            >
              <Settings className="h-5 w-5" />
              <span className="text-sm">Settings</span>
            </Button>
          )}

          {/* Logout */}
          <Button
            onClick={handleLogout}
            variant="ghost"
            className={`w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ${isCollapsed ? 'px-3' : ''}`}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span className="text-sm">Sign Out</span>}
          </Button>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;
