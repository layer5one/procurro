
import { Job, JobType } from './types';

export const INITIAL_JOBS: Job[] = [
  {
    id: 1,
    defendantName: 'John Doe',
    address: '123 E Main St, Phoenix, AZ 85004',
    type: JobType.RESIDENTIAL,
    assignedDate: '2023-10-01',
    specialHandling: false,
    attempts: [
        { date: '2023-10-07', type: 'Weekend' as any, success: false },
    ],
    isComplete: false,
  },
  {
    id: 2,
    defendantName: 'Jane Smith',
    address: '455 N 3rd St, Phoenix, AZ 85004',
    type: JobType.BUSINESS,
    assignedDate: '2023-10-02',
    specialHandling: false,
    attempts: [],
    isComplete: false,
  },
  {
    id: 3,
    defendantName: 'ACME Corp',
    address: '789 W Thomas Rd, Phoenix, AZ 85013',
    type: JobType.BUSINESS,
    assignedDate: '2023-09-28',
    specialHandling: true,
    attempts: [
        { date: '2023-10-02', type: 'Afternoon' as any, success: false },
        { date: '2023-10-04', type: 'Morning' as any, success: false },
    ],
    isComplete: false,
  },
   {
    id: 4,
    defendantName: 'Bob Johnson',
    address: '101 S Mill Ave, Tempe, AZ 85281',
    type: JobType.RESIDENTIAL,
    assignedDate: '2023-10-05',
    specialHandling: false,
    attempts: [],
    isComplete: false,
  },
];
