'use client';

import React, { useState } from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button, Card, Input, Select, Textarea } from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';
import { Mail, MapPin, ShieldCheck } from 'lucide-react';

export default function ContactPage() {
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    category: 'General Inquiry',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/api/public/contact', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success(res.message);
      setForm({ name: '', email: '', category: 'General Inquiry', message: '' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB] dark:bg-[#090E1D]">
      <PublicNavbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <h1 className="text-3xl font-extrabold text-[#101B35] dark:text-white">
              Get in Touch with TalentAI
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Have questions about AI compatibility scoring, enterprise onboarding, or data
              privacy? Send our team a message.
            </p>
            <Card className="p-5 space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#367BF5]" />
                <span>support@talentai.demo.example</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[#28C5D8]" />
                <span>Computer Science Innovation Hub — Tunis &amp; Paris</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>privacy@talentai.demo.example (Data Protection Officer)</span>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-7">
            <Card className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name *"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <Input
                    label="Email Address *"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <Select
                  label="Topic"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Recruiter & Company Partnerships">
                    Recruiter &amp; Company Partnerships
                  </option>
                  <option value="Privacy & CV Data Request">
                    Privacy &amp; CV Data Request
                  </option>
                  <option value="Technical Support">Technical Support</option>
                </Select>
                <Textarea
                  label="Message *"
                  rows={5}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="How can we help you?"
                />
                <Button type="submit" loading={loading} className="w-full">
                  Send Message
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
