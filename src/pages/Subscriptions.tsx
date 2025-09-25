import React, { useState } from 'react';
import { Calendar, Clock, Star, CheckCircle, MessageSquare, Settings, AlertTriangle } from 'lucide-react';
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
        <h2 className="text-2xl font-bold text-foreground mb-4">Sessão Requerida</h2>
        <p className="text-muted-foreground">Por favor faz login para ver planos de subscrição.</p>
      </div>
    );
  }

  const subscriptionPlans = [
    {
      id: 'plan-s',
      name: 'Plano S',
      price: 4.99,
      duration: 'monthly',
      features: [
        '10% desconto em todos os serviços no primeiro mês',
        '15% desconto nos meses seguintes',
        'Ao fim de 6 meses: oferta de 1 Mix&Master'
      ],
      popular: false
    },
    {
      id: 'plan-x',
      name: 'Plano X',
      price: 9.99,
      duration: 'monthly',
      features: [
        '10% desconto no primeiro mês em todos os serviços',
        '15% desconto nos meses seguintes',
        'Oferta de 2h de captação por mês',
        'Ao fim de 6 meses: 1 captação mix e master'
      ],
      popular: true
    }
  ];

  const daysOfWeek = [
    { value: '0', label: 'Domingo' },
    { value: '1', label: 'Segunda' },
    { value: '2', label: 'Terça' },
    { value: '3', label: 'Quarta' },
    { value: '4', label: 'Quinta' },
    { value: '5', label: 'Sexta' },
    { value: '6', label: 'Sábado' }
  ];

  const timeWindows = [
    { start: '09:00', end: '12:00', label: 'Manhã (9h-12h)' },
    { start: '12:00', end: '15:00', label: 'Tarde (12h-15h)' },
    { start: '15:00', end: '18:00', label: 'Final de Tarde (15h-18h)' },
    { start: '18:00', end: '21:00', label: 'Noite (18h-21h)' }
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
          Subscrições do Estúdio
        </h1>
        <p className="text-muted-foreground">
          Escolhe um plano mensal que se adapte ao teu horário criativo
        </p>
      </div>

      {/* Current Subscription */}
      {userSubscription && (
        <Card className="studio-card border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Subscrição Atual
            </CardTitle>
            <CardDescription>
              O teu plano de subscrição ativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-foreground">{userSubscription.plan}</h3>
                <p className="text-muted-foreground">{userSubscription.hours_per_month} hours per month</p>
                <p className="text-sm text-muted-foreground">
                  Iniciado: {format(new Date(userSubscription.start_date), 'MMM d, yyyy')}
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
          <h2 className="text-2xl font-bold text-foreground mb-4">Planos</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {subscriptionPlans.map((plan) => (
              <Card key={plan.id} className={`studio-card ${plan.popular ? 'border-primary' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
                    Mais Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-primary" />
                    {plan.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-3xl font-bold text-primary">€{plan.price}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">por mês</p>
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
                      onClick={() => {
                        window.open(`/payment?service=subscription&plan=${plan.id}&price=${plan.price}`, '_blank');
                      }}
                      disabled={loading}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      Subscrever Agora
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
            <h2 className="text-2xl font-bold text-foreground">Preferências de Subscrição</h2>
            {!editingPreferences && (
              <Button variant="outline" onClick={startEditing}>
                <Settings className="w-4 h-4 mr-2" />
                Editar Preferências
              </Button>
            )}
          </div>

          <Card className="studio-card">
            <CardHeader>
            <CardTitle>Horário Preferido</CardTitle>
            <CardDescription>
              Define os teus dias e janelas de tempo preferidos para sessões
            </CardDescription>
            </CardHeader>
            <CardContent>
              {editingPreferences ? (
                <div className="space-y-6">
                  {/* Preferred Days */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Dias Preferidos</Label>
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
          As subscrições são faturadas mensalmente. Podes atualizar as tuas preferências a qualquer momento.
          {userSubscription && (
            <span className="block mt-1">
              As tuas sessões mensais serão agendadas com base na disponibilidade e nas tuas preferências.
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default Subscriptions;