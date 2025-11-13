
import React, { useState } from 'react';
import { Job, JobType } from '../types';

interface AddJobFormProps {
  onAddJob: (job: Omit<Job, 'id' | 'attempts' | 'isComplete' | 'assignedDate'>) => void;
}

const AddJobForm: React.FC<AddJobFormProps> = ({ onAddJob }) => {
  const [defendantName, setDefendantName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<JobType>(JobType.RESIDENTIAL);
  const [specialHandling, setSpecialHandling] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!defendantName.trim() || !address.trim()) {
      alert('Please fill out all fields.');
      return;
    }
    onAddJob({ defendantName, address, type, specialHandling });
    setDefendantName('');
    setAddress('');
    setType(JobType.RESIDENTIAL);
    setSpecialHandling(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-4 p-4 bg-gray-700/50 rounded-lg">
      <div>
        <label htmlFor="defendantName" className="block text-sm font-medium text-gray-300">Defendant Name</label>
        <input
          type="text"
          id="defendantName"
          value={defendantName}
          onChange={(e) => setDefendantName(e.target.value)}
          className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
          required
        />
      </div>
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-300">Address</label>
        <input
          type="text"
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
          required
        />
      </div>
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-300">Job Type</label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as JobType)}
          className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
        >
          <option value={JobType.RESIDENTIAL}>Residential</option>
          <option value={JobType.BUSINESS}>Business</option>
        </select>
      </div>
      <div className="flex items-center">
        <input
            id="specialHandling"
            type="checkbox"
            checked={specialHandling}
            onChange={(e) => setSpecialHandling(e.target.checked)}
            className="h-4 w-4 text-cyan-600 bg-gray-900 border-gray-600 rounded focus:ring-cyan-500"
        />
        <label htmlFor="specialHandling" className="ml-2 block text-sm text-gray-300">
            Special Handling (space out attempts)
        </label>
      </div>
      <button
        type="submit"
        className="w-full bg-cyan-600 text-white py-2 px-4 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500"
      >
        Add Job
      </button>
    </form>
  );
};

export default AddJobForm;
