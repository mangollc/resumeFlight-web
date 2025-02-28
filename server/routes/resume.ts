// Create optimized resume record
      console.log("Creating optimized resume version", version);
      const content = typeof result.optimizedContent === 'object' 
        ? JSON.stringify(result.optimizedContent) 
        : result.optimizedContent;

      const optimizedResume = await db.insert(schema.optimizedResumes).values({
        sessionId: session.id,
        userId: session.userId,
        uploadedResumeId: uploadedResumeId,
        content: content,
        originalContent: uploadedResume.content,
        metadata: {
          version: version,
          optimizedAt: new Date(),
        },
        jobDetails: jobDetails,
        fileUrl: '',
        changes: result.changes,
        analysis: result.analysis,
      }).returning().then(rows => rows[0]);