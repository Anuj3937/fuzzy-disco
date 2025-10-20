
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  BookText,
  ClipboardCheck,
  FileUp,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  X,
  ChevronDown,
  Layers3,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  generateMCQTest,
  type GenerateMCQTestOutput,
} from "@/ai/flows/generate-mcq-test";
import {
  generateSubjectiveTest,
  type GenerateSubjectiveTestOutput,
} from "@/ai/flows/generate-subjective-test";
import {
  summarizeDocument,
  type SummarizeDocumentOutput,
} from "@/ai/flows/summarize-document";
import {
  evaluateTestResults,
  type EvaluateTestResultsOutput,
} from "@/ai/flows/evaluate-test-results";
import {
  generateFlashCards,
  type GenerateFlashCardsOutput,
} from "@/ai/flows/generate-flash-cards";
import { generateVisualAid } from "@/ai/flows/generate-visual-aid";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { ChatMessageUI, QuestionForEvaluation, MCQQuestion, SubjectiveQuestion, VisualAid } from "@/lib/types";
import AppHeader from "@/components/AppHeader";
import withAuth from "@/components/auth/withAuth";


type TestType = "mcq" | "subjective";
type ActionType = "summary" | "mcq" | "subjective" | "flashcards" | "visual";
type FileState = { name: string; dataUri: string };

type TestData = {
  questions: (MCQQuestion | SubjectiveQuestion)[];
  type: TestType;
  topic: string;
};

const Flashcard = ({ front, back }: { front: string; back: string }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  return (
    <div
      className="relative w-full h-40 perspective-1000"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        className={cn(
          "absolute w-full h-full transition-transform duration-700 transform-style-preserve-3d",
          isFlipped ? "rotate-y-180" : ""
        )}
      >
        <div className="absolute w-full h-full backface-hidden flex items-center justify-center p-4 bg-card rounded-lg border shadow-md">
          <p className="text-center font-medium">{front}</p>
        </div>
        <div className="absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center p-4 bg-card rounded-lg border shadow-md">
          <p className="text-center text-sm">{back}</p>
        </div>
      </div>
    </div>
  );
};

function PrepPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessageUI[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [file, setFile] = useState<FileState | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType>("summary");
  const [lastTopic, setLastTopic] = useState<string>("");

  const [testData, setTestData] = useState<TestData | null>(null);
  const [testAnswers, setTestAnswers] = useState<string[]>([]);
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const nextId = useRef(0);

  useEffect(() => {
    chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
  }, [chatHistory]);
  
  const addMessage = (role: 'user' | 'assistant', content: React.ReactNode, isRawText = false) => {
    const textContent = isRawText ? content : (content as React.ReactElement)?.props?.children;
    setChatHistory(prev => [...prev, { 
        id: `${Date.now()}-${nextId.current++}`, 
        role, 
        content,
        // Store raw text for history context
        rawText: typeof textContent === 'string' ? textContent : undefined,
    }]);
  };
  
  const handleAnswerChange = (qIndex: number, value: string) => {
    setTestAnswers(prevAnswers => {
        const newAnswers = [...prevAnswers];
        newAnswers[qIndex] = value;
        return newAnswers;
    });
  };

  const handleTestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!testData) return;

    setIsSubmittingTest(true);

    try {
      const questionsForEval: QuestionForEvaluation[] = testData.questions.map((q) => ({
        question: q.question,
        type: testData.type,
        ...(testData.type === 'mcq' && { options: (q as MCQQuestion).options, correctAnswer: (q as MCQQuestion).answer })
      }));
        
      const result: EvaluateTestResultsOutput = await evaluateTestResults({
        questions: questionsForEval,
        answers: testAnswers,
        topic: testData.topic,
      });

      setTestData(null);

      addMessage('assistant',
        <div className="space-y-4">
          <h3 className="font-semibold text-lg mb-2 flex items-center">
            <ClipboardCheck className="h-5 w-5 mr-2 text-accent" /> Test Evaluation
          </h3>
          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Overall Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{result.overallFeedback}</p>
            </CardContent>
          </Card>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>View Detailed Results</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {result.results.map((res, index) => (
                    <Card key={index} className={cn(res.type === 'mcq' ? (res.isCorrect ? 'border-green-500' : 'border-red-500') : 'border-border')}>
                      <CardHeader className={cn('p-4', res.type === 'mcq' ? (res.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10') : 'bg-muted/30')}>
                        <p className="font-semibold text-sm flex items-center">
                          {res.type === 'mcq' && (res.isCorrect ? 
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" /> : 
                            <XCircle className="h-4 w-4 mr-2 text-red-600" />
                          )}
                          Question {index + 1}: {res.question}
                        </p>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2 text-xs">
                        <div>
                          <p className="font-semibold mb-1">Your Answer:</p>
                          <p className="text-muted-foreground p-2 bg-muted/50 rounded-md">{res.userAnswer || "No answer provided."}</p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">Explanation:</p>
                          <p className="text-muted-foreground p-2 bg-muted/50 rounded-md">{res.explanation}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      );
    } catch (error) {
      console.error("Evaluation failed:", error);
      toast({ variant: "destructive", title: "Evaluation Failed", description: "Could not evaluate test results." });
      setTestData(null);
    } finally {
        setIsSubmittingTest(false);
    }
  };


  const executeAction = async (action: ActionType, topic: string, document?: FileState) => {
    setIsLoading(true);
    setLastTopic(topic);
    
    // Create a simplified history for the AI model
    const historyForAI = chatHistory.map(msg => ({
        role: msg.role,
        content: msg.rawText || (typeof msg.content === 'string' ? msg.content : 'Complex UI Component')
    })).filter(msg => msg.content !== 'Complex UI Component');

    try {
      if (action === "summary") {
        addMessage('user', `Summarize: ${topic} ${document ? `(from ${document.name})` : ''}`, true);
        const result: SummarizeDocumentOutput = await summarizeDocument({ 
            topic: topic, 
            documentDataUri: document?.dataUri 
        });
        addMessage('assistant',
          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center"><Sparkles className="h-5 w-5 mr-2 text-accent" /> AI Summary</h3>
            <p className="whitespace-pre-wrap text-sm">{result.summary}</p>
          </div>
        );
      } else if (action === 'visual') {
        addMessage('user', `Generate a visual aid for "${topic}".`, true);
        const result: VisualAid = await generateVisualAid({ topic: topic, history: historyForAI });
        addMessage('assistant',
          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center"><ImageIcon className="h-5 w-5 mr-2 text-accent" /> Visual Aid</h3>
            <p className="text-sm text-muted-foreground mb-2 italic">{result.prompt}</p>
            <Image 
              src={result.imageDataUri}
              alt={result.prompt}
              width={512}
              height={512}
              className="rounded-lg shadow-md"
            />
          </div>
        );
      } else if (action === "mcq" || action === "subjective") {
        addMessage('user', `Generate a ${action.toUpperCase()} test on "${topic}" ${document ? `using the document ${document.name}` : ''}.`, true);
        const result = action === "mcq"
          ? await generateMCQTest({ topic: topic, documentDataUri: document?.dataUri, numberOfQuestions: 5, history: historyForAI })
          : await generateSubjectiveTest({ topic: topic, documentDataUri: document?.dataUri, history: historyForAI });
        
        const questions = 'questions' in result ? result.questions : [];
        if (questions.length > 0) {
          const testQuestions = action === 'mcq' 
            ? (questions as { question: string; options: string[]; answer: string }[]).map(q => ({...q, type: 'mcq' as const}))
            : (questions as string[]).map(q => ({ question: q, type: 'subjective' as const }));
          
          setTestAnswers(Array(questions.length).fill(""));
          setTestData({
            questions: testQuestions,
            type: action,
            topic: topic,
          });
        } else {
          addMessage('assistant', "Sorry, I couldn't generate a test for that. Please try again.", true);
        }
      } else if (action === "flashcards") {
        addMessage('user', `Generate flashcards for "${topic}" ${document ? `using the document ${document.name}` : ''}.`, true);
        const result: GenerateFlashCardsOutput = await generateFlashCards({
          topic: topic,
          documentDataUri: document?.dataUri,
          numberOfCards: 5,
          history: historyForAI
        });
        addMessage('assistant',
          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center">
              <Layers3 className="h-5 w-5 mr-2 text-accent" /> Flashcards Generated
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Click on a card to flip it.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.cards.map((card, index) => (
                <Flashcard key={index} front={card.front} back={card.back} />
              ))}
            </div>
          </div>
        );
      }
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
      toast({ variant: "destructive", title: "Action Failed", description: "Something went wrong. This can happen if the topic is too sensitive or the document is unreadable." });
      addMessage('assistant', "Sorry, I encountered an error. Please try again.", true);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || testData) return;

    const topic = currentPrompt.trim() || file?.name || lastTopic;
    const documentToProcess = file;
    
    if (!topic) {
        toast({ variant: "destructive", title: "Input Required", description: "Please enter a topic or upload a file."});
        return;
    }

    setCurrentPrompt("");
    // Keep file for context unless a new one is uploaded
    // setFile(null); 
    await executeAction(selectedAction, topic, documentToProcess ?? undefined);
  };

  const resetState = () => {
    setIsLoading(false);
    setChatHistory([]);
    setCurrentPrompt("");
    setFile(null);
    setTestData(null);
    setLastTopic("");
    setTestAnswers([]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileState = { name: selectedFile.name, dataUri: e.target?.result as string };
        setFile(fileState);
        setLastTopic(selectedFile.name.split('.').slice(0, -1).join('.') || selectedFile.name);
      };
      reader.readAsDataURL(selectedFile);
    }
    if(event.target) {
        event.target.value = "";
    }
  };

  if (testData) {
    const { questions, type, topic } = testData;
    const allQuestionsAnswered = testAnswers.every(answer => answer && answer.trim() !== "");

    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex h-16 items-center justify-between">
                       <Button variant="ghost" size="sm" onClick={() => setTestData(null)} disabled={isSubmittingTest}>
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Back to Chat
                      </Button>
                      <h2 className="text-lg font-semibold text-foreground">
                          {type === 'mcq' ? 'MCQ Test' : 'Subjective Test'} on {topic}
                      </h2>
                      <div className="w-32"></div>
                  </div>
              </div>
            </header>
            <main className="flex-grow overflow-y-auto">
             <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="max-w-4xl mx-auto">
                <form onSubmit={handleTestSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>{type === 'mcq' ? 'Multiple-Choice Question Test' : 'Subjective Question Test'}</CardTitle>
                            <CardDescription>Answer all questions to the best of your ability.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {questions.map((q, qIndex) => (
                                <div key={qIndex}>
                                    <Label className="font-semibold text-base">Question {qIndex + 1}: {q.question}</Label>
                                    <div className="mt-4">
                                        {type === 'mcq' ? (
                                            <RadioGroup onValueChange={(value) => handleAnswerChange(qIndex, value)} value={testAnswers[qIndex]}>
                                                {(q as MCQQuestion).options.map((option: string, oIndex: number) => (
                                                    <div key={oIndex} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50">
                                                        <RadioGroupItem value={option} id={`q${qIndex}o${oIndex}`} />
                                                        <Label htmlFor={`q${qIndex}o${oIndex}`} className="font-normal cursor-pointer flex-grow">{option}</Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        ) : (
                                            <Textarea
                                                rows={5}
                                                value={testAnswers[qIndex]}
                                                onChange={(e) => handleAnswerChange(qIndex, e.target.value)}
                                                placeholder="Your answer here..."
                                                disabled={isSubmittingTest}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSubmittingTest || !allQuestionsAnswered} className="w-full">
                                {isSubmittingTest ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluating...</>
                                ) : 'Submit Test'}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
              </div>
             </div>
            </main>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader title="AI Tutor Session" backLink="/student">
        <Button variant="outline" size="sm" onClick={resetState}>
          New Session
        </Button>
      </AppHeader>
      
      <main className="flex-grow flex flex-col">
        <div className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full max-w-4xl">
           <ScrollArea className="h-[calc(100vh-18rem)]" ref={chatContainerRef}>
             <div className="space-y-6 pr-4">
              {chatHistory.length === 0 ? (
                <div className="text-center text-muted-foreground pt-16">
                  <BookText className="mx-auto h-12 w-12" />
                  <h3 className="mt-4 text-lg font-medium">Start your session</h3>
                  <p>Enter a topic, upload a file, and choose an action.</p>
                </div>
              ) : (
                chatHistory.map(msg => (
                  <div key={msg.id} className={cn("flex items-start gap-4", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    {msg.role === 'assistant' && (
                       <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="h-5 w-5 text-primary" />
                       </div>
                    )}
                     <div className={cn("max-w-xl rounded-lg px-4 py-3", msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                       {typeof msg.content === 'string' ? <p>{msg.content}</p> : msg.content}
                    </div>
                  </div>
                ))
              )}
               {isLoading && !testData && (
                <div className="flex justify-start">
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div className="max-w-xl rounded-lg px-4 py-3 bg-muted flex items-center">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    </div>
                </div>
              )}
             </div>
           </ScrollArea>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full max-w-4xl">
          <div className="bg-background">
            <form onSubmit={handlePromptSubmit} className="relative">
              {file && (
                <div className="absolute bottom-16 left-0 right-0 p-2">
                  <div className="flex items-center justify-between p-2 mt-2 bg-muted rounded-md text-sm max-w-md mx-auto">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      <span className="font-medium truncate">{file.name}</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex items-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} title="Upload File">
                  <FileUp className="h-4 w-4" />
                </Button>
                <input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden"/>
                <Textarea
                  value={currentPrompt}
                  onChange={e => setCurrentPrompt(e.target.value)}
                  placeholder="Enter a topic, or leave blank to use the file or previous context..."
                  rows={1}
                  className="flex-grow resize-none"
                  onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handlePromptSubmit(e);
                      }
                  }}
                />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            {selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)}
                            <ChevronDown className="ml-2 h-4 w-4"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setSelectedAction('summary')}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Summary
                        </DropdownMenuItem>
                         <DropdownMenuItem onSelect={() => setSelectedAction('visual')}>
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Visual Aid
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setSelectedAction('mcq')}>
                            <ClipboardCheck className="mr-2 h-4 w-4" />
                            MCQ Test
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setSelectedAction('subjective')}>
                            <BookText className="mr-2 h-4 w-4" />
                            Subjective Test
                        </DropdownMenuItem>
                         <DropdownMenuItem onSelect={() => setSelectedAction('flashcards')}>
                            <Layers3 className="mr-2 h-4 w-4" />
                            Flash Cards
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button type="submit" disabled={isLoading} size="icon" title="Send">
                  {isLoading ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(PrepPage, ['student']);
