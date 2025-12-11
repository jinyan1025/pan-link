// 网盘分享文本转JSON工具（支持百度网盘、夸克网盘）
// 用法: node convert.js

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('请粘贴网盘分享文本（支持百度/夸克，输入两个空行结束）：\n');

let inputText = '';
let emptyLineCount = 0;

rl.on('line', (line) => {
  if (line.trim() === '') {
    emptyLineCount++;
    if (emptyLineCount >= 2) {
      processInput();
      rl.close();
      return;
    }
  } else {
    emptyLineCount = 0;
  }
  inputText += line + '\n';
});

function processInput() {
  const results = [];
  
  // 处理百度网盘格式
  const baiduEntries = inputText.split(/通过百度网盘分享的文件：/).filter(s => s.trim());
  for (const entry of baiduEntries) {
    const lines = entry.trim().split('\n');
    const name = lines[0].trim();
    const linkLine = lines.find(l => l.startsWith('链接：'));
    
    if (name && linkLine && linkLine.includes('baidu')) {
      const url = linkLine.replace('链接：', '').trim();
      results.push(`  "${name}": "${url}"`);
    }
  }
  
  // 处理夸克网盘格式：我用夸克网盘给你分享了「文件名」，...
  const quarkRegex = /我用夸克网盘给你分享了「([^」]+)」[^\n]*\n链接：(https:\/\/pan\.quark\.cn\/s\/[^\s]+)/g;
  let match;
  while ((match = quarkRegex.exec(inputText)) !== null) {
    const name = match[1].trim();
    const url = match[2].trim();
    results.push(`  "${name}": "${url}"`);
  }

  // 处理迅雷格式：上一行是文件名/标题，本行含“迅雷链接：”或包含thunder/magnet/pan.xunlei.com
  const allLines = inputText.split('\n');
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const urlMatch = line.match(/(thunder:\/\/[^\s]+|magnet:\?[^\s]+|https:\/\/pan\.xunlei\.com\/s\/[^\s]+)/);
    if (line.includes('迅雷链接') || urlMatch) {
      const url = urlMatch ? urlMatch[0].trim() : line.replace(/.*迅雷链接[:：]\s*/, '').trim();
      let name = '';
      for (let j = i - 1; j >= 0; j--) {
        const prev = allLines[j].trim();
        if (!prev) continue;
        name = prev
          .replace(/^文件名[:：]\s*/, '')
          .replace(/^名称[:：]\s*/, '')
          .replace(/^分享文件[:：]\s*/, '');
        break;
      }
      if (name && url) {
        results.push(`  "${name}": "${url}"`);
      }
    }
  }

  console.log('\n--- 转换结果 ---\n');
  console.log(results.join(',\n'));
  console.log('\n--- 结束 ---');
}
