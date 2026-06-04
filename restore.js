const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\sanus_uu6200b\\.gemini\\antigravity\\brain\\c134fd44-94ea-4554-8899-47255c4b84b8\\.system_generated\\logs\\transcript.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let bestContent = null;

  for await (const line of rl) {
    try {
        const data = JSON.parse(line);
        if (data.tool_calls) {
            for (const call of data.tool_calls) {
                if (call.function.name === 'default_api:write_to_file' || call.function.name === 'default_api:replace_file_content') {
                    const args = JSON.parse(call.function.arguments);
                    if (args.TargetFile && args.TargetFile.includes('home.hbs')) {
                        if (args.CodeContent) {
                            bestContent = args.CodeContent;
                        }
                    }
                }
            }
        }
    } catch (e) {
    }
  }
  
  if (bestContent) {
      fs.writeFileSync('d:\\SISA WEB\\views\\home.hbs', bestContent);
      console.log('Restored home.hbs successfully.');
  } else {
      console.log('Could not find content to restore.');
  }
}
processLineByLine();
