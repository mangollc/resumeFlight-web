import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { OptimizedResume } from '@shared/schema';

const EVENT_SOURCE_TIMEOUT = 240000; // 4 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // 3 seconds

interface OptimizeResumeOptions {
  resumeId: number;
  jobDescription: string;
  jobUrl?: string;
}

interface OptimizationStatus {
  status: 'idle' | 'started' | 'extracting_details' | 'analyzing_description' | 'optimizing_resume' | 'completed' | 'success' | 'error';
  error?: string;
  code?: string;
  step?: string;
  optimizedResume?: OptimizedResume;
  resumeContent?: OptimizedResume['resumeContent'];
  analysis?: OptimizedResume['analysis'];
}

export function useResumeOptimizer() {
  const [status, setStatus] = useState<OptimizationStatus>({ status: 'idle' });
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const { toast } = useToast();
  const [retryCount, setRetryCount] = useState(0);
  const [optimizedResume, setOptimizedResume] = useState<OptimizedResume | null>(null);
  const [resumeContent, setResumeContent] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [parsingErrorCount, setParsingErrorCount] = useState(0); // Added state for parsing error count


  const cancelOptimization = useCallback(() => {
    if (eventSource) {
      console.log('Closing EventSource connection');
      eventSource.close();
      setEventSource(null);
    }
    setStatus({ status: 'idle' });
  }, [eventSource]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        console.log('Closing EventSource on unmount');
        eventSource.close();
      }
    };
  }, [eventSource]);

  const optimizeResume = useCallback(async ({ resumeId, jobDescription, jobUrl }: OptimizeResumeOptions) => {
    // Clear any previous optimization
    if (eventSource) {
      eventSource.close();
    }
    setStatus({ status: 'idle' });
    setRetryCount(0);
    setParsingErrorCount(0); // Reset parsing error count on new optimization
    setOptimizedResume(null);
    setResumeContent(null);
    setAnalysis(null);

    try {
      // Create URL with params
      const url = new URL(`/api/uploaded-resumes/${resumeId}/optimize`, window.location.origin);
      if (jobDescription) {
        url.searchParams.append('jobDescription', jobDescription);
      }
      if (jobUrl) {
        url.searchParams.append('jobUrl', jobUrl);
      }

      console.log('Creating EventSource with URL:', url.toString());

      // Create new EventSource
      const newEventSource = new EventSource(url.toString());
      setEventSource(newEventSource);

      // Set up timeout
      let timeoutId = setTimeout(() => {
        console.log('Request timed out');
        newEventSource.close();

        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            optimizeResume({ resumeId, jobDescription, jobUrl });
          }, RETRY_DELAY);
        } else {
          setStatus({ 
            status: 'error', 
            error: 'Optimization timed out after multiple attempts. Please try again later.',
            code: 'TIMEOUT_ERROR'
          });
          toast({
            title: 'Optimization Failed',
            description: 'The operation timed out. Please try again.',
            variant: 'destructive',
          });
        }
      }, EVENT_SOURCE_TIMEOUT);

      // Function to reset the timeout when we receive events
      const resetTimeout = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          console.log('Request timed out after inactivity');
          setStatus({ status: 'error', error: 'Optimization process timed out due to inactivity' });
          newEventSource.close();
          setEventSource(null);
          toast({
            title: 'Optimization Timeout',
            description: 'The optimization process timed out due to inactivity.',
            variant: 'destructive',
          });
        }, 60000); // Reset to 1 minute after each message
      };

      // Add a heartbeat handler
      const heartbeatHandler = () => {
        console.log('Received heartbeat');
        resetTimeout();
      };
      newEventSource.addEventListener('heartbeat', heartbeatHandler);


      // Event handlers
      newEventSource.onopen = () => {
        console.log('EventSource connection opened');
      };

      newEventSource.onmessage = (event) => {
        if (!event.data) return;

        try {
          const data = JSON.parse(event.data);
          console.log("Received event:", data);

          if (data.status === "completed" && data.optimizedResume) {
            setOptimizedResume(data.optimizedResume);
            setResumeContent(data.optimizedResume.resumeContent);
            setAnalysis(data.optimizedResume.analysis);
            setStatus({ status: "success" });
            newEventSource.close();
            clearTimeout(timeoutId);
          } else if (data.status === "error") {
            let errorMessage = data.message || 'Failed to optimize resume';
            let errorTitle = 'Optimization Error';
            console.error('Optimization error details:', data);

            // Customize error message based on error code
            if (data.code === 'TIMEOUT_ERROR') {
              errorTitle = 'Optimization Timeout';
              errorMessage = data.message || 'The optimization process timed out. Try with a shorter resume or job description.';
            } else if (data.code === 'CONTENT_GENERATION_ERROR') {
              errorTitle = 'Content Generation Error';
              errorMessage = 'Failed to generate optimized content. Please try again with a different resume or job description.';
            } else if (data.code === 'OPTIMIZATION_ERROR') {
              errorTitle = 'Database Save Error';
              errorMessage = 'Your resume was optimized successfully, but we had trouble saving it. Please try again.';

              // If this is a database error, let's retry the fetch directly
              if (data.message && data.message.includes('save')) {
                toast({
                  title: 'Attempting Recovery',
                  description: 'Trying to retrieve your optimized resume...',
                });

                // Wait 2 seconds then try to fetch optimized resumes
                setTimeout(() => {
                  window.location.href = '/optimized-resumes';
                }, 2000);
              }
            } else if (data.code === 'INSUFFICIENT_CONTENT_ERROR') {
              errorTitle = 'Content Error';
              errorMessage = 'The resume or job description provided may not contain enough information. Please provide more details.';
            }

            toast({
              title: errorTitle,
              description: errorMessage,
              variant: 'destructive',
            });

            console.error('Optimization error:', { message: errorMessage, code: data.code, details: data });
            setStatus({ status: 'error', error: errorMessage, code: data.code });
            newEventSource.close();
            clearTimeout(timeoutId);
          } else if (data.status) {
            setStatus({ status: data.status });
          } else if (data.type === "heartbeat") {
            // Just a heartbeat to keep the connection alive, ignore
          } else {
            console.log("Unknown event type:", data);
          }
        } catch (err) {
          console.log("Event parsing error:", err);
          // Don't close the connection for parsing errors that might just be heartbeats
          // Only set error state if we've had multiple parsing errors
          if (++parsingErrorCount > 3) {
            setStatus({ 
              status: "error", 
              error: "Failed to parse server responses multiple times",
              code: "PARSE_ERROR"
            });
            newEventSource.close();
            clearTimeout(timeoutId);
          }
        }
      };

      newEventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        clearTimeout(timeoutId);

        // Check if we received a 401 Unauthorized response
        if (error instanceof Event && error.target && (error.target as any).status === 401) {
          newEventSource.close();
          setEventSource(null);
          setStatus({ 
            status: 'error', 
            error: 'Authentication required. Please refresh the page and try again.',
            code: 'AUTH_ERROR'
          });
          toast({
            title: 'Authentication Error',
            description: 'Your session may have expired. Please refresh the page and try again.',
            variant: 'destructive',
          });
          return;
        }

        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          newEventSource.close();
          setRetryCount(prev => prev + 1);

          setTimeout(() => {
            optimizeResume({ resumeId, jobDescription, jobUrl });
          }, RETRY_DELAY * (retryCount + 1)); // Progressive backoff
        } else {
          newEventSource.close();
          setEventSource(null);
          setStatus({ 
            status: 'error', 
            error: 'Connection failed after multiple attempts. Please try again later.',
            code: 'CONNECTION_ERROR'
          });
          toast({
            title: 'Connection Error',
            description: 'Failed to connect to the optimization service. Please try again.',
            variant: 'destructive',
          });
        }
      };

      return () => {
        clearTimeout(timeoutId);
        newEventSource.removeEventListener('heartbeat', heartbeatHandler);
        newEventSource.close();
      };
    } catch (error: any) {
      console.error('Error setting up EventSource:', error);
      setStatus({ 
        status: 'error', 
        error: 'Failed to start optimization process',
        code: 'SETUP_ERROR'
      });
      toast({
        title: 'Error',
        description: 'Failed to start the optimization process. Please try again.',
        variant: 'destructive',
      });
    }
  }, [toast, eventSource, retryCount, setOptimizedResume, setResumeContent, setAnalysis, setParsingErrorCount]);

  return {
    status,
    optimizedResume,
    resumeContent,
    analysis,
    optimizeResume,
    cancelOptimization,
  };
}