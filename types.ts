
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

export enum ClosureReason {
  SERVED = 'Successfully Served',
  DOES_NOT_RESIDE = 'Does Not Reside / Vacant',
  INVALID_ADDRESS = 'Invalid Address / No Structure',
  DILIGENCE_MET = 'Diligence Met (Max Attempts)',
  OTHER = 'Other (See Notes)'
}

export interface Attempt {
  id: string; // Unique ID for export tracking
  date: string;
  timestamp: string; // ISO string for sorting
  type: AttemptType;
  success: boolean; 
  notes?: string;
  gpsCoordinates?: { lat: number; lng: number };
  evidenceImage?: string; 
  isClosure?: boolean; 
  closureReason?: ClosureReason;
  reported: boolean; // True if this attempt has been exported to CSV already
}

export interface Job {
  id: number;
  defendantName: string;
  address: string;
  geoCoordinates?: { lat: number; lng: number };
  type: JobType;
  assignedDate: string;
  specialHandling: boolean;
  attempts: Attempt[];
  isComplete: boolean;
  closureReason?: ClosureReason;
  sourceEmail?: string; // Track where it came from
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
