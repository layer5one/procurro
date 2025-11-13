
import React from 'react';
import { Schedule, Job } from '../types';
import { MapPinIcon } from './icons';

interface ScheduleDisplayProps {
  schedule: Schedule;
  jobs: Job[];
}

const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({ schedule, jobs }) => {
  const getJobById = (id: number) => jobs.find(job => job.id === id);

  return (
    <div className="space-y-6 mt-4">
      {schedule.map(day => (
        <div key={day.day} className="bg-gray-700/50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-cyan-400 border-b border-gray-600 pb-2 mb-3">{day.day}</h3>
          {day.route.length > 0 ? (
            <ol className="space-y-3 list-decimal list-inside">
              {day.route.map((attempt, index) => {
                const job = getJobById(attempt.jobId);
                return (
                  <li key={index} className="p-3 bg-gray-800 rounded-md border border-gray-700">
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="font-semibold text-white">{attempt.time} - {job?.defendantName}</span>
                            <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                                attempt.attemptType === 'Morning' ? 'bg-yellow-900 text-yellow-300' :
                                attempt.attemptType === 'Afternoon' ? 'bg-sky-900 text-sky-300' :
                                attempt.attemptType === 'Evening' ? 'bg-indigo-900 text-indigo-300' :
                                'bg-purple-900 text-purple-300'
                            }`}>{attempt.attemptType}</span>
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 mt-1 flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        {job?.address}
                    </p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-gray-400">No jobs scheduled for this day.</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default ScheduleDisplay;
