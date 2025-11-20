import { Job, JobType, AttemptType } from './types';

export const INITIAL_JOBS: Job[] = [
  {
    id: 1,
    defendantName: 'John Doe',
    address: '123 E Main St, Phoenix, AZ 85004',
    type: JobType.RESIDENTIAL,
    assignedDate: '2023-10-01',
    specialHandling: false,
    attempts: [
        { 
            id: 'init-att-1',
            date: '2023-10-07', 
            timestamp: '2023-10-07T10:00:00.000Z',
            type: AttemptType.WEEKEND, 
            success: false,
            reported: true
        },
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
        { 
            id: 'init-att-2',
            date: '2023-10-02', 
            timestamp: '2023-10-02T14:30:00.000Z',
            type: AttemptType.AFTERNOON, 
            success: false,
            reported: true 
        },
        { 
            id: 'init-att-3',
            date: '2023-10-04', 
            timestamp: '2023-10-04T09:15:00.000Z',
            type: AttemptType.MORNING, 
            success: false,
            reported: true
        },
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