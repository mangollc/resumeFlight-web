const Preview = ({ resume, showMetrics = false }: PreviewProps) => {
  // Ensure content is always a string, even if it was serialized as an object
  let { content } = resume;

  // Handle potential JSON string scenarios
  try {
    if (content && typeof content === 'string' && (content.startsWith('[') || content.startsWith('{'))) {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        content = parsed.join('\n\n');
      } else if (typeof parsed === 'object') {
        content = JSON.stringify(parsed, null, 2);
      }
    }
  } catch (e) {
    // If parsing fails, keep the original content
    console.error("Error parsing resume content:", e);
  }

  // Get the resume version
  const version = resume.metadata?.version || '1.0';
  
  // Format content properly
  let displayContent = resume.optimisedResume || content;
  if (displayContent.includes("[object Object]")) {
    try {
      // Attempt to parse and format JSON content
      const parsedContent = JSON.parse(content.replace(/\[object Object\]/g, '""'));
      if (typeof parsedContent === 'string') {
        displayContent = parsedContent;
      } else if (Array.isArray(parsedContent)) {
        displayContent = parsedContent.join("\n\n");
      } else {
        displayContent = JSON.stringify(parsedContent, null, 2);
      }
    } catch (e) {
      console.error("Could not parse resume content:", e);
      // Remove [object Object] occurrences
      displayContent = content.replace(/\[object Object\]/g, "");
    }
  }
  
  return (
    <div>
      {resume.metadata && (
        <h2 className="text-xl font-semibold mb-4">Optimized Resume v{version}</h2>
      )}
      <div dangerouslySetInnerHTML={{ __html: displayContent }} />
      {showMetrics && (
        <div>
          {/* ... (rest of the component remains unchanged) */}
        </div>
      )}
    </div>
  );
};

export default Preview;