
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import type { Class, UserProfile, Submission, Test } from '@/lib/types';
import withAuth from '@/components/auth/withAuth';
import AppHeader from '@/components/AppHeader';

type StudentSubmission = {
  student: UserProfile;
  submission?: Submission;
};

function TestSubmissionsPage() {
  const { user } = useAuth();
  const { testId } = useParams();
  const router = useRouter();

  const [test, setTest] = useState<Test | null>(null);
  const [studentSubmissions, setStudentSubmissions] = useState<StudentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !testId) return;

    const testRef = doc(db, 'tests', testId as string);
    const unsubTest = onSnapshot(testRef, async (testSnap) => {
        if(testSnap.exists()) {
            const testData = { id: testSnap.id, ...testSnap.data() } as Test;
            // Security check
            if (testData.createdBy !== user.uid) {
                router.replace('/teacher');
                return;
            }
            setTest(testData);

            // Fetch class and students
            const classRef = doc(db, 'classes', testData.classId);
            const classSnap = await getDoc(classRef);
            if(classSnap.exists()) {
                const classData = classSnap.data() as Class;
                if (classData.studentIds.length > 0) {
                    const studentsQuery = query(collection(db, 'users'), where('uid', 'in', classData.studentIds));
                    const studentsSnap = await getDocs(studentsQuery);
                    const studentProfiles = studentsSnap.docs.map(d => d.data() as UserProfile);

                    // Fetch submissions for this test
                    const submissionsQuery = query(collection(db, 'submissions'), where('testId', '==', testId));
                    const unsubSubmissions = onSnapshot(submissionsQuery, (subsSnap) => {
                        const submissions = subsSnap.docs.map(d => d.data() as Submission);
                        const combinedData = studentProfiles.map(student => ({
                            student,
                            submission: submissions.find(s => s.studentId === student.uid)
                        }));
                        setStudentSubmissions(combinedData);
                        setIsLoading(false);
                    });
                    return unsubSubmissions;
                } else {
                    setIsLoading(false);
                }
            }
        } else {
            setIsLoading(false);
        }
    });

    return () => unsubTest();
  }, [user, testId, router]);


  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!test) {
    return <div>Test not found or you do not have permission to view it.</div>;
  }

  const getScore = (submission?: Submission) => {
      if (!submission?.evaluation) return "N/A";
      const correct = submission.evaluation.results.filter(r => r.isCorrect).length;
      const total = submission.evaluation.results.length;
      return `${correct}/${total} (${((correct/total)*100).toFixed(0)}%)`;
  }
  
  const getStatus = (submission?: Submission) => {
      if(submission?.evaluation) return <Badge variant="default">Completed</Badge>;
      if(submission) return <Badge variant="secondary">In Progress</Badge>;
      return <Badge variant="outline">Not Started</Badge>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
       <AppHeader title={`Submissions for ${test.name}`} backLink='/teacher' />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <Card>
            <CardHeader>
                <CardTitle>Student Submissions</CardTitle>
                <CardDescription>Review the status and results of student submissions for this test.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {studentSubmissions.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">No students found in the assigned class.</TableCell></TableRow>
                        ) : (
                            studentSubmissions.map(({ student, submission }) => (
                                <TableRow key={student.uid}>
                                    <TableCell className="font-medium">{student.email}</TableCell>
                                    <TableCell>{getStatus(submission)}</TableCell>
                                    <TableCell>{submission?.evaluation ? getScore(submission) : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        {submission?.evaluation && (
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/student/results/${submission.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View
                                                </Link>
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withAuth(TestSubmissionsPage, ['teacher']);
