
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import type { UserProfile, Class as ClassType } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

type ManageClassDialogProps = {
  classData: ClassType;
  allUsers: UserProfile[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedClass: ClassType, parentLinks: { parentId: string, studentId: string }[]) => void;
};

export function ManageClassDialog({
  classData,
  allUsers,
  isOpen,
  onClose,
  onSave,
}: ManageClassDialogProps) {
  const [teacherId, setTeacherId] = useState(classData.teacherId);
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [parentStudentLinks, setParentStudentLinks] = useState<Map<string, string | null>>(new Map()); // studentId -> parentId
  const [studentSearch, setStudentSearch] = useState('');

  const teachers = allUsers.filter((user) => user.role === 'teacher');
  const allStudents = allUsers.filter((user) => user.role === 'student');
  const allParents = allUsers.filter((user) => user.role === 'parent');

  useEffect(() => {
    if (isOpen) {
      setTeacherId(classData.teacherId);
      setStudentIds(classData.studentIds || []);
      
      const initialLinks = new Map();
      allStudents.forEach(student => {
        const parent = allParents.find(p => p.studentIds?.includes(student.uid));
        initialLinks.set(student.uid, parent ? parent.uid : null);
      });
      setParentStudentLinks(initialLinks);

    }
  }, [classData, allUsers, isOpen]);


  const handleSave = () => {
    const activeLinks: { parentId: string, studentId: string }[] = [];
    parentStudentLinks.forEach((parentId, studentId) => {
      if (parentId) {
        activeLinks.push({ parentId, studentId });
      }
    });
    onSave({ ...classData, teacherId, studentIds }, activeLinks);
  };
  
  const handleStudentCheckChange = (studentId: string, checked: boolean) => {
    setStudentIds((currentIds) => {
      if (checked) {
        return [...currentIds, studentId];
      } else {
        return currentIds.filter((id) => id !== studentId);
      }
    });
  };

  const handleParentSelect = (studentId: string, parentId: string) => {
    setParentStudentLinks(prev => new Map(prev).set(studentId, parentId === 'null' ? null : parentId));
  }

  const filteredStudents = allStudents.filter(student => student.email.toLowerCase().includes(studentSearch.toLowerCase()));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Class: {classData.name}</DialogTitle>
          <DialogDescription>Assign a teacher and manage student enrollment and parent linking.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Teacher Assignment */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="teacher" className="text-right">
              Teacher
            </Label>
            <Select value={teacherId || ''} onValueChange={(value) => setTeacherId(value === 'null' ? null : value)}>
              <SelectTrigger id="teacher" className="col-span-3">
                <SelectValue placeholder="Select a teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">None</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.uid} value={teacher.uid}>
                    {teacher.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student and Parent Management */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">
              Students & Parents
            </Label>
            <div className="col-span-3 space-y-3">
                <Input 
                    placeholder="Search students..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                />
                <ScrollArea className="h-64 w-full rounded-md border">
                    <div className="p-4">
                        <h4 className="mb-4 text-sm font-medium leading-none">Enroll Students and Link Parents</h4>
                        <Accordion type="multiple" className="w-full">
                         {filteredStudents.length > 0 ? (
                            filteredStudents.map((student) => (
                                <AccordionItem value={student.uid} key={student.uid}>
                                    <AccordionTrigger>
                                       <div className="flex items-center space-x-3 flex-1 pr-4">
                                            <Checkbox
                                                id={`student-${student.uid}`}
                                                checked={studentIds.includes(student.uid)}
                                                onCheckedChange={(checked) => handleStudentCheckChange(student.uid, !!checked)}
                                                onClick={(e) => e.stopPropagation()} // prevent accordion from toggling
                                            />
                                            <Label htmlFor={`student-${student.uid}`} className="text-sm font-normal flex-1 truncate">
                                                {student.email}
                                            </Label>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="pl-8 pt-2">
                                            <Label className="text-xs text-muted-foreground">Link Parent</Label>
                                            <Select
                                              value={parentStudentLinks.get(student.uid) || 'null'}
                                              onValueChange={(parentId) => handleParentSelect(student.uid, parentId)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a parent" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="null">No parent linked</SelectItem>
                                                    {allParents.map(parent => (
                                                        <SelectItem key={parent.uid} value={parent.uid}>{parent.email}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))
                         ) : (
                            <p className="text-sm text-muted-foreground p-4 text-center">No students found.</p>
                         )}
                        </Accordion>
                    </div>
                </ScrollArea>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    