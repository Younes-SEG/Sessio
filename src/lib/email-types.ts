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
  id: string;
  subject: string;
  sender: string;
  receivedAt: string;
  excerpt: string;
  score: number | null;
  maxScore: number | null;
  suggestedAssessmentId: string | null;
  gmailUrl: string;
  kind: 'GRADE' | 'ANNOUNCEMENT' | 'ASSESSMENT_CHANGE';
  read: boolean;
  proposedDeadline: { date: string; time: string | null } | null;
}
export interface EmailOverview {
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
}
