import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';

interface OptimizationProgressProps {
  status: string | { status: string; error?: string; step?: string; code?: string };
  error?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

type Step = {
  id: string;
  label: string;
  status: 'waiting' | 'loading' | 'completed' | 'error';
};

export function OptimizationProgress({ status, error, onRetry, onCancel }: OptimizationProgressProps) {
  const steps: Step[] = [
    { id: 'started', label: 'Starting optimization', status: 'waiting' },
    { id: 'extracting_details', label: 'Extracting job details', status: 'waiting' },
    { id: 'parsing_resume', label: 'Parsing resume', status: 'waiting' },
    { id: 'analyzing_description', label: 'Analyzing job requirements', status: 'waiting' },
    { id: 'optimizing_resume', label: 'Optimizing resume', status: 'waiting' },
    { id: 'generating_analysis', label: 'Generating analysis', status: 'waiting' },
    { id: 'completed', label: 'Optimization complete', status: 'waiting' },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === (typeof status === 'string' ? status : status.status));

  steps.forEach((step, index) => {
    if (index < currentStepIndex) {
      step.status = 'completed';
    } else if (index === currentStepIndex) {
      step.status = (typeof status === 'string' && status === 'error') ? 'error' : 'loading';
    }
  });

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const progress = Math.round((completedSteps / steps.length) * 100);


  let errorDisplay;
  if (typeof status === 'object' && status.status === 'error') {
    errorDisplay = (
      <div className="text-center p-6 space-y-4">
        <XCircle className="h-12 w-12 text-destructive mx-auto" />
        <h3 className="text-lg font-medium text-destructive">Optimization Failed</h3>
        <p className="text-muted-foreground">{status.error || 'An error occurred while optimizing your resume.'}</p>
        {status.step && (
          <p className="text-sm text-muted-foreground">
            Error occurred during: <span className="font-medium">{status.step}</span>
          </p>
        )}
        {status.code && (
          <p className="text-xs text-muted-foreground">
            Error code: {status.code}
          </p>
        )}
        <div className="space-x-3">
          <Button variant="outline" onClick={onRetry}>Try Again</Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    );
  } else if (typeof status === 'string' && status === 'error'){
    errorDisplay = (
      <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-md text-sm">
        {error || 'An error occurred'}
      </div>
    );
  }


  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Resume Optimization
          {(typeof status === 'object' && status.status === 'error') && (
            <Badge variant="destructive">Error</Badge>
          )}
          {(typeof status === 'string' && status === 'success') && (
            <Badge variant="success">Completed</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {(typeof status === 'object' && status.status === 'error')
            ? 'There was an error optimizing your resume'
            : 'Tailoring your resume to the job description'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground text-right">{progress}% Complete</p>

        <div className="space-y-3 mt-4">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center justify-between">
              <div className="flex items-center">
                {step.status === 'loading' && <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-500" />}
                {step.status === 'completed' && <CheckCircle className="h-4 w-4 mr-2 text-green-500" />}
                {step.status === 'error' && <AlertCircle className="h-4 w-4 mr-2 text-red-500" />}
                {step.status === 'waiting' && <Clock className="h-4 w-4 mr-2 text-gray-300" />}
                <span className={`text-sm ${step.status === 'error' ? 'text-red-500' : ''}`}>
                  {step.label}
                </span>
              </div>
              {step.status === 'completed' && (
                <Badge variant="outline" className="bg-green-50">Done</Badge>
              )}
              {step.status === 'loading' && (
                <Badge variant="outline" className="bg-blue-50">In progress</Badge>
              )}
            </div>
          ))}
        </div>

        {errorDisplay}

      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        {(typeof status === 'object' && status.status === 'error') && onRetry && (
          <Button onClick={onRetry} variant="default">
            Retry
          </Button>
        )}
        {onCancel && (
          <Button onClick={onCancel} variant="outline">
            {(typeof status === 'object' && status.status === 'error') ? 'Close' : 'Cancel'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}