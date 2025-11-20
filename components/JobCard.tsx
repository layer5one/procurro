
import React, { useState, useRef, useEffect } from 'react';
import { Job, AttemptType, ClosureReason } from '../types';
import { BuildingIcon, HomeIcon, ClockIcon, MapPinIcon, CheckCircleIcon } from './icons';

interface JobCardProps {
  job: Job;
  highlight?: boolean;
  onUpdateJob: (jobId: number, updatedFields: Partial<Job>) => void;
  onAddAttempt: (
    jobId: number, 
    attemptType: AttemptType, 
    notes?: string, 
    evidenceImage?: string, 
    gpsCoordinates?: {lat: number, lng: number},
    isClosure?: boolean,
    closureReason?: ClosureReason
  ) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, highlight = false, onAddAttempt }) => {
  const [isLoggingAttempt, setIsLoggingAttempt] = useState(false);
  const [selectedType, setSelectedType] = useState<AttemptType>(AttemptType.MORNING);
  const [notes, setNotes] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  // Closure Logic
  const [isClosingJob, setIsClosingJob] = useState(false);
  const [closureReason, setClosureReason] = useState<ClosureReason>(ClosureReason.SERVED);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const hour = new Date().getHours();
      const day = new Date().getDay();
      if (day === 0 || day === 6) {
          setSelectedType(AttemptType.WEEKEND);
      } else if (hour < 10) {
          setSelectedType(AttemptType.MORNING);
      } else if (hour >= 18) {
          setSelectedType(AttemptType.EVENING);
      } else {
          setSelectedType(AttemptType.AFTERNOON);
      }
  }, [isLoggingAttempt]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitAttempt = async () => {
    setIsLocating(true);
    
    const getLocation = (): Promise<{lat: number, lng: number} | undefined> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) resolve(undefined);
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => resolve(undefined),
                { timeout: 5000 }
            );
        });
    };

    const coords = await getLocation();
    
    onAddAttempt(
        job.id, 
        selectedType, 
        notes, 
        imagePreview || undefined, 
        coords,
        isClosingJob,
        isClosingJob ? closureReason : undefined
    );
    
    setIsLoggingAttempt(false);
    setNotes('');
    setImagePreview(null);
    setIsLocating(false);
    setIsClosingJob(false);
    setClosureReason(ClosureReason.SERVED);
  };

  const attemptTypes: AttemptType[] = [AttemptType.MORNING, AttemptType.AFTERNOON, AttemptType.EVENING, AttemptType.WEEKEND];
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`;

  // Render a simplified card if complete
  if (job.isComplete) {
      return (
        <div className="bg-gray-800 border border-gray-700 p-5 rounded-xl opacity-80 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 bg-gray-700/50 rounded-bl-xl">
                 <CheckCircleIcon className="h-5 w-5 text-gray-500" />
             </div>
             <h3 className="font-bold text-lg text-gray-300 line-through decoration-gray-500">{job.defendantName}</h3>
             <p className="text-sm text-gray-500">{job.address}</p>
             <div className="mt-3 inline-block px-3 py-1 bg-gray-700 rounded text-xs text-gray-300 border border-gray-600">
                 {job.closureReason || "Closed"}
             </div>
             <div className="mt-2 text-xs text-gray-500">
                 {job.attempts.length} attempts made.
             </div>
        </div>
      );
  }

  return (
    <div className={`bg-gray-700/40 p-5 rounded-xl shadow-md border transition-all duration-300 ${
        highlight ? 'border-cyan-400 shadow-cyan-500/20 ring-1 ring-cyan-400' : 'border-gray-600 hover:border-gray-500'
    }`}>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 mr-4">
          <h3 className="font-bold text-lg text-cyan-400 truncate">{job.defendantName}</h3>
          <a 
            href={googleMapsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-gray-300 flex items-start mt-1 hover:text-white group transition-colors"
          >
             {job.type === 'business' ? <BuildingIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-gray-500" /> : <HomeIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-gray-500" />}
             <span className="group-hover:underline break-words group-hover:text-cyan-300">{job.address}</span>
          </a>
        </div>
        <div className="text-right flex-shrink-0">
             <p className="text-xs text-gray-400">Due: {new Date(new Date(job.assignedDate).getTime() + 12096e5).toLocaleDateString()}</p>
             {job.specialHandling && <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded border border-yellow-800">Special</span>}
        </div>
      </div>

      <div className="mt-4 bg-gray-800/50 rounded-lg p-3">
        <div className="flex justify-between items-center mb-2">
             <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Attempt History ({job.attempts.length})</p>
        </div>
        <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {job.attempts.length === 0 && <span className="text-xs text-gray-500 italic">No attempts yet</span>}
          {job.attempts.map((att, index) => (
            <div key={index} className="flex-shrink-0 flex flex-col items-center group/marker relative">
                <span className={`text-[10px] px-2 py-1 rounded-full border ${
                    att.success ? 'bg-green-900/30 border-green-800 text-green-300' :
                    att.type === 'Weekend' ? 'bg-purple-900/30 border-purple-800 text-purple-300' :
                    att.type === 'Evening' ? 'bg-indigo-900/30 border-indigo-800 text-indigo-300' :
                    'bg-gray-600/30 border-gray-500 text-gray-300'
                }`}>
                    {att.success ? 'SVD' : att.type.substring(0,3)}
                </span>
                {att.gpsCoordinates && <span className="text-[8px] text-green-500 mt-0.5">📍</span>}
                {att.reported && <span className="absolute -top-1 -right-1 h-2 w-2 bg-cyan-500 rounded-full border border-gray-800" title="Exported"></span>}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {!isLoggingAttempt ? (
            <div className="flex space-x-2">
                 <a 
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2.5 rounded-lg transition-colors"
                 >
                    <MapPinIcon className="h-5 w-5" />
                 </a>
                <button onClick={() => setIsLoggingAttempt(true)} className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-3 py-2.5 text-sm font-bold rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/20">
                    <ClockIcon className="h-4 w-4"/>
                    <span>Log Visit / Close Case</span>
                </button>
            </div>
        ) : (
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 shadow-2xl">
                <h4 className="text-sm font-bold text-white mb-4 border-b border-gray-700 pb-2">Log Field Visit</h4>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">Time Block</label>
                        <div className="grid grid-cols-4 gap-1">
                            {attemptTypes.map(type => (
                                <button 
                                    key={type}
                                    onClick={() => setSelectedType(type)}
                                    className={`text-[10px] py-2 rounded border transition-all ${
                                        selectedType === type 
                                        ? 'bg-cyan-600 border-cyan-500 text-white font-bold shadow-sm' 
                                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-gray-700/30 p-3 rounded-lg border border-gray-600">
                         <div className="flex items-center justify-between mb-2">
                            <label htmlFor={`close-job-${job.id}`} className="text-sm text-white font-medium">Close Case / Finalize?</label>
                            <input 
                                id={`close-job-${job.id}`}
                                type="checkbox" 
                                checked={isClosingJob} 
                                onChange={(e) => setIsClosingJob(e.target.checked)}
                                className="h-5 w-5 text-cyan-500 rounded border-gray-500 bg-gray-700 focus:ring-cyan-500"
                            />
                         </div>
                         
                         {isClosingJob && (
                             <div className="animate-in fade-in zoom-in-95 duration-200">
                                 <label className="block text-xs text-cyan-300 mb-1 mt-2">Reason for Completion</label>
                                 <select 
                                    value={closureReason}
                                    onChange={(e) => setClosureReason(e.target.value as ClosureReason)}
                                    className="w-full bg-gray-900 border border-cyan-500/50 rounded px-2 py-2 text-sm text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none"
                                 >
                                     {Object.values(ClosureReason).map(reason => (
                                         <option key={reason} value={reason}>{reason}</option>
                                     ))}
                                 </select>
                             </div>
                         )}
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">Field Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={isClosingJob ? "Reason details (e.g. 'Spoke to neighbor, confirmed vacancy')..." : "Observations (e.g. 'Silver Honda in driveway')..."}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                            rows={3}
                        />
                    </div>

                    <div>
                         <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">Evidence (Required for Service)</label>
                         <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            className="hidden" 
                         />
                         <div className="flex space-x-2">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className={`flex-1 border border-dashed rounded py-3 text-xs transition-colors flex flex-col items-center justify-center ${
                                    imagePreview ? 'border-green-500 bg-green-900/10' : 'border-gray-600 text-gray-400 hover:text-white hover:border-gray-500'
                                }`}
                            >
                                {imagePreview ? (
                                    <>
                                        <span className="text-green-400 font-bold">✓ Photo Added</span>
                                        <span className="text-[9px] text-gray-400">Click to retake</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="font-bold">+ Take Photo</span>
                                        <span className="text-[9px]">GPS Tagged</span>
                                    </>
                                )}
                            </button>
                            {imagePreview && (
                                <div className="h-12 w-12 relative rounded overflow-hidden border border-gray-600">
                                    <img src={imagePreview} className="h-full w-full object-cover" alt="Preview" />
                                </div>
                            )}
                         </div>
                    </div>

                    <div className="flex space-x-2 pt-2 border-t border-gray-700 mt-2">
                        <button 
                            onClick={() => setIsLoggingAttempt(false)}
                            className="flex-1 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSubmitAttempt}
                            disabled={isLocating}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-bold text-white shadow-lg flex justify-center items-center transition-all ${
                                isClosingJob 
                                    ? 'bg-green-600 hover:bg-green-500 shadow-green-900/20' 
                                    : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isLocating ? 'Acquiring GPS...' : isClosingJob ? 'Finalize Job' : 'Save Attempt'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default JobCard;
