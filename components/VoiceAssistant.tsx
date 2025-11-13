
import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, Modality, FunctionDeclaration, Type, LiveServerMessage } from '@google/genai';
import { Job, AttemptType } from '../types';
import { MicIcon, MicOffIcon, LoaderIcon } from './icons';

// Audio Encoding/Decoding Functions
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}


interface VoiceAssistantProps {
  jobs: Job[];
  addAttempt: (jobId: number, attemptType: AttemptType) => void;
  markServed: (jobId: number) => void;
}

enum ConnectionState {
  IDLE,
  CONNECTING,
  CONNECTED,
  ERROR,
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ jobs, addAttempt, markServed }) => {
  const [connectionState, setConnectionState] = useState(ConnectionState.IDLE);
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const findJobIdByName = (name: string): number | null => {
    const job = jobs.find(j => j.defendantName.toLowerCase().includes(name.toLowerCase()));
    return job ? job.id : null;
  }

  const markJobServedFunction: FunctionDeclaration = {
    name: 'markJobServed',
    parameters: {
      type: Type.OBJECT,
      description: 'Marks a job as successfully served and complete.',
      properties: {
        defendantName: {
          type: Type.STRING,
          description: 'The name of the defendant for the job to mark as served.',
        },
      },
      required: ['defendantName'],
    },
  };

  const logAttemptFunction: FunctionDeclaration = {
    name: 'logAttempt',
    parameters: {
      type: Type.OBJECT,
      description: 'Logs a non-service attempt for a specific job.',
      properties: {
        defendantName: {
          type: Type.STRING,
          description: 'The name of the defendant for the job.',
        },
        attemptType: {
            type: Type.STRING,
            description: "The type of attempt made, e.g., 'Morning', 'Afternoon', 'Evening', 'Weekend'.",
        }
      },
      required: ['defendantName', 'attemptType'],
    },
  };

  const startSession = useCallback(async () => {
    setConnectionState(ConnectionState.CONNECTING);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const API_KEY = process.env.API_KEY;
      if (!API_KEY) throw new Error("API key not found");
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputAudioContext;
      
      let nextStartTime = 0;
      const sources = new Set<AudioBufferSourceNode>();

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [markJobServedFunction, logAttemptFunction] }],
          systemInstruction: "You are a helpful assistant for a process server. Be concise. When a function is called successfully, confirm the action. For example, say 'OK, job for John Doe marked as served.'",
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };

              sessionPromiseRef.current?.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                let result = 'Error: could not perform action.';
                if (fc.name === 'markJobServed' && fc.args.defendantName) {
                  const jobId = findJobIdByName(fc.args.defendantName);
                  if (jobId) {
                    markServed(jobId);
                    result = `Job for ${fc.args.defendantName} marked as served.`;
                  } else {
                    result = `Could not find a job for ${fc.args.defendantName}.`;
                  }
                } else if (fc.name === 'logAttempt' && fc.args.defendantName && fc.args.attemptType) {
                  const jobId = findJobIdByName(fc.args.defendantName);
                  const attemptType = fc.args.attemptType as AttemptType;
                  if (jobId && Object.values(AttemptType).includes(attemptType)) {
                     addAttempt(jobId, attemptType);
                     result = `Logged ${attemptType} attempt for ${fc.args.defendantName}.`;
                  } else {
                     result = `Could not log attempt for ${fc.args.defendantName}. Check name and attempt type.`;
                  }
                }

                sessionPromiseRef.current?.then((session) => {
                  session.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: result } }
                  });
                });
              }
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (audioData) {
              nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              source.addEventListener('ended', () => sources.delete(source));
              source.start(nextStartTime);
              nextStartTime += audioBuffer.duration;
              sources.add(source);
            }

            if (message.serverContent?.interrupted) {
                for(const source of sources.values()){
                    source.stop();
                    sources.delete(source);
                }
                nextStartTime = 0;
            }
          },
          onerror: (e) => {
            console.error(e);
            setConnectionState(ConnectionState.ERROR);
            stopSession();
          },
          onclose: () => {
            stopSession();
          },
        },
      });
    } catch (error) {
      console.error(error);
      setConnectionState(ConnectionState.ERROR);
    }
  }, [addAttempt, markServed]);

  const stopSession = useCallback(() => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    setConnectionState(ConnectionState.IDLE);
  }, []);

  const toggleSession = () => {
    if (connectionState === ConnectionState.IDLE || connectionState === ConnectionState.ERROR) {
      startSession();
    } else {
      stopSession();
    }
  };
  
  const getButtonContent = () => {
    switch(connectionState) {
        case ConnectionState.CONNECTING:
            return <LoaderIcon className="h-6 w-6 animate-spin text-white"/>;
        case ConnectionState.CONNECTED:
            return <MicIcon className="h-6 w-6 text-red-500"/>;
        case ConnectionState.IDLE:
        case ConnectionState.ERROR:
        default:
            return <MicOffIcon className="h-6 w-6 text-white"/>;
    }
  }

  return (
    <button
      onClick={toggleSession}
      className={`p-3 rounded-full transition-colors ${
        connectionState === ConnectionState.CONNECTED ? 'bg-cyan-500/50 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'
      }`}
      aria-label="Toggle Voice Assistant"
    >
      {getButtonContent()}
    </button>
  );
};

export default VoiceAssistant;
