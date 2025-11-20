
import React, { useState } from 'react';
import { parseJobFromText } from '../services/geminiService';
import { JobType } from '../types';
import { SparklesIcon, LoaderIcon } from './icons';

interface SmartImportProps {
  onImport: (data: { defendantName: string, address: string, type: JobType, specialHandling: boolean }) => void;
  onCancel: () => void;
}

const SmartImport: React.FC<SmartImportProps> = ({ onImport, onCancel }) => {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await parseJobFromText(text);
      onImport({
        defendantName: result.defendantName,
        address: result.address,
        type: result.type as JobType,
        specialHandling: result.specialHandling
      });
      setText('');
    } catch (e) {
      setError("Failed to extract details. Try pasting simpler text.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gray-700/50 p-4 rounded-lg mb-4 border border-cyan-500/30 animate-in fade-in slide-in-from-top-2">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-white font-bold flex items-center">
          <SparklesIcon className="h-4 w-4 text-cyan-400 mr-2" />
          Smart Import (Email/Work Order)
        </h3>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-white">Close</button>
      </div>
      
      <p className="text-xs text-gray-400 mb-2">Paste the body of a "New Job" email from support@lumoslegal.com or similar text.</p>
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full h-32 bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white focus:ring-1 focus:ring-cyan-500 outline-none"
        placeholder="Subject: NEW JOB 23-1002 / 123 Main St...&#10;&#10;Please serve documents to John Doe at..."
      />
      
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

      <div className="mt-3 flex justify-end space-x-2">
        <button 
            onClick={handleParse}
            disabled={isProcessing || !text.trim()}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm px-4 py-2 rounded hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 flex items-center"
        >
            {isProcessing ? <LoaderIcon className="animate-spin h-4 w-4 mr-2" /> : null}
            {isProcessing ? 'Extracting...' : 'Extract & Add Job'}
        </button>
      </div>
    </div>
  );
};

export default SmartImport;
