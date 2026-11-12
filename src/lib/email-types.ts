export interface EmailReviewAssessment {
  id: string;
  name: string;
  course: string;
  score: number | null;
  maxScore: number;
  status: string;
  revision: string;
  dueDate: string | null;
  deadlineRevision: string;
}
export interface EmailReviewUpdate {
  sourceEmails?: Array<{ id: string; sender: string; receivedAt: string; gmailUrl: string }>;
  id: string;
  subject: string;
  sender: string;
  receivedAt: string;
  excerpt: string;
  contentVersion?: number;
  bodyTruncated?: boolean;
  score: number | null;
  maxScore: number | null;
  suggestedAssessmentId: string | null;
  gmailUrl: string;
  kind: 'GRADE' | 'ANNOUNCEMENT' | 'ASSESSMENT_CHANGE';
  read: boolean;
  proposedDeadline: { date: string; time: string | null } | null;
}
export interface EmailOverview {
  releaseAvailable?: boolean;
  configured: boolean;
  connection: null | {
    email: string;
    autoSync: boolean;
    query: string;
    connectedAt: string;
    lastCheckedAt: string | null;
    lastError: string | null;
    moreAvailable: boolean;
  };
  updates: EmailReviewUpdate[];
  assessments: EmailReviewAssessment[];
  automaticGrades?: Array<{
    id: string;
    assessmentId: string | null;
    score: number | null;
    maxScore: number | null;
    receivedAt: string;
    subject: string;
    alreadyRecorded: boolean;
    gmailUrl: string;
  }>;
}
