const fs = require('fs');
const JSZip = require('jszip');

async function testPptxExportAndImport() {
  const templateBuf = fs.readFileSync('public/certificates/ELEVATES_Certificate.pptx');
  const zip = await JSZip.loadAsync(templateBuf);
  let slideXml = await zip.file('ppt/slides/slide1.xml').async('text');

  // Let's test replacing text in the 15 paragraphs
  const newTexts = [
    'CERTIFICATE OF COMPLETION', // P0: mainTitle
    'O F   H O N O R',           // P1: subTitle
    'THIS RECOGNITION IS PRESENTED TO', // P2: preamble
    'Alex Rivera',              // P3: recipient
    'has demonstrated exemplary mastery in Fullstack System Architecture,', // P4: desc line 1
    'spearheading open source initiatives with passion and persistence,',  // P5: desc line 2
    'and inspiring the community toward innovation.',                     // P6: desc line 3
    'Dr. Rajesh Kumar',         // P7: sig1 name
    'C H A I R P E R S O N',     // P8: sig1 role
    'CUSAT Innovation Labs',    // P9: sig1 org
    'Prof. Priya Sharma',       // P10: sig2 name
    'M E N T O R',              // P11: sig2 role
    'CUSAT Innovation Labs',    // P12: sig2 org
    'BUILD. CODE. DEPLOY.',     // P13: bottom left
    'ELEVATES OS 2026'          // P14: bottom right
  ];

  let pIndex = 0;
  slideXml = slideXml.replace(/<a:p[\s>][\s\S]*?<\/a:p>/g, (pMatch) => {
    if (pIndex < newTexts.length) {
      const replacement = newTexts[pIndex];
      pIndex++;
      // Replace text inside <a:t>...</a:t>
      // First check if <a:t> exists in pMatch
      if (/<a:t[^>]*>[\s\S]*?<\/a:t>/.test(pMatch)) {
        // If there are multiple <a:t>, replace first with text and others with empty
        let tCount = 0;
        return pMatch.replace(/<a:t([^>]*)>([\s\S]*?)<\/a:t>/g, (tMatch, attrs, oldText) => {
          if (tCount === 0) {
            tCount++;
            return `<a:t${attrs}>${escapeXml(replacement)}</a:t>`;
          } else {
            return `<a:t${attrs}></a:t>`;
          }
        });
      }
    }
    return pMatch;
  });

  zip.file('ppt/slides/slide1.xml', slideXml);

  const outBuf = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('scratch/exported_test.pptx', outBuf);
  console.log('Successfully wrote scratch/exported_test.pptx! Size:', outBuf.length);

  // Now test re-importing it
  const reloadedZip = await JSZip.loadAsync(outBuf);
  const reloadedXml = await reloadedZip.file('ppt/slides/slide1.xml').async('text');
  const paragraphs = [...reloadedXml.matchAll(/<a:p[\s>]([\s\S]*?)<\/a:p>/g)];
  console.log('Re-read paragraphs count:', paragraphs.length);
  paragraphs.forEach((p, idx) => {
    const texts = [...p[1].matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map(t => t[1]);
    if (texts.length > 0) {
      console.log(`Re-read P[${idx}]:`, texts.join(' '));
    }
  });
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
    return c;
  });
}

testPptxExportAndImport();
