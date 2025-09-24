import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Settings, Users, MessageSquare, BookOpen, DollarSign, Gift, Send, Plus, Edit, Trash2, Filter } from 'lucide-react';
import { format } from 'date-fns';

const Admin = () => {
  const { user, isAdmin } = useAuth();
  const {
    loading,
    
    // Availability
    availabilityRules,
    blackoutDates,
    createAvailabilityRule,
    updateAvailabilityRule,
    deleteAvailabilityRule,
    createBlackoutDate,
    deleteBlackoutDate,
    
    // Bookings
    bookings,
    bookingFilter,
    setBookingFilter,
    updateBookingStatus,
    
    // Clients
    clients,
    issueVoucher,
    
    // Services
    services,
    createService,
    updateService,
    deleteService,
    
    // Rewards
    rewardsSummary,
    
    // Broadcast
    broadcastMessage,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState('availability');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', body: '' });

  // Form states
  const [availabilityForm, setAvailabilityForm] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: null as string | null,
    is_active: true,
  });

  const [blackoutForm, setBlackoutForm] = useState({
    date: '',
    reason: '',
  });

  const [serviceForm, setServiceForm] = useState({
    name: '',
    type: 'recording',
    base_price: 0,
    description: '',
    is_active: true,
  });

  const [voucherForm, setVoucherForm] = useState({
    clientId: '',
    amount: 15,
  });

  // Redirect if not admin
  if (!user || !isAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6">
          <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
          <p className="text-center text-muted-foreground mt-2">
            You don't have permission to access the admin area.
          </p>
        </Card>
      </div>
    );
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bookingStatuses = ['confirmed', 'pending', 'cancelled', 'completed', 'no_show'];

  const handleCreateAvailabilityRule = async () => {
    const success = await createAvailabilityRule(availabilityForm);
    if (success) {
      setAvailabilityForm({
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        effective_from: new Date().toISOString().split('T')[0],
        effective_to: null,
        is_active: true,
      });
    }
  };

  const handleCreateBlackoutDate = async () => {
    if (!blackoutForm.date) return;
    const success = await createBlackoutDate({
      date: blackoutForm.date,
      reason: blackoutForm.reason || null,
    });
    if (success) {
      setBlackoutForm({ date: '', reason: '' });
    }
  };

  const handleCreateService = async () => {
    if (!serviceForm.name || !serviceForm.base_price) return;
    const success = await createService(serviceForm);
    if (success) {
      setServiceForm({
        name: '',
        type: 'recording',
        base_price: 0,
        description: '',
        is_active: true,
      });
    }
  };

  const handleIssueVoucher = async () => {
    if (!voucherForm.clientId || !voucherForm.amount) return;
    const success = await issueVoucher(voucherForm.clientId, voucherForm.amount);
    if (success) {
      setVoucherForm({ clientId: '', amount: 15 });
    }
  };

  const handleBroadcastMessage = async () => {
    if (!broadcastForm.title || !broadcastForm.body || selectedClients.length === 0) return;
    const success = await broadcastMessage(selectedClients, broadcastForm.title, broadcastForm.body);
    if (success) {
      setBroadcastForm({ title: '', body: '' });
      setSelectedClients([]);
    }
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">Manage your studio operations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Availability
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Bookings
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Rewards
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Broadcast
          </TabsTrigger>
        </TabsList>

        {/* Availability Tab */}
        <TabsContent value="availability" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Availability Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Availability Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Create form */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium">Add New Rule</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Day of Week</Label>
                      <Select 
                        value={availabilityForm.day_of_week.toString()} 
                        onValueChange={(value) => setAvailabilityForm(prev => ({...prev, day_of_week: parseInt(value)}))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dayNames.map((day, index) => (
                            <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Active</Label>
                      <Select 
                        value={availabilityForm.is_active.toString()} 
                        onValueChange={(value) => setAvailabilityForm(prev => ({...prev, is_active: value === 'true'}))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Active</SelectItem>
                          <SelectItem value="false">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={availabilityForm.start_time}
                        onChange={(e) => setAvailabilityForm(prev => ({...prev, start_time: e.target.value}))}
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={availabilityForm.end_time}
                        onChange={(e) => setAvailabilityForm(prev => ({...prev, end_time: e.target.value}))}
                      />
                    </div>
                    <div>
                      <Label>Effective From</Label>
                      <Input
                        type="date"
                        value={availabilityForm.effective_from}
                        onChange={(e) => setAvailabilityForm(prev => ({...prev, effective_from: e.target.value}))}
                      />
                    </div>
                    <div>
                      <Label>Effective To (Optional)</Label>
                      <Input
                        type="date"
                        value={availabilityForm.effective_to || ''}
                        onChange={(e) => setAvailabilityForm(prev => ({...prev, effective_to: e.target.value || null}))}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateAvailabilityRule} disabled={loading} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </div>

                {/* Rules list */}
                <div className="space-y-2">
                  {availabilityRules.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {dayNames[rule.day_of_week]}
                          </Badge>
                          <span className="text-sm">
                            {rule.start_time} - {rule.end_time}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {rule.effective_from} {rule.effective_to ? `- ${rule.effective_to}` : ''}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateAvailabilityRule(rule.id, { is_active: !rule.is_active })}
                        >
                          {rule.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteAvailabilityRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Blackout Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Blackout Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Create form */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium">Add Blackout Date</h4>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={blackoutForm.date}
                      onChange={(e) => setBlackoutForm(prev => ({...prev, date: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label>Reason (Optional)</Label>
                    <Input
                      placeholder="Holiday, maintenance, etc."
                      value={blackoutForm.reason}
                      onChange={(e) => setBlackoutForm(prev => ({...prev, reason: e.target.value}))}
                    />
                  </div>
                  <Button onClick={handleCreateBlackoutDate} disabled={loading || !blackoutForm.date} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Blackout Date
                  </Button>
                </div>

                {/* Blackout dates list */}
                <div className="space-y-2">
                  {blackoutDates.map(blackout => (
                    <div key={blackout.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{format(new Date(blackout.date), 'PPP')}</div>
                        {blackout.reason && (
                          <div className="text-sm text-muted-foreground">{blackout.reason}</div>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteBlackoutDate(blackout.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Bookings Management
                <div className="flex gap-2">
                  <Select
                    value={bookingFilter.status}
                    onValueChange={(value) => setBookingFilter(prev => ({...prev, status: value}))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      {bookingStatuses.map(status => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    placeholder="From date"
                    value={bookingFilter.date_from}
                    onChange={(e) => setBookingFilter(prev => ({...prev, date_from: e.target.value}))}
                    className="w-40"
                  />
                  <Input
                    type="date"
                    placeholder="To date"
                    value={bookingFilter.date_to}
                    onChange={(e) => setBookingFilter(prev => ({...prev, date_to: e.target.value}))}
                    className="w-40"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookings.map(booking => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            booking.status === 'confirmed' ? 'default' :
                            booking.status === 'completed' ? 'secondary' :
                            booking.status === 'no_show' ? 'destructive' : 'outline'
                          }
                        >
                          {booking.status.replace('_', ' ')}
                        </Badge>
                        <span className="font-medium">
                          {(booking.profiles as any)?.full_name || 'Unknown Client'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {(booking.services as any)?.name}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(booking.date), 'PPP')} at {booking.start_time} - {booking.end_time}
                      </div>
                      <div className="text-sm">
                        €{(booking.services as any)?.base_price}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={booking.status}
                        onValueChange={(status) => updateBookingStatus(booking.id, status)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {bookingStatuses.map(status => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Issue voucher form */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border rounded-lg bg-muted/50">
                <div>
                  <Label>Select Client</Label>
                  <Select
                    value={voucherForm.clientId}
                    onValueChange={(value) => setVoucherForm(prev => ({...prev, clientId: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name || client.phone || 'Unknown'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount (€)</Label>
                  <Input
                    type="number"
                    value={voucherForm.amount}
                    onChange={(e) => setVoucherForm(prev => ({...prev, amount: parseInt(e.target.value) || 0}))}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleIssueVoucher} 
                    disabled={loading || !voucherForm.clientId || !voucherForm.amount}
                    className="w-full"
                  >
                    Issue Voucher
                  </Button>
                </div>
              </div>

              {/* Clients list */}
              <div className="space-y-2">
                {clients.map(client => (
                  <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {client.full_name || 'No name provided'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {client.phone || 'No phone provided'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Joined: {format(new Date(client.created_at), 'PPP')}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      {client.penalty_until && (
                        <Badge variant="destructive">
                          Penalty until {format(new Date(client.penalty_until), 'PPP')}
                        </Badge>
                      )}
                      {client.last_voucher_at && (
                        <div className="text-xs text-muted-foreground">
                          Last voucher: {format(new Date(client.last_voucher_at), 'PPP')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Services Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Create service form */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium">Add New Service</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Service Name</Label>
                    <Input
                      placeholder="e.g., Recording Session"
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm(prev => ({...prev, name: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={serviceForm.type}
                      onValueChange={(value) => setServiceForm(prev => ({...prev, type: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recording">Recording</SelectItem>
                        <SelectItem value="mixing">Mixing</SelectItem>
                        <SelectItem value="mastering">Mastering</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Base Price (€)</Label>
                    <Input
                      type="number"
                      value={serviceForm.base_price}
                      onChange={(e) => setServiceForm(prev => ({...prev, base_price: parseInt(e.target.value) || 0}))}
                    />
                  </div>
                  <div>
                    <Label>Active</Label>
                    <Select
                      value={serviceForm.is_active.toString()}
                      onValueChange={(value) => setServiceForm(prev => ({...prev, is_active: value === 'true'}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Service description..."
                      value={serviceForm.description}
                      onChange={(e) => setServiceForm(prev => ({...prev, description: e.target.value}))}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleCreateService} 
                  disabled={loading || !serviceForm.name || !serviceForm.base_price}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </div>

              {/* Services list */}
              <div className="space-y-2">
                {services.map(service => (
                  <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={service.is_active ? 'default' : 'secondary'}>
                          {service.type}
                        </Badge>
                        <span className="font-medium">{service.name}</span>
                        <span className="text-sm text-muted-foreground">€{service.base_price}</span>
                      </div>
                      {service.description && (
                        <div className="text-sm text-muted-foreground">{service.description}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateService(service.id, { is_active: !service.is_active })}
                      >
                        {service.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Service</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            <div>
                              <Label>Base Price (€)</Label>
                              <Input
                                type="number"
                                defaultValue={service.base_price}
                                onChange={(e) => {
                                  const newPrice = parseInt(e.target.value) || 0;
                                  updateService(service.id, { base_price: newPrice });
                                }}
                              />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rewards Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rewardsSummary.map((summary, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">
                        {summary.full_name || 'Unknown Client'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Reward: {summary.reward_code}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {summary.total_count} times used
                    </Badge>
                  </div>
                ))}
                {rewardsSummary.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No reward usage data found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Broadcast Tab */}
        <TabsContent value="broadcast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Broadcast Message to Clients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Client selection */}
              <div>
                <Label>Select Clients ({selectedClients.length} selected)</Label>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedClients.length === clients.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedClients(clients.map(c => c.id));
                        } else {
                          setSelectedClients([]);
                        }
                      }}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium">
                      Select All
                    </label>
                  </div>
                  <Separator />
                  {clients.map(client => (
                    <div key={client.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={client.id}
                        checked={selectedClients.includes(client.id)}
                        onCheckedChange={() => toggleClientSelection(client.id)}
                      />
                      <label htmlFor={client.id} className="text-sm">
                        {client.full_name || client.phone || 'Unknown'}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message form */}
              <div>
                <Label>Message Title</Label>
                <Input
                  placeholder="Important announcement..."
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm(prev => ({...prev, title: e.target.value}))}
                />
              </div>
              <div>
                <Label>Message Body</Label>
                <Textarea
                  placeholder="Your message content..."
                  rows={4}
                  value={broadcastForm.body}
                  onChange={(e) => setBroadcastForm(prev => ({...prev, body: e.target.value}))}
                />
              </div>

              <Button
                onClick={handleBroadcastMessage}
                disabled={loading || !broadcastForm.title || !broadcastForm.body || selectedClients.length === 0}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send to {selectedClients.length} Client(s)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;