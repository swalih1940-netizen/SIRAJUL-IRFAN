const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\sanus_uu6200b\\.gemini\\antigravity\\brain\\00f7b502-12f3-42d7-8953-166f668d9be7\\.system_generated\\logs\\transcript.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let foundFirst = false;
  let foundSecond = false;
  let content = "";

  for await (const line of rl) {
    if (line.includes('"name":"default_api:view_file"') && line.includes('"response":')) {
      const parsed = JSON.parse(line);
      const output = parsed.tool_calls?.[0]?.response?.output || parsed.response?.output || parsed.content;
      if (output && output.includes('Showing lines 1 to 800')) {
          console.log("Found first part");
          const lines = output.split('\n');
          let capture = false;
          for (let l of lines) {
              if (l.startsWith('1: ')) capture = true;
              if (l.includes('<truncated')) capture = false;
              if (capture) {
                  // remove line numbers like "1: "
                  const cleaned = l.replace(/^\d+:\s/, '');
                  content += cleaned + '\n';
              }
          }
      }
      if (output && output.includes('Showing lines 800 to 845')) {
          console.log("Found second part");
          // Just to confirm if it has lines 800+
      }
    }
  }
}
processLineByLine();
