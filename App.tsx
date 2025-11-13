
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Job, Schedule, Attempt, JobType, AttemptType } from './types';
import { INITIAL_JOBS } from './constants';
import { generateWeeklySchedule } from './services/geminiService';
import AddJobForm from './components/AddJobForm';
import JobCard from './components/JobCard';
import ScheduleDisplay from './components/ScheduleDisplay';
import VoiceAssistant from './components/VoiceAssistant';
import { SparklesIcon, MapPinIcon, LoaderIcon } from './components/icons';

export default function App() {
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        console.warn(`ERROR(${err.code}): ${err.message}`);
        setError("Geolocation is not available. Using a default location for routing.");
      }
    );
  }, []);

  const activeJobs = useMemo(() => jobs.filter(job => !job.isComplete), [jobs]);

  const handleGenerateSchedule = useCallback(async () => {
    if (!activeJobs.length) {
      setError("No active jobs to schedule.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSchedule(null);
    try {
      const generatedSchedule = await generateWeeklySchedule(activeJobs, userLocation);
      setSchedule(generatedSchedule);
    } catch (e) {
      console.error(e);
      setError("Failed to generate schedule. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [activeJobs, userLocation]);

  const addJob = (newJob: Omit<Job, 'id' | 'attempts' | 'isComplete' | 'assignedDate'>) => {
    const job: Job = {
      ...newJob,
      id: Date.now(),
      attempts: [],
      isComplete: false,
      assignedDate: new Date().toISOString().split('T')[0],
    };
    setJobs(prevJobs => [job, ...prevJobs]);
    setIsFormVisible(false);
  };

  const updateJob = (jobId: number, updatedFields: Partial<Job>) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === jobId ? { ...job, ...updatedFields } : job
      )
    );
  };

  const addAttempt = (jobId: number, attemptType: AttemptType) => {
    setJobs(prevJobs =>
      prevJobs.map(job => {
        if (job.id === jobId) {
          const newAttempt: Attempt = {
            date: new Date().toISOString(),
            type: attemptType,
            success: false,
          };
          const updatedAttempts = [...job.attempts, newAttempt];
          const isComplete = updatedAttempts.length >= 4;
          return { ...job, attempts: updatedAttempts, isComplete };
        }
        return job;
      })
    );
  };
  
  const markServed = (jobId: number) => {
     setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === jobId ? { ...job, isComplete: true } : job
      )
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <MapPinIcon className="h-8 w-8 text-cyan-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Process Server Route Planner</h1>
          </div>
          <VoiceAssistant jobs={activeJobs} addAttempt={addAttempt} markServed={markServed} />
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Active Jobs ({activeJobs.length})</h2>
              <button
                onClick={() => setIsFormVisible(prev => !prev)}
                className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium"
              >
                {isFormVisible ? 'Close Form' : '+ New Job'}
              </button>
            </div>
            {isFormVisible && <AddJobForm onAddJob={addJob} />}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {activeJobs.length > 0 ? (
                    activeJobs.map(job => (
                    <JobCard key={job.id} job={job} onUpdateJob={updateJob} onAddAttempt={addAttempt} onMarkServed={markServed} />
                    ))
                ) : (
                    <p className="text-gray-400 text-center py-4">No active jobs.</p>
                )}
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
            <h2 className="text-xl font-semibold mb-4 text-white">Weekly Schedule</h2>
            <button
              onClick={handleGenerateSchedule}
              disabled={isLoading || activeJobs.length === 0}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mb-4 shadow-lg"
            >
              {isLoading ? (
                <>
                  <LoaderIcon className="animate-spin h-5 w-5" />
                  <span>Generating Schedule...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5" />
                  <span>Generate AI-Powered Schedule</span>
                </>
              )}
            </button>
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg text-center">{error}</p>}
            
            {schedule ? (
                <ScheduleDisplay schedule={schedule} jobs={jobs} />
            ) : (
                 !isLoading && <div className="text-center py-10 text-gray-400">
                    <p>Click the button above to generate an optimized weekly schedule.</p>
                    <p className="text-sm mt-2">Uses Gemini 2.5 Pro with advanced thinking capabilities.</p>
                </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
