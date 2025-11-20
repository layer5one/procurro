
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
        <div key={day.day} className="bg-gray-700/30 p-5 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between border-b border-gray-600 pb-3 mb-4">
             <h3 className="text-lg font-bold text-white">{day.day}</h3>
             <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">{day.route.length} stops</span>
          </div>
          
          {day.route.length > 0 ? (
            <div className="relative border-l-2 border-gray-600 ml-3 space-y-6 py-2">
              {day.route.map((attempt, index) => {
                const job = getJobById(attempt.jobId);
                const googleMapsUrl = job ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}` : '#';

                return (
                  <div key={index} className="ml-6 relative">
                    {/* Timeline Dot */}
                    <span className="absolute -left-[31px] top-4 h-4 w-4 rounded-full bg-gray-900 border-2 border-cyan-500"></span>
                    
                    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-cyan-500/50 transition-colors shadow-sm group">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-cyan-400 font-mono font-bold text-sm">{attempt.time}</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                                        attempt.attemptType === 'Morning' ? 'bg-yellow-900/50 text-yellow-400' :
                                        attempt.attemptType === 'Afternoon' ? 'bg-sky-900/50 text-sky-400' :
                                        attempt.attemptType === 'Evening' ? 'bg-indigo-900/50 text-indigo-400' :
                                        'bg-purple-900/50 text-purple-400'
                                    }`}>{attempt.attemptType}</span>
                                </div>
                                <h4 className="font-semibold text-white mt-1">{job?.defendantName}</h4>
                            </div>
                        </div>
                        
                        <div className="mt-2 flex items-start justify-between">
                             <p className="text-sm text-gray-400 flex items-start max-w-[70%]">
                                <MapPinIcon className="h-4 w-4 mr-1.5 mt-0.5 flex-shrink-0 text-gray-500" />
                                {job?.address}
                            </p>
                            <a 
                                href={googleMapsUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-cyan-900/50 hover:bg-cyan-600 text-cyan-200 hover:text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-1 text-xs font-bold uppercase tracking-wide border border-cyan-800 hover:border-cyan-500"
                                title="Start Navigation"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                                Navigate
                            </a>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm italic pl-2">No jobs scheduled for this day.</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default ScheduleDisplay;
