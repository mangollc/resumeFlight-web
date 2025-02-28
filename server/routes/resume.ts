// Create optimized resume record
      console.log("Creating optimized resume version", version);
      // Ensure content is properly formatted as a string
      let content = result.optimizedContent;
      if (typeof content === 'object') {
        content = JSON.stringify(content);
      } else if (Array.isArray(content)) {
        content = content.join("\n\n");
      }

      // Make sure we don't have "[object Object]" in the content
      if (content.includes("[object Object]")) {
        console.error("Invalid content format detected, attempting to fix");
        content = JSON.stringify(result.optimizedContent);
      }

      const optimizedResume = await db.insert(schema.optimizedResumes).values({
        sessionId: session.id,
        userId: session.userId,
        uploadedResumeId: uploadedResumeId,
        optimisedResume: content, //This line is changed
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