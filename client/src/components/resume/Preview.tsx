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
  
  return (
    <div>
      {resume.metadata && (
        <h2 className="text-xl font-semibold mb-4">Optimized Resume v{version}</h2>
      )}
      <div dangerouslySetInnerHTML={{ __html: content }} />
      {showMetrics && (
        <div>
          {/* ... (rest of the component remains unchanged) */}
        </div>
      )}
    </div>
  );
};

export default Preview;