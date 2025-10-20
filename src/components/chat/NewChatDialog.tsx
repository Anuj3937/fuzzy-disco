
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, or } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

type NewChatDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onStartChat: (user: UserProfile) => void;
};

const getInitials = (email: string | undefined) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
};

export function NewChatDialog({
  isOpen,
  onClose,
  currentUser,
  onStartChat,
}: NewChatDialogProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
        setSearch('');
        setResults([]);
        return;
    }

    const fetchUsers = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        
        // Teachers can chat with students/parents. Students can only chat with teachers.
        let allowedRoles: ('student' | 'teacher' | 'parent')[] = [];
        if (currentUser.role === 'teacher') {
            allowedRoles = ['student', 'parent'];
        } else if (currentUser.role === 'student') {
            allowedRoles = ['teacher'];
        }

        if (allowedRoles.length === 0) {
            setIsLoading(false);
            return;
        }

        const usersQuery = query(
            collection(db, 'users'), 
            where('role', 'in', allowedRoles),
            limit(20)
        );

        const querySnapshot = await getDocs(usersQuery);
        const users = querySnapshot.docs.map(doc => doc.data() as UserProfile);
        
        // filter out current user
        setResults(users.filter(u => u.uid !== currentUser.uid));
        setIsLoading(false);
    };

    fetchUsers();
  }, [isOpen, currentUser]);
  
  const filteredResults = search 
    ? results.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))
    : results;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a New Chat</DialogTitle>
          <DialogDescription>Select a user to start a conversation with.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input 
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="mt-4 space-y-2 h-64 overflow-y-auto">
            {isLoading ? (
                <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>
            ) : filteredResults.length > 0 ? (
                filteredResults.map(user => (
                    <button key={user.uid} onClick={() => onStartChat(user)} className="w-full text-left p-2 rounded-md hover:bg-muted flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src="" alt={user.email} />
                            <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium">{user.email}</p>
                            <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                        </div>
                    </button>
                ))
            ) : (
                <p className="text-center text-sm text-muted-foreground pt-4">No users found.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
