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
        const data = JSON.parse(event.data);
        console.log('Received event:', data);

        if (data.status === 'completed') {
          clearTimeout(timeoutId);
          newEventSource.close();
          setEventSource(null);
        }

        setStatus(data);
      };

      newEventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        clearTimeout(timeoutId);

        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying after error (${retryCount + 1}/${MAX_RETRIES})...`);
          newEventSource.close();
          setRetryCount(prev => prev + 1);

          setTimeout(() => {
            optimizeResume({ resumeId, jobDescription, jobUrl });
          }, RETRY_DELAY);
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