import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { OptimizedResume } from '@shared/schema';

const EVENT_SOURCE_TIMEOUT = 180000; // 3 minutes
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
        try {
          // Validate and parse the event data
          if (!event.data) {
            console.warn('Empty event received');
            return;
          }

          const data = JSON.parse(event.data);
          console.log('Received event:', data);

          // Handle heartbeat messages separately
          if (data.type === 'heartbeat') {
            console.log('Heartbeat received:', new Date(data.timestamp).toISOString());
            // Clear and reset timeout on heartbeat
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              console.log('Request timed out after heartbeat');
              newEventSource.close();
            }, EVENT_SOURCE_TIMEOUT);
            return;
          }

          // Clear timeout on any message received
          clearTimeout(timeoutId);

          // Update timeoutId for next timeout
          timeoutId = setTimeout(() => {
            console.log('Request timed out');
            newEventSource.close();
          }, EVENT_SOURCE_TIMEOUT);


          // Update status based on the received event
          if (!data.status) {
            console.warn('Unknown status:', data);
            return;
          }

          // Handle completion states
          if (data.status === 'completed' || data.status === 'success') {
            setStatus({
              status: 'success',
              optimizedResume: data.optimizedResume,
              resumeContent: data.content,
              analysis: data.analysis
            });

            toast({
              title: 'Optimization Complete',
              description: 'Your resume has been optimized for the job!',
              variant: 'default',
            });
          } else if (data.status === 'error') {
            const errorMessage = data.message || 'An unknown error occurred';
            const errorCode = data.code || 'UNKNOWN_ERROR';

            setStatus({ 
              status: 'error', 
              error: errorMessage,
              code: errorCode,
              step: data.step
            });

            // Customize error messages based on error code
            let description = errorMessage;
            if (errorCode === 'CONTENT_TOO_LARGE') {
              description = 'Your resume or job description is too long. Please try with a shorter version.';
            } else if (errorCode === 'RATE_LIMIT') {
              description = 'Service is busy. Please try again in a few minutes.';
            } else if (errorCode === 'TIMEOUT_ERROR') {
              description = 'The operation took too long. Try with a shorter resume or job description.';
            }

            toast({
              title: 'Optimization Failed',
              description: description,
              variant: 'destructive',
            });
          } else {
            // Update status for in-progress steps
            setStatus({ status: data.status, data });

            // Show step progress in toast if needed
            if (['extracting_details', 'analyzing_description', 'optimizing_resume'].includes(data.status)) {
              const stepMessages = {
                'extracting_details': 'Extracting job details...',
                'analyzing_description': 'Analyzing job requirements...',
                'optimizing_resume': 'Optimizing your resume...'
              };

              toast({
                title: "Optimization in progress",
                description: stepMessages[data.status],
                duration: 3000,
              });
            }
            resetTimeout();
          }
        } catch (error) {
          console.error('Event parsing error:', error);
          setStatus({ 
            status: 'error', 
            error: 'Failed to parse server response',
            code: 'PARSE_ERROR'
          });
          newEventSource.close();
          setEventSource(null);
          clearTimeout(timeoutId);
          toast({
            title: "Error",
            description: "Failed to process server response",
            variant: "destructive",
          });
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
  }, [toast, eventSource, retryCount]);

  return {
    status,
    optimizeResume,
    cancelOptimization,
  };
}