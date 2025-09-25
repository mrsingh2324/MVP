import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/Progress';
import { Plus, Search, Utensils, Apple, Carrot, Drumstick, GlassWater, X, Target, Trash2 } from 'lucide-react';
import { supabase } from '../services/authService';
import { useToast } from '../components/ui/use-toast';
import demoAccount from '../services/demoAccount';
import analytics from '../services/analytics';
import errorTracking from '../services/errorTracking';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const NutritionPage = () => {
  const [dailySummary, setDailySummary] = useState(null);
  const [foodSearch, setFoodSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [newMeal, setNewMeal] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    servings: 1
  });
  const { toast } = useToast();

  // Get user session token
  const getUserToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || 'demo_user';
  };

  // Fetch daily nutrition summary
  const fetchDailySummary = async () => {
    try {
      setIsLoading(true);
      
      // Check if demo mode
      const demoSession = localStorage.getItem('demo_session');
      if (demoSession === 'true') {
        // Use demo account data
        const todayNutrition = demoAccount.getTodayNutrition();
        const userProfile = demoAccount.getUserProfile();
        
        const summary = {
          success: true,
          date: todayNutrition.date,
          totals: todayNutrition.totals,
          targets: {
            calories: userProfile.profile.targetCalories,
            protein: userProfile.profile.targetProtein,
            carbs: userProfile.profile.targetCarbs,
            fats: userProfile.profile.targetFats
          },
          progress: {
            calories: (todayNutrition.totals.calories / userProfile.profile.targetCalories) * 100,
            protein: (todayNutrition.totals.protein / userProfile.profile.targetProtein) * 100,
            carbs: (todayNutrition.totals.carbs / userProfile.profile.targetCarbs) * 100,
            fats: (todayNutrition.totals.fats / userProfile.profile.targetFats) * 100
          },
          meals: todayNutrition.meals,
          total_entries: Object.values(todayNutrition.meals).flat().length
        };
        
        setDailySummary(summary);
        analytics.pageView('/nutrition', 'Nutrition Page');
        return;
      }
      
      // Use API for real users
      const token = await getUserToken();
      const response = await axios.get(`${API_BASE_URL}/api/nutrition/daily-summary`, {
        params: { session_token: token }
      });
      
      if (response.data.success) {
        setDailySummary(response.data);
      }
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      errorTracking.captureException(error, { function: 'fetchDailySummary' });
      toast({
        title: "Error",
        description: "Failed to load nutrition data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Search food database
  const searchFoods = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/nutrition/food-database`, {
        params: { query }
      });
      
      if (response.data.success) {
        setSearchResults(response.data.foods);
      }
    } catch (error) {
      console.error('Error searching foods:', error);
    }
  };

  // Log food entry
  const logFood = async (foodData) => {
    try {
      // Check if demo mode
      const demoSession = localStorage.getItem('demo_session');
      if (demoSession === 'true') {
        // Use demo account
        demoAccount.addFoodEntry(foodData);
        
        toast({
          title: "Success",
          description: "Food logged successfully"
        });
        
        analytics.logFood(foodData.name, foodData.calories);
        fetchDailySummary(); // Refresh data
        resetForm();
        return;
      }
      
      // Use API for real users
      const token = await getUserToken();
      const response = await axios.post(`${API_BASE_URL}/api/nutrition/log-food`, foodData, {
        params: { session_token: token }
      });
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Food logged successfully"
        });
        
        analytics.logFood(foodData.name, foodData.calories);
        fetchDailySummary(); // Refresh data
        resetForm();
      }
    } catch (error) {
      console.error('Error logging food:', error);
      errorTracking.captureException(error, { function: 'logFood', foodData });
      toast({
        title: "Error",
        description: "Failed to log food",
        variant: "destructive"
      });
    }
  };

  // Helper function to reset form
  const resetForm = () => {
    setIsAddingMeal(false);
    setNewMeal({
      name: '',
      calories: '',
      protein: '',
      carbs: '',
      fats: '',
      servings: 1
    });
    setFoodSearch('');
    setSearchResults([]);
  };

  // Delete food entry
  const deleteEntry = async (entryId) => {
    try {
      // Check if demo mode
      const demoSession = localStorage.getItem('demo_session');
      if (demoSession === 'true') {
        // Use demo account
        const success = demoAccount.deleteFoodEntry(entryId);
        
        if (success) {
          toast({
            title: "Success",
            description: "Food entry deleted"
          });
          analytics.event('delete_food', 'Nutrition', entryId);
          fetchDailySummary(); // Refresh data
        } else {
          throw new Error('Failed to delete entry');
        }
        return;
      }
      
      // Use API for real users
      const token = await getUserToken();
      const response = await axios.delete(`${API_BASE_URL}/api/nutrition/delete-entry/${entryId}`, {
        params: { session_token: token }
      });
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Food entry deleted"
        });
        analytics.event('delete_food', 'Nutrition', entryId);
        fetchDailySummary(); // Refresh data
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      errorTracking.captureException(error, { function: 'deleteEntry', entryId });
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive"
      });
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMeal.name || !newMeal.calories) {
      toast({
        title: "Error",
        description: "Please fill in food name and calories",
        variant: "destructive"
      });
      return;
    }

    logFood({
      name: newMeal.name,
      calories: parseFloat(newMeal.calories),
      protein: parseFloat(newMeal.protein) || 0,
      carbs: parseFloat(newMeal.carbs) || 0,
      fats: parseFloat(newMeal.fats) || 0,
      servings: parseFloat(newMeal.servings) || 1,
      meal_type: selectedMealType
    });
  };

  // Select food from search results
  const selectFood = (food) => {
    setNewMeal({
      name: food.name,
      calories: food.calories.toString(),
      protein: food.protein.toString(),
      carbs: food.carbs.toString(),
      fats: food.fats.toString(),
      servings: 1
    });
    setSearchResults([]);
    setFoodSearch('');
  };

  useEffect(() => {
    fetchDailySummary();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchFoods(foodSearch);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [foodSearch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const mealTypes = [
    { key: 'breakfast', label: 'Breakfast', icon: Apple },
    { key: 'lunch', label: 'Lunch', icon: Utensils },
    { key: 'dinner', label: 'Dinner', icon: Drumstick },
    { key: 'snack', label: 'Snacks', icon: Carrot }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center gap-3 mb-8">
        <Utensils className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Nutrition Tracker</h1>
      </div>

      {/* Daily Summary Cards */}
      {dailySummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Calories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dailySummary.totals.calories}</div>
              <div className="text-sm text-gray-500">/ {dailySummary.targets.calories}</div>
              <Progress 
                value={dailySummary.progress.calories} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Protein</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dailySummary.totals.protein}g</div>
              <div className="text-sm text-gray-500">/ {dailySummary.targets.protein}g</div>
              <Progress 
                value={dailySummary.progress.protein} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Carbs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dailySummary.totals.carbs}g</div>
              <div className="text-sm text-gray-500">/ {dailySummary.targets.carbs}g</div>
              <Progress 
                value={dailySummary.progress.carbs} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Fats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dailySummary.totals.fats}g</div>
              <div className="text-sm text-gray-500">/ {dailySummary.targets.fats}g</div>
              <Progress 
                value={dailySummary.progress.fats} 
                className="mt-2"
              />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Food Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Log Food
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Meal Type Selection */}
              <div>
                <Label>Meal Type</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {mealTypes.map(({ key, label, icon: Icon }) => (
                    <Button
                      key={key}
                      variant={selectedMealType === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedMealType(key)}
                      className="justify-start"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Food Search */}
              <div className="relative">
                <Label>Search Foods</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search for foods..."
                    value={foodSearch}
                    onChange={(e) => setFoodSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {searchResults.map((food, index) => (
                      <div
                        key={index}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => selectFood(food)}
                      >
                        <div className="font-medium">{food.name}</div>
                        <div className="text-sm text-gray-500">
                          {food.calories} cal | P: {food.protein}g | C: {food.carbs}g | F: {food.fats}g
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual Entry Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Food Name</Label>
                  <Input
                    value={newMeal.name}
                    onChange={(e) => setNewMeal({...newMeal, name: e.target.value})}
                    placeholder="e.g., Grilled Chicken"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Calories</Label>
                    <Input
                      type="number"
                      value={newMeal.calories}
                      onChange={(e) => setNewMeal({...newMeal, calories: e.target.value})}
                      placeholder="kcal"
                      required
                    />
                  </div>
                  <div>
                    <Label>Servings</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newMeal.servings}
                      onChange={(e) => setNewMeal({...newMeal, servings: e.target.value})}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Protein (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newMeal.protein}
                      onChange={(e) => setNewMeal({...newMeal, protein: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Carbs (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newMeal.carbs}
                      onChange={(e) => setNewMeal({...newMeal, carbs: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Fats (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newMeal.fats}
                      onChange={(e) => setNewMeal({...newMeal, fats: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Log Food
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Meals Display */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="today">Today's Meals</TabsTrigger>
            </TabsList>
            
            <TabsContent value="today" className="space-y-6">
              {dailySummary && mealTypes.map(({ key, label, icon: Icon }) => {
                const mealEntries = dailySummary.meals[key] || [];
                
                return (
                  <Card key={key}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {label}
                        <span className="text-sm font-normal text-gray-500">
                          ({mealEntries.length} items)
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {mealEntries.length > 0 ? (
                        <div className="space-y-3">
                          {mealEntries.map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium">{entry.name}</div>
                                <div className="text-sm text-gray-500">
                                  {entry.calories} cal | P: {entry.protein}g | C: {entry.carbs}g | F: {entry.fats}g
                                  {entry.servings !== 1 && ` | ${entry.servings} servings`}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteEntry(entry.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No {label.toLowerCase()} logged yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default NutritionPage;
