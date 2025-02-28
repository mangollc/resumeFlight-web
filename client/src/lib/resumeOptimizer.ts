export const optimizeResume = async (
  uploadedResumeId: number,
  jobUrl: string,
  onProgress: (progress: OptimizationProgress) => void
): Promise<OptimizationResult> => {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      jobUrl,
    });

    const url = `/api/uploaded-resumes/${uploadedResumeId}/optimize?${params.toString()}`;
    console.log("Creating EventSource with URL:", url);

    // Close any existing connection
    let retryCount = 0;
    const maxRetries = 3;
    const eventSource = new EventSource(url);

    // Handle initial connection
    eventSource.onopen = () => {
      console.log("EventSource connection established");
      retryCount = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.step === "complete") {
          console.log("Optimization complete, closing EventSource");
          eventSource.close();
          resolve(data.result);
        } else if (data.step === "error") {
          console.error("Received error from server:", data.error);
          eventSource.close();
          reject(new Error(data.error || "Unknown error occurred"));
        } else {
          onProgress({
            step: data.step,
            status: data.status,
            details: data.details
          });
        }
      } catch (err) {
        console.error("Error parsing event data:", err);
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource error:", error);

      // Implement retry logic
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying (${retryCount}/${maxRetries})...`);
        // The browser will automatically try to reconnect
      } else {
        console.error("Max retries reached, closing connection");
        eventSource.close();
        reject(new Error("Failed to connect to optimization service after multiple attempts"));
      }
    };

    // Add timeout to prevent hanging connections
    const timeout = setTimeout(() => {
      console.error("Connection timeout after 2 minutes");
      eventSource.close();
      reject(new Error("Connection timeout after 2 minutes"));
    }, 120000);

    // Clean up timeout on success or error
    eventSource.addEventListener('complete', () => clearTimeout(timeout));
    eventSource.addEventListener('error', () => clearTimeout(timeout));
  });
};