// src/components/chat/IncomingCallDialog.tsx
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { Call } from '@/lib/types';

type IncomingCallDialogProps = {
  call: Call | null;
  onAccept: (channelName: string) => void;
  onDecline: (callId: string) => void;
};

const getInitials = (email: string | undefined) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
};

export function IncomingCallDialog({ call, onAccept, onDecline }: IncomingCallDialogProps) {
  if (!call) return null;

  return (
    <Dialog open={!!call}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Incoming Call</DialogTitle>
          <DialogDescription>You have an incoming call.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Avatar className="h-20 w-20">
                <AvatarImage src="" alt={call.callerProfile?.email} />
                <AvatarFallback className="text-2xl">{getInitials(call.callerProfile?.email)}</AvatarFallback>
            </Avatar>
            <p className="font-semibold text-lg">{call.callerProfile?.email || 'Unknown Caller'}</p>
        </div>
        <DialogFooter className="flex justify-center gap-4">
          <Button variant="destructive" size="lg" onClick={() => onDecline(call.id)}>
            <PhoneOff className="mr-2" /> Decline
          </Button>
          <Button variant="default" size="lg" onClick={() => onAccept(call.channelName)} className="bg-green-600 hover:bg-green-700">
            <Phone className="mr-2" /> Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}