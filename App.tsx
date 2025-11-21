
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Job, Schedule, Attempt, JobType, AttemptType, ClosureReason } from './types';
import { INITIAL_JOBS } from './constants';
import { generateWeeklySchedule } from './services/geminiService';
import AddJobForm from './components/AddJobForm';
import JobCard from './components/JobCard';
import ScheduleDisplay from './components/ScheduleDisplay';
import VoiceAssistant from './components/VoiceAssistant';
import { SparklesIcon, MapPinIcon, LoaderIcon, CheckCircleIcon } from './components/icons';

// Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

const deg2rad = (deg: number) => deg * (Math.PI / 180);

const MOCK_COORDS: Record<string, {lat: number, lng: number}> = {
    "123 E Main St, Phoenix, AZ 85004": { lat: 33.4484, lng: -112.0740 },
    "455 N 3rd St, Phoenix, AZ 85004": { lat: 33.4520, lng: -112.0690 },
    "789 W Thomas Rd, Phoenix, AZ 85013": { lat: 33.4800, lng: -112.0840 },
    "101 S Mill Ave, Tempe, AZ 85281": { lat: 33.4240, lng: -111.9390 }
};

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [nearbyJobId, setNearbyJobId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  
  // Settings / API Key State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // Persistence Logic
  useEffect(() => {
    const savedJobs = localStorage.getItem('ps_planner_jobs');
    if (savedJobs) {
      try {
        setJobs(JSON.parse(savedJobs));
      } catch (e) {
        console.error("Failed to load jobs", e);
        setJobs(INITIAL_JOBS);
      }
    } else {
      setJobs(INITIAL_JOBS);
    }

    // Load API Key
    const storedKey = localStorage.getItem('ps_planner_api_key');
    if (storedKey) {
        setApiKey(storedKey);
        setApiKeySaved(true);
    }
  }, []);

  useEffect(() => {
    if (jobs.length > 0) {
      localStorage.setItem('ps_planner_jobs', JSON.stringify(jobs));
    }
  }, [jobs]);

  // Hydrate mock coords if missing
  useEffect(() => {
      setJobs(prev => prev.map(j => {
        if (!j.geoCoordinates && MOCK_COORDS[j.address]) {
          return { ...j, geoCoordinates: MOCK_COORDS[j.address] };
        }
        return j;
      }));
  }, []);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;
        setUserLocation({ lat: currentLat, lng: currentLng });

        const nearby = jobs.find(job => {
            if (job.isComplete || !job.geoCoordinates) return false;
            const dist = calculateDistance(currentLat, currentLng, job.geoCoordinates.lat, job.geoCoordinates.lng);
            return dist < 0.1; 
        });

        if (nearby && nearby.id !== nearbyJobId) {
            setNearbyJobId(nearby.id);
        } else if (!nearby) {
            setNearbyJobId(null);
        }
      },
      (err) => console.warn(`GPS Warn: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [jobs, nearbyJobId]);

  const activeJobs = useMemo(() => jobs.filter(job => !job.isComplete), [jobs]);
  const completedJobs = useMemo(() => jobs.filter(job => job.isComplete), [jobs]);

  const saveApiKey = () => {
      if(apiKey.trim()) {
          localStorage.setItem('ps_planner_api_key', apiKey);
          setApiKeySaved(true);
          setShowSettings(false);
      }
  }

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
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to generate schedule.");
      if (e.message.includes("API Key")) setShowSettings(true);
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
      geoCoordinates: MOCK_COORDS[newJob.address] 
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

  const addAttempt = (
      jobId: number, 
      attemptType: AttemptType, 
      notes?: string, 
      evidenceImage?: string, 
      gpsCoordinates?: {lat: number, lng: number},
      isClosure: boolean = false,
      closureReason?: ClosureReason
  ) => {
    setJobs(prevJobs =>
      prevJobs.map(job => {
        if (job.id === jobId) {
          const success = closureReason === ClosureReason.SERVED;
          const newAttempt: Attempt = {
            id: crypto.randomUUID(),
            date: new Date().toLocaleDateString(),
            timestamp: new Date().toISOString(),
            type: attemptType,
            success, 
            notes,
            evidenceImage,
            gpsCoordinates,
            isClosure,
            closureReason,
            reported: false
          };
          
          const updatedAttempts = [...job.attempts, newAttempt];
          const isComplete = isClosure || updatedAttempts.length >= 4;

          return { 
              ...job, 
              attempts: updatedAttempts, 
              isComplete,
              closureReason: isClosure ? closureReason : undefined
          };
        }
        return job;
      })
    );
  };

  const markServed = (jobId: number) => {
      addAttempt(jobId, AttemptType.ANY, "Marked via Voice Assistant", undefined, undefined, true, ClosureReason.SERVED);
  }

  const exportToCSV = () => {
    // Find unreported attempts
    const unreportedAttempts: Array<{job: Job, attempt: Attempt}> = [];
    jobs.forEach(job => {
        job.attempts.forEach(att => {
            if (!att.reported) unreportedAttempts.push({job, attempt: att});
        });
    });

    if (unreportedAttempts.length === 0) {
        alert("No new attempts to export.");
        return;
    }

    // Generate CSV Content
    const headers = ["JobID", "Defendant", "Address", "AttemptDate", "Timestamp", "Type", "Disposition", "Notes", "Lat", "Lng", "ImageURL"];
    const rows = unreportedAttempts.map(({job, attempt}) => [
        job.id,
        `"${job.defendantName}"`,
        `"${job.address}"`,
        attempt.date,
        attempt.timestamp,
        attempt.type,
        attempt.success ? "SERVED" : (attempt.closureReason || "ATTEMPT"),
        `"${attempt.notes || ''}"`,
        attempt.gpsCoordinates?.lat || '',
        attempt.gpsCoordinates?.lng || '',
        attempt.evidenceImage ? "Image Data Present" : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(r => r.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `process_server_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Mark as reported
    setJobs(prev => prev.map(j => ({
        ...j,
        attempts: j.attempts.map(a => ({ ...a, reported: true }))
    })));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans pb-20">
      {/* Active Route Banner */}
      {nearbyJobId && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-cyan-900 to-blue-900 border-t border-cyan-500 p-4 shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="container mx-auto flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                      <div className="bg-cyan-500/20 p-2 rounded-full animate-pulse">
                        <MapPinIcon className="h-6 w-6 text-cyan-400" />
                      </div>
                      <div>
                          <p className="text-xs text-cyan-300 uppercase font-bold tracking-wider">You have arrived</p>
                          <p className="font-bold text-white">
                              {jobs.find(j => j.id === nearbyJobId)?.address}
                          </p>
                      </div>
                  </div>
                  <button 
                    onClick={() => document.getElementById(`job-card-${nearbyJobId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                    className="bg-white text-cyan-900 font-bold px-4 py-2 rounded-full text-sm hover:bg-cyan-50 transition-colors"
                  >
                      Log Visit
                  </button>
              </div>
          </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
              <div className="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-md w-full border border-cyan-500/30">
                  <h2 className="text-xl font-bold text-white mb-4">App Settings</h2>
                  <div className="mb-4">
                      <label className="block text-sm text-gray-300 mb-2">Gemini API Key</label>
                      <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white focus:border-cyan-500 outline-none"
                        placeholder="Paste your API key here..."
                      />
                      <p className="text-xs text-gray-500 mt-2">
                          Required for Route Planning and Smart Import. Saved locally on your device.
                      </p>
                  </div>
                  <div className="flex justify-end space-x-3">
                      <button 
                        onClick={() => setShowSettings(false)}
                        className="px-4 py-2 text-gray-400 hover:text-white"
                      >
                          Close
                      </button>
                      <button 
                        onClick={saveApiKey}
                        className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-500 font-bold"
                      >
                          Save Key
                      </button>
                  </div>
              </div>
          </div>
      )}

      <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10 shadow-lg border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-cyan-500/10 p-2 rounded-full">
              <MapPinIcon className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white leading-none">Process Server <span className="text-cyan-400">CMS</span></h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Gemini 3.0 Integrated</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
                onClick={() => setShowSettings(true)}
                className={`p-2 rounded-full ${apiKeySaved ? 'text-gray-400 hover:text-white' : 'text-red-400 animate-pulse'}`}
                title="Settings"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <VoiceAssistant jobs={activeJobs} addAttempt={(id, type) => addAttempt(id, type)} markServed={markServed} />
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        
        {/* Top Controls */}
        <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
             <div className="flex space-x-2 bg-gray-800 p-1 rounded-lg">
                 <button 
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'active' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                 >
                     Active Route
                 </button>
                 <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                 >
                     Case History
                 </button>
             </div>

             <div className="flex gap-2">
                 <button
                    onClick={exportToCSV}
                    className="bg-emerald-900/50 border border-emerald-800 text-emerald-200 hover:bg-emerald-800 hover:text-white px-4 py-2 rounded-lg text-sm flex items-center transition-colors"
                 >
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Export Batch
                 </button>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: JOB LIST */}
            <div className="lg:col-span-1 flex flex-col space-y-6 order-2 lg:order-1">
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">
                        {activeTab === 'active' ? `Active Cases (${activeJobs.length})` : `Closed Cases (${completedJobs.length})`}
                    </h2>
                    {activeTab === 'active' && (
                        <button
                            onClick={() => setIsFormVisible(prev => !prev)}
                            className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium shadow-lg shadow-cyan-500/20"
                        >
                            {isFormVisible ? 'Cancel' : '+ New Job'}
                        </button>
                    )}
                </div>
                
                {isFormVisible && <AddJobForm onAddJob={addJob} />}
                
                <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                    {activeTab === 'active' ? (
                        activeJobs.length > 0 ? (
                            activeJobs.map(job => (
                                <div id={`job-card-${job.id}`} key={job.id}>
                                    <JobCard 
                                        job={job} 
                                        highlight={job.id === nearbyJobId}
                                        onUpdateJob={updateJob} 
                                        onAddAttempt={addAttempt} 
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400 border-2 border-dashed border-gray-700 rounded-lg">
                                <MapPinIcon className="h-12 w-12 mb-2 opacity-20" />
                                <p>No active jobs currently.</p>
                            </div>
                        )
                    ) : (
                        completedJobs.length > 0 ? (
                            completedJobs.map(job => (
                                <div key={job.id} className="opacity-75 hover:opacity-100 transition-opacity">
                                    <JobCard 
                                        job={job} 
                                        onUpdateJob={updateJob} 
                                        onAddAttempt={addAttempt} 
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-500">No closed cases found.</div>
                        )
                    )}
                </div>
            </div>
            </div>
            
            {/* RIGHT COLUMN: ROUTER OR DATA */}
            <div className="lg:col-span-2 order-1 lg:order-2">
             {activeTab === 'active' ? (
                <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 text-white">Optimized Route Planner</h2>
                    <button
                    onClick={handleGenerateSchedule}
                    disabled={isLoading || activeJobs.length === 0}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mb-6 shadow-lg shadow-purple-500/20 font-semibold text-lg"
                    >
                    {isLoading ? (
                        <>
                        <LoaderIcon className="animate-spin h-6 w-6" />
                        <span>Thinking (Gemini 3.0)...</span>
                        </>
                    ) : (
                        <>
                        <SparklesIcon className="h-6 w-6" />
                        <span>Generate Optimized Route</span>
                        </>
                    )}
                    </button>
                    {error && <div className="text-red-200 bg-red-900/30 border border-red-800 p-4 rounded-lg text-center mb-4">{error}</div>}
                    
                    {schedule ? (
                        <ScheduleDisplay schedule={schedule} jobs={jobs} />
                    ) : (
                        !isLoading && <div className="text-center py-12 text-gray-400 bg-gray-900/50 rounded-lg border border-gray-700/50">
                            <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                            <p className="text-lg font-medium">Ready to optimize.</p>
                            <p className="text-sm mt-2 text-gray-500 max-w-md mx-auto">
                                Using Gemini 3.0 Pro's advanced spatial reasoning to route your day, prioritizing legal service windows and traffic patterns.
                            </p>
                        </div>
                    )}
                </div>
             ) : (
                 <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full">
                     <h3 className="text-xl font-bold text-white mb-4">Activity Log & Reporting</h3>
                     <p className="text-gray-400 text-sm mb-6">
                         All attempts are stored locally. Use "Export Batch" above to generate CSV files for integration with Lumos Legal or other client portals. 
                     </p>
                     
                     <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm text-gray-400">
                            <thead className="bg-gray-700 text-gray-200 uppercase font-medium">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Defendant</th>
                                    <th className="px-4 py-3">Result</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {jobs.flatMap(j => j.attempts.map(a => ({...a, defendant: j.defendantName}))).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((att, i) => (
                                    <tr key={i} className="hover:bg-gray-700/50">
                                        <td className="px-4 py-3">{att.date} <span className="text-xs opacity-50 block">{att.type}</span></td>
                                        <td className="px-4 py-3 text-white">{att.defendant}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs border ${att.success ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-gray-600/20 border-gray-600 text-gray-300'}`}>
                                                {att.success ? 'SERVED' : (att.closureReason || 'ATTEMPT')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {att.reported ? <span className="text-green-500 text-xs">● Exported</span> : <span className="text-yellow-500 text-xs">● Pending</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                 </div>
             )}
            </div>
        </div>
      </main>
    </div>
  );
}
