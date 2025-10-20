import { Timestamp } from "firebase/firestore";

// For MCQ Test Generation
export type MCQQuestion = {
  question: string;
  options: string[];
  answer: string;
  type: 'mcq';
};

// For Subjective Test Generation
export type SubjectiveQuestion = {
  question: string;
  type: 'subjective';
}

// For Flash Card Generation
export type FlashCard = {
  front: string;
  back: string;
}

// For Test Evaluation
export type QuestionForEvaluation = {
  question: string;
  type: 'mcq' | 'subjective';
  correctAnswer?: string;
  options?: string[];
};

export type EvaluationResult = {
  question: string;
  type: 'mcq' | 'subjective';
  userAnswer: string;
  isCorrect: boolean;
  explanation: string;
};

// For Chat History
export type ChatMessageUI = {
  id: string;
  role: 'user' | 'assistant';
  content: React.ReactNode;
  rawText?: string;
};

// Firestore Document Types
export type UserRole = 'parent' | 'teacher' | 'student';

export type UserProfile = {
  uid: string;
  email: string;
  role: UserRole;

  // Existing fields
  classIds?: string[];   // Only for students
  studentIds?: string[]; // Only for parents (legacy array approach if you keep it)

  // 🔹 Added for parent dashboard & lookups
  displayName?: string;  // Student/teacher/parent display name
  className?: string;    // e.g., "Class 9 - B" (handy to show under the child's name)
};

export type Class = {
  id: string;
  name: string;
  division: string;
  teacherId: string | null;
  studentIds: string[];
};

export type Test = {
  id: string;
  name: string;
  classId: string | null; // Can be null for drafts
  questions: (MCQQuestion | SubjectiveQuestion)[];
  createdBy: string; // teacher's uid
  createdAt: Timestamp;
  isDraft: boolean;
  documentBase64?: string; // Storing uploaded PDF as base64
};

export type Submission = {
  id: string;
  testId: string;
  studentId: string;
  classId: string;
  answers: string[];
  evaluation: {
    results: EvaluationResult[];
    overallFeedback: string;
  } | null; // Can be null until evaluation is complete
  submittedAt: Timestamp;
};

export type VisualAid = {
  imageDataUri: string;
  prompt: string;
}

// ---- New Types for Chat and Community ----

export type Chat = {
  id: string;
  participants: string[]; // array of user UIDs
  lastMessage: {
    text: string;
    timestamp: Timestamp;
    senderId: string;
  } | null;
  participantProfiles: UserProfile[];
}

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
}

export type CommunityPost = {
  id: string;
  title: string;
  content: string;
  mediaUrl?: string; // URL from Cloudinary
  mediaType?: 'image' | 'video' | 'document';
  createdBy: string; // user's uid
  createdAt: Timestamp;
  authorProfile?: UserProfile;
}

export type Call = {
  id: string;
  channelName: string;
  callerId: string;
  receiverId: string;
  status: 'ringing' | 'answered' | 'declined' | 'ended';
  createdAt: Timestamp;
  participants: string[];
  callerProfile?: UserProfile;
}

// ---- 🔹 New: Parent–Child mapping doc (parents/{parentUid}/children/{childUid}) ----
export type ParentChildLink = {
  childUid: string;
  linkedAt: number; // Date.now() at link time
};
