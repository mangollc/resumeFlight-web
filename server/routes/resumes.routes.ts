// ... (rest of the file, assuming this is a server-side route handler)

// ... other code ...

app.delete('/api/resumes/:resumeId', async (req, res) => {
    const resumeId = req.params.resumeId;
    console.log(`Deleting resume with ID: ${resumeId}`);
    try {
        await storage.deleteUploadedResume(resumeId);
        console.log(`Successfully deleted resume with ID: ${resumeId}`);

        // Clear headers and send fresh response
        res.removeHeader('Content-Type');
        res.removeHeader('Content-Length');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

        // Send a proper JSON response with the ID of the deleted resume
        return res.status(200).json({ 
          success: true, 
          message: "Resume deleted successfully",
          resumeId 
        });
    } catch (deleteError) {
        console.error("Error in deleteUploadedResume operation:", deleteError);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ success: false, message: "Failed to delete resume", error: deleteError.message }); //Improved error response
    }
});

// ... (rest of the file)