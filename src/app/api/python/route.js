import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';

export async function POST(request) {

    let { aiOutput } = await request.json();
    console.log(request.json());
    if(aiOutput.endsWith("[[[RUNNING SCRIPT]]]")) {
        // Extract the Python code from aiOutput
        const pythonCodeStart = aiOutput.indexOf("```python") + 9;
        const pythonCodeEnd = aiOutput.indexOf("```", pythonCodeStart);
        const pythonCode = aiOutput.substring(pythonCodeStart, pythonCodeEnd);

        // Write Python code to a temp file in the temp dir
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir);
        }

        const tempFilePath = path.join(tempDir, 'temp_script.py');
        fs.writeFileSync(tempFilePath, pythonCode);

        // Run Python script and get all text output
        exec(`python ${tempFilePath}`, (error, stdout, stderr) => {
          if (error) {
            console.error(`Error executing Python script: ${error.message}`);
            return;
          }
          if (stderr) {
            console.error(`Python script stderr: ${stderr}`);
          }

          // Replace [[[RUNNING SCRIPT]]] in aiOutput with the script output
          aiOutput = aiOutput.replace("[[[RUNNING SCRIPT]]]", stdout);

          // Print or return the final output
          console.log(aiOutput);
          res.status(200).json({ result: aiOutput });
        });
      } else {
        res.status(400).json({ result: aiOutput });
      }
  }