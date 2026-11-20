'use client';

import React, { useState } from 'react';
import { ShieldCheck, Trash2, KeyRound } from 'lucide-react';
import { Button, Card, Input, Modal } from '@/components/ui/primitives';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { apiFetch, setStoredToken } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

export function AccountSettingsPanel() {
  const { user, refreshAuth } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiFetch('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      await refreshAuth();
      toast.success('Account details updated.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await apiFetch('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Password changed securely.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await apiFetch('/api/auth/me', { method: 'DELETE' });
      setStoredToken(null);
      toast.success('Your account and stored documents have been permanently erased.');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#367BF5]" />
          <h3 className="text-base font-bold text-[#101B35] dark:text-white">
            Account Information
          </h3>
        </div>
        <form onSubmit={handleUpdateAccount} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email Address (Verified)" value={user?.email || ''} disabled />
            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+216 71 000 000"
            />
          </div>
          <Button type="submit" loading={savingProfile}>
            Save Account Details
          </Button>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[#28C5D8]" />
          <h3 className="text-base font-bold text-[#101B35] dark:text-white">
            Change Password
          </h3>
        </div>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Current Password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label="New Password (8+ chars, Upper + Number)"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" loading={savingPassword}>
            Update Password
          </Button>
        </form>
      </Card>

      {user?.role !== 'ADMIN' && (
        <Card className="p-6 border-rose-200 dark:border-rose-900/60 space-y-3">
          <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">
            Data Retention &amp; Permanent Account Deletion
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            In accordance with our Privacy Policy, you may permanently erase your account,
            profile, applications, and any private CV documents stored on TalentAI.
          </p>
          <Button variant="danger" size="sm" onClick={() => setConfirmDeleteOpen(true)}>
            <Trash2 className="w-4 h-4" /> Permanently Delete My Account
          </Button>
        </Card>
      )}

      <Modal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Confirm Permanent Account Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This action cannot be undone. All profile data, private CV files, and
            application records associated with <strong>{user?.email}</strong> will be
            permanently erased.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDeleteAccount}>
              Yes, Erase Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
