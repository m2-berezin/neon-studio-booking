import React, { useState } from 'react';
import { Calendar, Clock, Star, CheckCircle, MessageSquare, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const Subscriptions = () => {
  const { user } = useAuth();
  const {
    loading,
    userSubscription,
    preferences,
    suggestedSlots,
    savePreferences,
    createSubscription,
    requestMonthlySchedule,
  } = useSubscriptions();

  const [editingPreferences, setEditingPreferences] = useState(false);
  const [tempPreferences, setTempPreferences] = useState(preferences);

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Login Required</h2>
        <p className="text-muted-foreground">Please login to view subscription plans.</p>
      </div>
    );
  }

  const plans = [
    {
      id: '8h-plan',
      name: '8h/month (2h/week)',
      description: 'Perfect for regular sessions',
      hours: 8,
      listPrice: 80,
      discountedPrice: 65,
      features: ['8 hours monthly', '2 hours per week', 'Flexible scheduling', 'Priority support']
    },
    {
      id: '16h-plan',
      name: '16h/month (4h/week)',
      description: 'Ideal for intensive projects',
      hours: 16,
      listPrice: 160,
      discountedPrice: 130,
      features: ['16 hours monthly', '4 hours per week', 'Flexible scheduling', 'Priority support', 'Bonus perks']
    }
  ];

  const daysOfWeek = [
    { value: '0', label: 'Sunday' },
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' }
  ];

  const timeWindows = [
    { start: '09:00', end: '12:00', label: 'Morning (9AM-12PM)' },
    { start: '12:00', end: '15:00', label: 'Afternoon (12PM-3PM)' },
    { start: '15:00', end: '18:00', label: 'Late Afternoon (3PM-6PM)' },
    { start: '18:00', end: '21:00', label: 'Evening (6PM-9PM)' }
  ];

  const handleCreateSubscription = async (plan: any) => {
    const success = await createSubscription(
      plan.name,
      plan.hours,
      plan.listPrice,
      plan.discountedPrice
    );
    if (success) {
      // Subscription created successfully
    }
  };

  const handleSavePreferences = async () => {
    const success = await savePreferences(tempPreferences);
    if (success) {
      setEditingPreferences(false);
    }
  };

  const handleDayToggle = (dayValue: string) => {
    const newDays = tempPreferences.preferred_days.includes(dayValue)
      ? tempPreferences.preferred_days.filter(d => d !== dayValue)
      : [...tempPreferences.preferred_days, dayValue];
    
    setTempPreferences(prev => ({ ...prev, preferred_days: newDays }));
  };

  const handleTimeWindowToggle = (timeWindow: { start: string; end: string }) => {
    const isSelected = tempPreferences.preferred_time_windows.some(
      tw => tw.start === timeWindow.start && tw.end === timeWindow.end
    );
    
    const newTimeWindows = isSelected
      ? tempPreferences.preferred_time_windows.filter(
          tw => !(tw.start === timeWindow.start && tw.end === timeWindow.end)
        )
      : [...tempPreferences.preferred_time_windows, timeWindow];
    
    setTempPreferences(prev => ({ ...prev, preferred_time_windows: newTimeWindows }));
  };

  const startEditing = () => {
    setTempPreferences(preferences);
    setEditingPreferences(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-accent accent-glow mb-2">
          Studio Subscriptions
        </h1>
        <p className="text-muted-foreground">
          Choose a monthly plan that fits your creative schedule
        </p>
      </div>

      {/* Current Subscription */}
      {userSubscription && (
        <Card className="studio-card border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Current Subscription
            </CardTitle>
            <CardDescription>
              Your active subscription plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-foreground">{userSubscription.plan}</h3>
                <p className="text-muted-foreground">{userSubscription.hours_per_month} hours per month</p>
                <p className="text-sm text-muted-foreground">
                  Started: {format(new Date(userSubscription.start_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">€{userSubscription.discounted_price}</p>
                <p className="text-sm text-muted-foreground line-through">€{userSubscription.price}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Plans */}
      {!userSubscription && (
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Choose Your Plan</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="studio-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-primary" />
                    {plan.name}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-3xl font-bold text-primary">€{plan.discountedPrice}</span>
                        <span className="text-lg text-muted-foreground line-through">€{plan.listPrice}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">per month</p>
                      <Badge variant="secondary" className="mt-2">
                        Save €{plan.listPrice - plan.discountedPrice}/month
                      </Badge>
                    </div>
                    
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      className="w-full"
                      onClick={() => handleCreateSubscription(plan)}
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : 'Subscribe Now'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Subscription Preferences */}
      {userSubscription && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Subscription Preferences</h2>
            {!editingPreferences && (
              <Button variant="outline" onClick={startEditing}>
                <Settings className="w-4 h-4 mr-2" />
                Edit Preferences
              </Button>
            )}
          </div>

          <Card className="studio-card">
            <CardHeader>
              <CardTitle>Preferred Schedule</CardTitle>
              <CardDescription>
                Set your preferred days and time windows for sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editingPreferences ? (
                <div className="space-y-6">
                  {/* Preferred Days */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Preferred Days</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {daysOfWeek.map((day) => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${day.value}`}
                            checked={tempPreferences.preferred_days.includes(day.value)}
                            onCheckedChange={() => handleDayToggle(day.value)}
                          />
                          <Label htmlFor={`day-${day.value}`} className="text-sm">
                            {day.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preferred Time Windows */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Preferred Time Windows</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {timeWindows.map((timeWindow, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            id={`time-${index}`}
                            checked={tempPreferences.preferred_time_windows.some(
                              tw => tw.start === timeWindow.start && tw.end === timeWindow.end
                            )}
                            onCheckedChange={() => handleTimeWindowToggle(timeWindow)}
                          />
                          <Label htmlFor={`time-${index}`} className="text-sm">
                            {timeWindow.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSavePreferences} disabled={loading}>
                      {loading ? 'Saving...' : 'Save Preferences'}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingPreferences(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {preferences.preferred_days.length > 0 ? (
                    <>
                      <div>
                        <Label className="text-base font-semibold mb-2 block">Preferred Days</Label>
                        <div className="flex flex-wrap gap-2">
                          {preferences.preferred_days.map(dayValue => (
                            <Badge key={dayValue} variant="secondary">
                              {daysOfWeek.find(d => d.value === dayValue)?.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-base font-semibold mb-2 block">Preferred Time Windows</Label>
                        <div className="flex flex-wrap gap-2">
                          {preferences.preferred_time_windows.map((timeWindow, index) => (
                            <Badge key={index} variant="secondary">
                              {timeWindows.find(tw => tw.start === timeWindow.start)?.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No preferences set. Click "Edit Preferences" to get started.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Suggested Slots */}
      {userSubscription && suggestedSlots.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Suggested Slots</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {suggestedSlots.map((slot, index) => (
              <Card key={index} className="studio-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground">
                        {slot.dayOfWeek}, {format(slot.date, 'MMM d')}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {slot.startTime} - {slot.endTime}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Request Monthly Schedule */}
      {userSubscription && (
        <section>
          <Card className="studio-card bg-gradient-to-br from-primary/10 to-accent/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Monthly Schedule Request
              </CardTitle>
              <CardDescription>
                Request your personalized monthly schedule based on your preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground mb-2">
                    Ready to book your monthly sessions? Our team will create a personalized schedule based on your preferences.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You'll receive a direct message with available slots for confirmation.
                  </p>
                </div>
                <Button
                  onClick={requestMonthlySchedule}
                  disabled={loading}
                  className="ml-4"
                >
                  {loading ? 'Sending...' : 'Request Monthly Schedule'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Info Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          Subscriptions are billed monthly. You can update your preferences anytime.
          {userSubscription && (
            <span className="block mt-1">
              Your monthly sessions will be scheduled based on availability and your preferences.
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default Subscriptions;