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
  status: 'idle' | 'started' | 'extracting_details' | 'analyzing_description' | 'optimizing_resume' | 'completed' | 'error';
  error?: string;
  code?: string;
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
      const timeoutId = setTimeout(() => {
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

      // Event handlers
      newEventSource.onopen = () => {
        console.log('EventSource connection opened');
      };

      newEventSource.onmessage = (event) => {
        console.log('Received event:', event.data);
        try {
          // Ensure we have valid JSON data
          if (!event.data || typeof event.data !== 'string') {
            console.warn('Received invalid event data format:', event.data);
            return;
          }

          // Safely parse the JSON with error handling
          let data;
          try {
            data = JSON.parse(event.data);
          } catch (parseError) {
            console.error('Failed to parse event data:', event.data, parseError);
            return;
          }

          // Update status based on the event
          if (data.status === 'completed' && data.result) {
            setStatus({
              status: 'completed',
              optimizedResume: data.result
            });
            newEventSource.close();
            clearTimeout(timeoutId);
            setEventSource(null);
          } else if (data.status === 'error') {
            console.error('Received error status:', data);
            setStatus({
              status: 'error',
              error: data.message || 'An unknown error occurred',
              code: data.code || 'UNKNOWN_ERROR'
            });
            newEventSource.close();
            clearTimeout(timeoutId);
            setEventSource(null);

            toast({
              title: 'Optimization Error',
              description: data.message || 'Failed to optimize resume',
              variant: 'destructive',
            });
          } else {
            setStatus({
              status: data.status
            });
          }
        } catch (error) {
          console.error('Event parsing error:', error);
          // Try to recover from the error
          setStatus({
            status: 'error',
            error: 'Failed to process server response',
            code: 'CLIENT_ERROR'
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