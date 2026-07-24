const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      // Increment pixel font sizes by 3
      let newContent = content.replace(/font-size:\s*(\d+(?:\.\d+)?)px/gi, (match, p1) => {
        changed = true;
        return `font-size: ${parseFloat(p1) + 3}px`;
      });
      
      // Increment rem font sizes
      newContent = newContent.replace(/font-size:\s*(\d+(?:\.\d+)?)rem/gi, (match, p1) => {
        changed = true;
        return `font-size: ${(parseFloat(p1) + 0.18).toFixed(2)}rem`;
      });

      if (changed) {
        fs.writeFileSync(fullPath, newContent);
        console.log('Updated: ' + fullPath);
      }
    }
  }
}

processDir(path.join(process.cwd(), 'src'));
console.log('Done increasing font sizes!');
