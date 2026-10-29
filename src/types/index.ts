/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Performans & Proje Görev Takip Sistemi - Temel Veri Tipleri
 */

export type UserRole = 'student' | 'teacher' | 'admin';

export type UserStatus = 'active' | 'passive' | 'pending_approval';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  schoolNumber?: string; // Öğrenciler için okul numarası zorunludur
  createdAt: string;
  lastLoginAt?: string;
  avatarUrl?: string;
}

export interface SchoolSettings {
  id: string;
  schoolName: string;
  logoUrl?: string;
  activeAcademicYear: string; // Örn: '2026-2027'
  timezone: string; // 'Europe/Istanbul'
  studentMaxFileSizeMb: number; // 15
  teacherMaxFileSizeMb: number; // 20
  inactivityTimeoutMinutes: number; // 30
  updatedAt: string;
}

export interface Classroom {
  id: string;
  name: string; // Örn: '9/B', '10/B', '11/B', '12/B'
  gradeLevel: number; // 9, 10, 11, 12
  branch: string; // 'B'
  academicYear: string; // '2026-2027'
  studentCount?: number;
  isArchived: boolean;
  createdAt: string;
}

export interface Course {
  id: string;
  code: string; // Örn: 'PRG101', 'NET201'
  name: string; // Örn: 'Programlama Temelleri', 'Ağ Sistemleri ve Anahtarlama'
  description?: string;
  isArchived: boolean;
  createdAt: string;
}

export interface TeacherPermission {
  id: string;
  teacherId: string;
  classId: string;
  courseId: string;
  academicYear: string;
  assignedAt: string;
}

export interface ActivationCode {
  id: string;
  schoolNumber: string;
  codeHash: string;
  isUsed: boolean;
  usedAt?: string;
  createdAt: string;
  expiresAt: string;
  generatedBy: string; // Admin user ID
}

export interface TeacherApplication {
  id: string;
  fullName: string;
  email: string;
  branchSubject: string;
  applicationNotes?: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export type DeliveryFormat = 'digital_pdf' | 'paper';

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  maxPoints: number; // Toplamları 100 olmalıdır
}

export interface RubricTemplate {
  id: string;
  title: string;
  courseId: string;
  teacherId: string;
  isShared: boolean;
  criteria: RubricCriterion[];
  createdAt: string;
}

export interface TaskPoolItem {
  id: string;
  teacherId: string;
  courseId: string;
  title: string;
  description: string;
  isShared: boolean; // Ortak görev havuzunda paylaşım
  criteria: RubricCriterion[];
  guidelinePdfUrl?: string;
  sampleFiles?: { name: string; url: string; sizeBytes: number }[];
  externalLinks?: { title: string; url: string }[];
  createdAt: string;
}

export interface TaskAssignment {
  id: string;
  taskPoolId?: string;
  teacherId: string;
  courseId: string;
  classId: string;
  academicYear: string;
  term: 1 | 2;
  title: string;
  description: string;
  deliveryFormat: DeliveryFormat;
  dueDate: string; // ISO string (Europe/Istanbul)
  allowLateSubmission: boolean;
  guidelinePdfUrl?: string;
  sampleFiles?: { name: string; url: string; sizeBytes: number }[];
  externalLinks?: { title: string; url: string }[];
  criteria: RubricCriterion[];
  status: 'draft' | 'published' | 'archived';
  reminderDaysBeforeDue: number[]; // Örn: [3, 1]
  createdAt: string;
  publishedAt?: string;
}

export type StudentTaskStatus =
  | 'not_submitted'
  | 'submitted'
  | 'late_submitted'
  | 'paper_reported'
  | 'paper_confirmed'
  | 'graded';

export interface SubmissionVersion {
  id: string;
  studentTaskId: string;
  versionNumber: number;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  submittedAt: string;
  isLate: boolean;
}

export interface StudentTaskAssignment {
  id: string;
  assignmentId: string;
  studentId: string;
  studentSchoolNumber: string;
  studentName: string;
  classId: string;
  status: StudentTaskStatus;
  currentSubmissionId?: string;
  submissionCount: number;
  paperDeliveryReportedAt?: string;
  paperDeliveryConfirmedAt?: string;
  paperDeliveryConfirmedBy?: string;
  extensionRequested: boolean;
  extensionReason?: string;
  extensionRequestedAt?: string;
  extensionDueDate?: string;
  extensionStatus: 'none' | 'pending' | 'approved' | 'rejected';
  extensionReviewedAt?: string;
  extensionReviewedBy?: string;
  evaluationId?: string;
  score?: number; // 0-100, 0.1 hassasiyetinde
  createdAt: string;
}

export interface CriterionGrade {
  criterionId: string;
  score: number; // 0.1 hassasiyetinde, <= maxPoints
  comment?: string;
}

export interface TaskEvaluation {
  id: string;
  studentTaskId: string;
  assignmentId: string;
  teacherId: string;
  status: 'draft' | 'finalized';
  scores: CriterionGrade[];
  totalScore: number; // Toplam puan
  generalComment?: string;
  createdAt: string;
  finalizedAt?: string;
  updatedAt: string;
}

export interface GradeChangeLog {
  id: string;
  evaluationId: string;
  studentTaskId: string;
  oldScore: number;
  newScore: number;
  changedBy: string; // Teacher user ID
  changedByName: string;
  changeReason: string;
  changedAt: string;
}

export interface SystemNotification {
  id: string;
  userId: string;
  recipientRole: UserRole;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'deadline' | 'evaluation';
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface BackupRecord {
  id: string;
  timestamp: string;
  type: 'automated' | 'manual';
  fileName: string;
  fileSizeBytes: number;
  status: 'success' | 'failed';
  errorDetails?: string;
  storageLocation: string;
  retentionUntil: string; // 30 gün
}

export interface ExcelImportRow {
  rowNumber: number;
  schoolNumber: string;
  fullName: string;
  className: string;
  isValid: boolean;
  errors: string[];
}
