const fs = require('fs');
const JSZip = require('jszip');

async function run() {
  const buf = fs.readFileSync('ELEVATES_Certificate.pptx');
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('ppt/slides/slide1.xml').async('text');

  // Let's find all tags that contain r:embed="rId10"
  const snippets = [...xml.matchAll(/(<p:sp[^>]*>[\s\S]*?r:embed="rId10"[\s\S]*?<\/p:sp>|<p:pic[^>]*>[\s\S]*?r:embed="rId10"[\s\S]*?<\/p:pic>)/g)];
  console.log('Matches for rId10:', snippets.length);
  snippets.forEach((s, idx) => console.log(`Snippet ${idx}:`, s[0].slice(0, 300)));
}
run();
