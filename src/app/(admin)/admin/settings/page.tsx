'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Trash2, Plus, Settings } from 'lucide-react';

interface EmergencyContact {
  name: string;
  phone: string;
  role: string;
}

interface SocietySettings {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  lateFeeRule: {
    type: 'percentage' | 'flat';
    value: number;
    gracePeriodDays: number;
  };
  defaultBillAmount: number;
  maxVisitorWindowHours: number;
  emergencyContacts: EmergencyContact[];
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SocietySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editable form state
  const [formData, setFormData] = useState<Partial<SocietySettings>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiClient<{ settings: SocietySettings }>('/api/admin/settings');
      if ('data' in res) {
        setSettings(res.data.settings);
        setFormData({
          defaultBillAmount: res.data.settings.defaultBillAmount,
          lateFeeRule: res.data.settings.lateFeeRule,
          maxVisitorWindowHours: res.data.settings.maxVisitorWindowHours,
          emergencyContacts: res.data.settings.emergencyContacts || [],
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await apiClient('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });

      if ('error' in res) {
        alert(res.error || 'Failed to update settings');
      } else {
        alert('Settings saved successfully!');
        fetchSettings();
      }
    } catch (err) {
      alert('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const addEmergencyContact = () => {
    const contacts = [...(formData.emergencyContacts || []), { name: '', phone: '', role: 'Security' }];
    setFormData({ ...formData, emergencyContacts: contacts });
  };

  const updateEmergencyContact = (index: number, field: keyof EmergencyContact, value: string) => {
    const contacts = [...(formData.emergencyContacts || [])];
    contacts[index] = { ...contacts[index], [field]: value } as EmergencyContact;
    setFormData({ ...formData, emergencyContacts: contacts });
  };

  const removeEmergencyContact = (index: number) => {
    const contacts = (formData.emergencyContacts || []).filter((_, i) => i !== index);
    setFormData({ ...formData, emergencyContacts: contacts });
  };

  if (isLoading || !settings) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-32 bg-clay-light rounded-md"></div>
        <div className="h-64 bg-clay-light rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-forest mb-1">Society Settings</h1>
          <p className="text-sm text-forest/70 font-medium">Configure global parameters and emergency contacts.</p>
        </div>
        <Button expression="compact" onClick={handleSave} disabled={isSaving} className="gap-2">
          <Settings className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Read Only Info */}
        <Card variant="compact" className="bg-clay-light/30 border-stone">
          <CardHeader className="border-b border-stone pb-4">
            <CardTitle className="text-lg">General Information</CardTitle>
            <CardDescription>Basic details managed by Super Admin.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70 pointer-events-none">
              <div>
                <Label>Society ID</Label>
                <div className="flex gap-2">
                  <Input value={settings.id} readOnly className="font-mono text-sm h-9 rounded-md border-stone" />
                  <Button 
                    expression="compact"
                    variant="outline" 
                    size="icon" 
                    className="pointer-events-auto shrink-0 border-stone hover:bg-clay-light text-forest"
                    onClick={() => {
                      navigator.clipboard.writeText(settings.id);
                      alert('Society ID copied to clipboard!');
                    }}
                    title="Copy Society ID"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </Button>
                </div>
              </div>
              <div>
                <Label>Society Name</Label>
                <Input value={settings.name} readOnly className="h-9 rounded-md border-stone" />
              </div>
              <div className="md:col-span-2">
                <Label>Location</Label>
                <Input value={`${settings.city}, ${settings.state} - ${settings.pincode}`} readOnly className="h-9 rounded-md border-stone" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Settings */}
        <Card variant="compact">
          <CardHeader className="border-b border-stone pb-4">
            <CardTitle className="text-lg">Billing & Fees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label>Default Maintenance Amount (₹)</Label>
              <Input 
                type="number" 
                value={formData.defaultBillAmount} 
                onChange={(e) => setFormData({ ...formData, defaultBillAmount: Number(e.target.value) })}
                className="h-9 rounded-md border-stone w-1/3"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border border-stone rounded-md bg-clay-light/20">
              <div className="sm:col-span-3 pb-2 border-b border-stone mb-2">
                <h4 className="font-semibold text-sm text-forest">Late Fee Rules</h4>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select 
                  className="flex h-9 w-full rounded-md border border-stone bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-forest"
                  value={formData.lateFeeRule?.type}
                  onChange={(e) => setFormData({ ...formData, lateFeeRule: { ...formData.lateFeeRule!, type: e.target.value as any } })}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input 
                  type="number" 
                  value={formData.lateFeeRule?.value} 
                  onChange={(e) => setFormData({ ...formData, lateFeeRule: { ...formData.lateFeeRule!, value: Number(e.target.value) } })}
                  className="h-9 rounded-md border-stone"
                />
              </div>
              <div className="space-y-2">
                <Label>Grace Period (Days)</Label>
                <Input 
                  type="number" 
                  value={formData.lateFeeRule?.gracePeriodDays} 
                  onChange={(e) => setFormData({ ...formData, lateFeeRule: { ...formData.lateFeeRule!, gracePeriodDays: Number(e.target.value) } })}
                  className="h-9 rounded-md border-stone"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card variant="compact">
          <CardHeader className="flex flex-row items-center justify-between border-b border-stone pb-4">
            <div>
              <CardTitle className="text-lg">Emergency Contacts</CardTitle>
              <CardDescription>Visible to all residents. At least 1 is required for society activation.</CardDescription>
            </div>
            <Button expression="compact" variant="outline" size="sm" onClick={addEmergencyContact} className="gap-2 border-stone text-forest hover:bg-clay-light">
              <Plus className="w-4 h-4" /> Add Contact
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {formData.emergencyContacts?.map((contact, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white border border-stone rounded-md shadow-sm">
                  <div className="flex-1 w-full space-y-2">
                    <Label>Name</Label>
                    <Input 
                      placeholder="e.g. Main Gate Security" 
                      value={contact.name} 
                      onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                      className="h-9 rounded-md border-stone"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Role</Label>
                    <Input 
                      placeholder="e.g. Security" 
                      value={contact.role} 
                      onChange={(e) => updateEmergencyContact(index, 'role', e.target.value)}
                      className="h-9 rounded-md border-stone"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Phone Number</Label>
                    <Input 
                      placeholder="+91..." 
                      value={contact.phone} 
                      onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                      className="h-9 rounded-md border-stone"
                    />
                  </div>
                  <div className="sm:pt-6 self-end sm:self-auto">
                    <Button expression="compact" variant="ghost" size="icon" className="text-terracotta hover:text-terracotta/80 hover:bg-terracotta/10 rounded-md" onClick={() => removeEmergencyContact(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {formData.emergencyContacts?.length === 0 && (
                <div className="text-center py-6 text-forest/50 bg-clay-light/30 rounded-md border border-dashed border-stone">
                  <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No emergency contacts configured.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
