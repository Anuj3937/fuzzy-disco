
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BookText,
  ClipboardCheck,
  FileUp,
  Loader2,
  Paperclip,
  Send,
  CheckCircle,
  Edit,
  ChevronDown,
  RefreshCcw,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateMCQTest } from "@/ai/flows/generate-mcq-test";
import { generateSubjectiveTest } from "@/ai/flows/generate-subjective-test";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MCQQuestion, SubjectiveQuestion, Class, Test } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import withAuth from "@/components/auth/withAuth";
import AppHeader from "@/components/AppHeader";

type TestContentType = "mcq" | "subjective";
type FileState = { name: string; dataUri: string };
type GeneratedTest = (MCQQuestion | SubjectiveQuestion) & { isEditing?: boolean };

function CreateTestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draftId');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedTest, setGeneratedTest] = useState<GeneratedTest[] | null>(null);
  const [testType, setTestType] = useState<TestContentType>('mcq');
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [file, setFile] = useState<FileState | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [testName, setTestName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTeacherClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class)));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (draftId) {
      const fetchDraft = async () => {
        setIsLoading(true);
        const draftRef = doc(db, 'tests', draftId);
        const draftSnap = await getDoc(draftRef);
        if (draftSnap.exists()) {
          const draftData = draftSnap.data() as Test;
          // Security check: ensure the user owns this draft
          if (draftData.createdBy !== user?.uid) {
            toast({ variant: 'destructive', title: 'Access Denied' });
            router.push('/teacher');
            return;
          }
          setTestName(draftData.name);
          setGeneratedTest(draftData.questions);
          setTestType(draftData.questions[0].type);
          setSelectedClassId(draftData.classId);
          // Note: Cannot reconstruct prompt/file, but the test itself is editable.
        } else {
          toast({ variant: 'destructive', title: 'Draft not found' });
          router.push('/teacher/create-test');
        }
        setIsLoading(false);
      };
      fetchDraft();
    }
  }, [draftId, user, router, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileState = { name: selectedFile.name, dataUri: e.target?.result as string };
        setFile(fileState);
        const fileNameWithoutExt = selectedFile.name.split('.').slice(0, -1).join('.');
        if (!currentPrompt) setCurrentPrompt(fileNameWithoutExt);
        if (!testName) setTestName(fileNameWithoutExt);
      };
      reader.readAsDataURL(selectedFile);
    }
    if(event.target) event.target.value = "";
  };

  const handleGenerateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPrompt && !file) {
        toast({ variant: 'destructive', title: 'Input required', description: 'Please enter a topic or upload a file.' });
        return;
    }
    setIsLoading(true);
    setGeneratedTest(null);

    try {
        const topic = currentPrompt || file?.name || 'the provided document';
        if (!testName) setTestName(topic);
        
        const result = testType === 'mcq'
            ? await generateMCQTest({ topic, documentDataUri: file?.dataUri, numberOfQuestions })
            : await generateSubjectiveTest({ topic, documentDataUri: file?.dataUri });
        
        const questions = 'questions' in result ? result.questions : [];
        if (questions.length > 0) {
            const testQuestions: GeneratedTest[] = testType === 'mcq' 
                ? (questions as {question: string, options: string[], answer: string}[]).map(q => ({...q, type: 'mcq'}))
                : (questions as string[]).map(q => ({ question: q, type: 'subjective' as const }));
            setGeneratedTest(testQuestions);
        } else {
            toast({ variant: 'destructive', title: 'Generation Failed', description: 'Could not generate a test for that topic. The document might be empty or in an unreadable format.' });
        }
    } catch(error) {
        console.error("Test generation failed:", error);
        toast({ variant: "destructive", title: "Action Failed", description: "Something went wrong. This can happen if the topic is too sensitive or the document is unreadable." });
    } finally {
        setIsLoading(false);
    }
  };

  const handleRegenerateQuestion = async (index: number) => {
    if (!generatedTest) return;
    const originalQuestion = generatedTest[index];
    
    const newTest = [...generatedTest];
    newTest[index] = {...newTest[index], question: "Regenerating..."};
    setGeneratedTest(newTest);

    try {
        const topic = currentPrompt || file?.name || 'the provided document';
        const result = originalQuestion.type === 'mcq'
            ? await generateMCQTest({ topic, documentDataUri: file?.dataUri, numberOfQuestions: 1 })
            : await generateSubjectiveTest({ topic, documentDataUri: file?.dataUri });

        const newQuestions = 'questions' in result ? result.questions : [];
        if (newQuestions.length > 0) {
            const newQuestion = originalQuestion.type === 'mcq'
              ? {...(newQuestions[0] as MCQQuestion), type: 'mcq' as const}
              : { question: newQuestions[0] as string, type: 'subjective' as const };
            
            const updatedTest = [...generatedTest];
            updatedTest[index] = newQuestion;
            setGeneratedTest(updatedTest);
        } else {
            throw new Error("No question returned");
        }
    } catch (error) {
        toast({variant: 'destructive', title: 'Failed to regenerate question'});
        const newTest = [...generatedTest];
        newTest[index] = originalQuestion; // Restore original
        setGeneratedTest(newTest);
    }
  }

  const handleSaveOrUpdate = async (isDraft: boolean) => {
    if (!generatedTest || generatedTest.length === 0) {
        toast({ variant: 'destructive', title: 'No questions', description: 'Please add questions to the test.' });
        return;
    }
    if (!testName) {
        toast({ variant: 'destructive', title: 'Test Name Required', description: 'Please provide a name for the test.' });
        return;
    }
    if (!selectedClassId && !isDraft) {
        toast({ variant: 'destructive', title: 'Class not selected', description: 'Please select a class to assign the test to.' });
        return;
    }
    
    setIsSaving(true);
    try {
        const testData = {
            name: testName,
            classId: isDraft ? null : selectedClassId,
            questions: generatedTest.map(({isEditing, ...q}: any) => q),
            createdBy: user?.uid,
            isDraft,
        };

        if (draftId) {
            // Update existing draft
            const draftRef = doc(db, 'tests', draftId);
            await updateDoc(draftRef, testData);
            toast({ title: 'Draft Updated', description: `The test "${testName}" has been updated.` });
        } else {
            // Create new test/draft
            await addDoc(collection(db, 'tests'), { ...testData, createdAt: serverTimestamp() });
            toast({ title: isDraft ? 'Test Saved as Draft' : 'Test Assigned', description: `The test "${testName}" has been saved.` });
        }
        router.push('/teacher');
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the test.' });
    } finally {
        setIsSaving(false);
    }
  }

  const handleToggleEdit = (index: number) => {
    const newTest = [...(generatedTest || [])];
    newTest[index].isEditing = !newTest[index].isEditing;
    setGeneratedTest(newTest);
  }

  const handleQuestionChange = (index: number, value: string) => {
    const newTest = [...(generatedTest || [])];
    newTest[index].question = value;
    setGeneratedTest(newTest);
  }
  
  const pageTitle = draftId ? "Edit Test" : "Create New Test";
  
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
       <AppHeader title={pageTitle} backLink="/teacher" />

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>AI-Powered Test Generation</CardTitle>
            <CardDescription>Generate a test automatically based on a topic or an uploaded document, then review and assign it.</CardDescription>
          </CardHeader>
          <CardContent>
            {!generatedTest && !isLoading && !draftId && (
              <form onSubmit={handleGenerateTest} className="relative space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label>Topic</Label>
                      <Textarea
                          value={currentPrompt}
                          onChange={e => setCurrentPrompt(e.target.value)}
                          placeholder="e.g., 'The Revolt of 1857'"
                          rows={1}
                          className="flex-grow resize-none"
                      />
                  </div>
                   <div className="space-y-2">
                      <Label>Number of Questions</Label>
                      <Input 
                          type="number" 
                          value={numberOfQuestions}
                          onChange={e => setNumberOfQuestions(parseInt(e.target.value, 10))}
                          min="1"
                          max="20"
                      />
                  </div>
                </div>
                
                <div className="flex items-end gap-2">
                  <div className="flex-grow">
                    {file && (
                      <div className="flex items-center p-2 bg-muted rounded-md text-sm max-w-sm">
                        <Paperclip className="h-4 w-4 mr-2" />
                        <span className="font-medium truncate flex-grow">{file.name}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFile(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} title="Upload Media">
                    <FileUp className="mr-2 h-4 w-4" /> Upload Media
                  </Button>
                  <input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden"/>

                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="outline">
                              {testType.toUpperCase()}
                              <ChevronDown className="ml-2 h-4 w-4"/>
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setTestType('mcq')}>
                              <ClipboardCheck className="mr-2 h-4 w-4" />
                              MCQ Test
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setTestType('subjective')}>
                              <BookText className="mr-2 h-4 w-4" />
                              Subjective Test
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>

                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}
                    <span className="ml-2 hidden sm:inline">Generate</span>
                  </Button>
                </div>
              </form>
            )}

            {isLoading && (
                <div className="text-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary"/>
                    <p className="mt-2 text-muted-foreground">{draftId ? 'Loading draft...' : 'AI is generating your test...'}</p>
                </div>
            )}
            
            {generatedTest && (
              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Review Generated Test</h3>
                <div className="space-y-2 mb-6">
                    <Label htmlFor="test-name">Test Name</Label>
                    <Input id="test-name" value={testName} onChange={e => setTestName(e.target.value)} placeholder="Enter a name for this test" />
                </div>
                <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                  {generatedTest.map((q, index) => (
                    <AccordionItem value={`item-${index}`} key={index}>
                      <AccordionTrigger>Question {index + 1}</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        {q.isEditing ? (
                            <Textarea value={q.question} onChange={e => handleQuestionChange(index, e.target.value)} className="text-base" />
                        ) : (
                            <p className="font-medium">{q.question === "Regenerating..." ? <span className="italic text-muted-foreground">Regenerating...</span> : q.question}</p>
                        )}

                        {q.type === 'mcq' && (
                            <div className="pl-4 space-y-2">
                                {(q as MCQQuestion).options.map((option, oIndex) => (
                                    <div key={oIndex} className={cn("text-sm", (q as MCQQuestion).answer === option ? "text-green-600 font-semibold" : "text-muted-foreground")}>
                                        - {option}
                                    </div>
                                ))}
                            </div>
                        )}
                         <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleToggleEdit(index)}>
                                <Edit className="mr-2 h-4 w-4"/>
                                {q.isEditing ? "Save" : "Edit"}
                            </Button>
                            {!draftId && (
                              <Button variant="outline" size="sm" onClick={() => handleRegenerateQuestion(index)} disabled={q.question === 'Regenerating...'}>
                                  <RefreshCcw className="mr-2 h-4 w-4"/>
                                  Regenerate
                              </Button>
                            )}
                         </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                <div className="flex flex-wrap gap-4 mt-6 items-end border-t pt-6">
                    <div className="space-y-2 flex-grow">
                        <Label htmlFor="assign-class">Assign to Class</Label>
                         <Select onValueChange={setSelectedClassId} value={selectedClassId || ''}>
                            <SelectTrigger id="assign-class">
                                <SelectValue placeholder="Select a class (optional for drafts)" />
                            </SelectTrigger>
                            <SelectContent>
                                {teacherClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - Div {c.division}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={() => handleSaveOrUpdate(true)} disabled={isSaving} variant="secondary">
                        <Save className="mr-2"/> {isSaving ? 'Saving...' : 'Save as Draft'}
                    </Button>
                    <Button onClick={() => handleSaveOrUpdate(false)} disabled={!selectedClassId || isSaving}>
                        <CheckCircle className="mr-2"/> {isSaving ? 'Assigning...' : 'Approve and Assign'}
                    </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withAuth(CreateTestPage, ['teacher']);
