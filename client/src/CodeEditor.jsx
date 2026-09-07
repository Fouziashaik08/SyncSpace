import Editor from "@monaco-editor/react";

function CodeEditor({
  code,
  setCode,
  language,
  setLanguage,
  onCodeChange,
  onTyping,
  readOnly = false,
}) {
  const handleChange = (value) => {
    const newCode = value ?? "";

    setCode(newCode);

    if (!readOnly) {
      if (onTyping) {
        onTyping();
      }

      if (onCodeChange) {
        onCodeChange(newCode);
      }
    }
  };

  return (
    <div className="monaco-editor-shell">
      <div className="monaco-toolbar">
        <div className="monaco-title">
          <span className="monaco-dot"></span>
          Code Editor
        </div>

        <select
          className="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={readOnly}
        >
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="c">C</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="json">JSON</option>
        </select>
      </div>

      <div className="monaco-editor-container">
        <Editor
          height="500px"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={handleChange}
          options={{
            readOnly,
            minimap: {
              enabled: true,
            },
            fontSize: 14,
            lineNumbers: "on",
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            scrollBeyondLastLine: false,
            padding: {
              top: 12,
              bottom: 12,
            },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            renderWhitespace: "selection",
          }}
        />
      </div>

      {readOnly && (
        <div className="editor-readonly-message">
          🔒 Code editing is disabled during replay.
        </div>
      )}
    </div>
  );
}

export default CodeEditor;