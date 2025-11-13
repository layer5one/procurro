
export enum JobType {
  RESIDENTIAL = 'residential',
  BUSINESS = 'business'
}

export enum AttemptType {
  MORNING = 'Morning',
  AFTERNOON = 'Afternoon',
  EVENING = 'Evening',
  WEEKEND = 'Weekend',
  ANY = 'Any'
}

export interface Attempt {
  date: string;
  type: AttemptType;
  success: boolean;
}

export interface Job {
  id: number;
  defendantName: string;
  address: string;
  type: JobType;
  assignedDate: string;
  specialHandling: boolean;
  attempts: Attempt[];
  isComplete: boolean;
}

export interface ScheduledAttempt {
  jobId: number;
  time: string;
  attemptType: AttemptType;
}

export interface ScheduleDay {
  day: string;
  route: ScheduledAttempt[];
}

export type Schedule = ScheduleDay[];
