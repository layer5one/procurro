
import React, { useState } from 'react';
import { Job, AttemptType } from '../types';
import { BuildingIcon, HomeIcon, CheckCircleIcon, ClockIcon } from './icons';

interface JobCardProps {
  job: Job;
  onUpdateJob: (jobId: number, updatedFields: Partial<Job>) => void;
  onAddAttempt: (jobId: number, attemptType: AttemptType) => void;
  onMarkServed: (jobId: number) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onAddAttempt, onMarkServed }) => {
  const [showAttemptOptions, setShowAttemptOptions] = useState(false);

  const handleAddAttempt = (type: AttemptType) => {
    onAddAttempt(job.id, type);
    setShowAttemptOptions(false);
  };
  
  const handleMarkServed = () => {
    onMarkServed(job.id);
  }

  const attemptTypes: AttemptType[] = [AttemptType.MORNING, AttemptType.AFTERNOON, AttemptType.EVENING, AttemptType.WEEKEND];

  return (
    <div className="bg-gray-700/50 p-4 rounded-lg shadow-md border border-gray-600">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg text-cyan-400">{job.defendantName}</h3>
          <p className="text-sm text-gray-300 flex items-center mt-1">
             {job.type === 'business' ? <BuildingIcon className="h-4 w-4 mr-2" /> : <HomeIcon className="h-4 w-4 mr-2" />}
            {job.address}
          </p>
        </div>
        <div className="text-right">
             <p className="text-xs text-gray-400">Assigned: {job.assignedDate}</p>
             {job.specialHandling && <p className="text-xs text-yellow-400">Special</p>}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-sm font-medium text-gray-200">Attempts: {job.attempts.length} / 4</p>
        <div className="flex space-x-2 mt-1 flex-wrap">
          {job.attempts.map((att, index) => (
            <span key={index} className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded-full">{att.type}</span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex space-x-2">
        <button onClick={handleMarkServed} className="flex-1 bg-green-600 text-white px-3 py-2 text-sm rounded-md hover:bg-green-700 transition-colors flex items-center justify-center space-x-1">
            <CheckCircleIcon className="h-4 w-4"/>
            <span>Served</span>
        </button>
        <div className="relative flex-1">
            <button onClick={() => setShowAttemptOptions(prev => !prev)} className="w-full bg-blue-600 text-white px-3 py-2 text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1">
                <ClockIcon className="h-4 w-4"/>
                <span>Log Attempt</span>
            </button>
            {showAttemptOptions && (
                 <div className="absolute bottom-full mb-2 w-full bg-gray-800 border border-gray-600 rounded-md shadow-lg z-10">
                    {attemptTypes.map(type => (
                        <button key={type} onClick={() => handleAddAttempt(type)} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">{type}</button>
                    ))}
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default JobCard;
