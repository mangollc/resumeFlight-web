export async function optimizeResume(resumeText: string, jobDescription: string, onStatusUpdate: (status: any) => void) {
  // Set a timeout timer for the entire operation
  const timeoutPromise = new Promise((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error('Resume optimization timed out after 3 minutes'));
    }, 180000); // 3 minutes timeout
  });

  onStatusUpdate({ status: 'started' });
  console.log('[Optimize] Starting resume optimization...');
  console.log('[Optimize] Version: 1');

  try {
    // Use Promise.race to implement timeout
    await Promise.race([
      Promise.resolve(), // This resolves immediately to continue execution
      timeoutPromise     // This rejects if the timeout is reached
    ]);

    // Extract job details
    onStatusUpdate({ status: 'extracting_details' });
    // ... rest of the optimization logic ...
  } catch (error) {
    onStatusUpdate({ status: 'error', error: error.message });
    console.error('[Optimize] Error during resume optimization:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}