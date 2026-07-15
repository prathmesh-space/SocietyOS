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
        <div className="h-8 w-32 bg-slate-200 rounded"></div>
        <div className="h-64 bg-slate-200 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Society Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure global parameters and emergency contacts.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Settings className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Read Only Info */}
        <Card className="bg-slate-50/50">
          <CardHeader>
            <CardTitle className="text-lg">General Information</CardTitle>
            <CardDescription>Basic details managed by Super Admin.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 opacity-70 pointer-events-none">
              <div>
                <Label>Society Name</Label>
                <Input value={settings.name} readOnly />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={`${settings.city}, ${settings.state} - ${settings.pincode}`} readOnly />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Billing & Fees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Default Maintenance Amount (₹)</Label>
              <Input 
                type="number" 
                value={formData.defaultBillAmount} 
                onChange={(e) => setFormData({ ...formData, defaultBillAmount: Number(e.target.value) })}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="col-span-3 pb-2 border-b border-slate-200 mb-2">
                <h4 className="font-semibold text-sm">Late Fee Rules</h4>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
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
                />
              </div>
              <div className="space-y-2">
                <Label>Grace Period (Days)</Label>
                <Input 
                  type="number" 
                  value={formData.lateFeeRule?.gracePeriodDays} 
                  onChange={(e) => setFormData({ ...formData, lateFeeRule: { ...formData.lateFeeRule!, gracePeriodDays: Number(e.target.value) } })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Emergency Contacts</CardTitle>
              <CardDescription>Visible to all residents. At least 1 is required for society activation.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addEmergencyContact} className="gap-2">
              <Plus className="w-4 h-4" /> Add Contact
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.emergencyContacts?.map((contact, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <div className="flex-1 space-y-2">
                    <Label>Name</Label>
                    <Input 
                      placeholder="e.g. Main Gate Security" 
                      value={contact.name} 
                      onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Role</Label>
                    <Input 
                      placeholder="e.g. Security" 
                      value={contact.role} 
                      onChange={(e) => updateEmergencyContact(index, 'role', e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Phone Number</Label>
                    <Input 
                      placeholder="+91..." 
                      value={contact.phone} 
                      onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                    />
                  </div>
                  <div className="pt-6">
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeEmergencyContact(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {formData.emergencyContacts?.length === 0 && (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No emergency contacts configured.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
