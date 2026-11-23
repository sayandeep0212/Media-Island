const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoPath = 'C:/Users/sayan/.gemini/antigravity/brain/95cb07cd-6bef-459b-b57c-4b33f68e09c9/scratch/stick-it-up';
const publicDir = path.join(repoPath, 'public');
const reactDir = path.join(repoPath, 'packages/stickers-react/src/stickers');
const pageFile = path.join(repoPath, 'app/stickers/page.tsx');

const pageContent = fs.readFileSync(pageFile, 'utf8');
const catalogStart = pageContent.indexOf('const CATALOG: CatalogItem[] = [');
const catalogEnd = pageContent.indexOf('\n];', catalogStart);
const catalogSection = pageContent.substring(catalogStart + 'const CATALOG: CatalogItem[] = ['.length, catalogEnd);

const sandbox = { CATALOG: [] };
const cleanedCatalogCode = 'CATALOG = [' + catalogSection
  .replace(/: StickerFormat/g, '')
  .replace(/: StickerCategory/g, '') + '];';

vm.createContext(sandbox);
vm.runInContext(cleanedCatalogCode, sandbox);
const catalog = sandbox.CATALOG;

// Add extra components from stick-it-up not in page.tsx CATALOG
catalog.push(
  {
    id: "comp-flame-star",
    name: "flame-star",
    title: "Flame Star",
    category: "components",
    format: "component",
    componentName: "flame-star",
    exportName: "FlameStarSticker",
    description: "Chrome metallic four-point star emblem with liquid flame accents.",
    tags: ["flame-star", "chrome", "star", "metallic", "liquid"]
  },
  {
    id: "comp-folded-paper",
    name: "folded-paper",
    title: "Folded Paper",
    category: "components",
    format: "component",
    componentName: "folded-paper",
    exportName: "FoldedPaperSticker",
    description: "Tactile folded origami sheet decal with crisp geometric shadows.",
    tags: ["paper", "folded", "origami", "shadow", "shape"]
  },
  {
    id: "comp-icy-fleur",
    name: "icy-fleur",
    title: "Icy Fleur",
    category: "components",
    format: "component",
    componentName: "icy-fleur",
    exportName: "IcyFleurSticker",
    description: "Frosty icy metallic fleur-de-lis emblem with glistening specular edges.",
    tags: ["fleur", "ice", "metallic", "chrome", "frost"]
  }
);

function normalizeCategory(cat) {
  if (!cat) return 'symbols';
  if (cat === 'components') return 'chrome';
  return cat;
}

function prefixSvgIds(svg, prefix) {
  const idMatches = svg.match(/\bid="([^"]+)"/g) || [];
  const ids = Array.from(new Set(idMatches.map(m => m.match(/\bid="([^"]+)"/)[1])));

  let updated = svg;
  for (const id of ids) {
    const newId = `${prefix}${id}`;
    updated = updated.split(`id="${id}"`).join(`id="${newId}"`);
    updated = updated.split(`url(#${id})`).join(`url(#${newId})`);
    updated = updated.split(`href="#${id}"`).join(`href="#${newId}"`);
    updated = updated.split(`xlink:href="#${id}"`).join(`xlink:href="#${newId}"`);
  }
  return updated;
}

function cleanAndFormatSvg(svg, stickerId) {
  let res = svg.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[\s\S]*?>/g, '').trim();

  if (!res.includes('viewBox=')) {
    const wMatch = res.match(/width="([^"]+)"/);
    const hMatch = res.match(/height="([^"]+)"/);
    if (wMatch && hMatch) {
      res = res.replace('<svg', `<svg viewBox="0 0 ${parseFloat(wMatch[1])} ${parseFloat(hMatch[1])}"`);
    }
  }

  res = res
    .replace(/width="[^"]+"/, 'width="100%"')
    .replace(/height="[^"]+"/, 'height="100%"');

  if (!res.includes('width=')) {
    res = res.replace('<svg', '<svg width="100%" height="100%"');
  }

  const cleanId = stickerId.replace(/[^a-zA-Z0-9]/g, '_');
  res = prefixSvgIds(res, `siu_${cleanId}_`);

  return res;
}

function extractSvgFromReactComponent(compPath) {
  if (!fs.existsSync(compPath)) return null;
  let code = fs.readFileSync(compPath, 'utf8');
  const svgMatch = code.match(/<svg[\s\S]*?<\/svg>/);
  if (!svgMatch) return null;
  let svg = svgMatch[0];
  svg = svg
    .replace(/width=\{[^}]+\}/, 'width="100%"')
    .replace(/height=\{[^}]+\}/, 'height="100%"')
    .replace(/className=\{[^}]+\}/g, '')
    .replace(/style=\{[^}]+\}/g, '')
    .replace(/onMouseEnter=\{[^}]+\}/g, '')
    .replace(/onMouseLeave=\{[^}]+\}/g, '')
    .replace(/aria-label=\{[^}]+\}/g, '')
    .replace(/role=\{[^}]+\}/g, '')
    .replace(/\{\.\.\.props\}/g, '')
    .replace(/fillRule=/g, 'fill-rule=')
    .replace(/clipRule=/g, 'clip-rule=')
    .replace(/strokeWidth=/g, 'stroke-width=')
    .replace(/strokeLinecap=/g, 'stroke-linecap=')
    .replace(/strokeLinejoin=/g, 'stroke-linejoin=')
    .replace(/strokeDasharray=/g, 'stroke-dasharray=')
    .replace(/strokeDashoffset=/g, 'stroke-dashoffset=')
    .replace(/strokeMiterlimit=/g, 'stroke-miterlimit=')
    .replace(/clipPath=/g, 'clip-path=')
    .replace(/fillOpacity=/g, 'fill-opacity=')
    .replace(/stopColor=/g, 'stop-color=')
    .replace(/stopOpacity=/g, 'stop-opacity=')
    .replace(/colorInterpolationFilters=/g, 'color-interpolation-filters=')
    .replace(/floodOpacity=/g, 'flood-opacity=')
    .replace(/stdDeviation=/g, 'stdDeviation=')
    .replace(/filterUnits=/g, 'filterUnits=')
    .replace(/\{`([^`]+)`\}/g, '"$1"')
    .replace(/\{"([^"]+)"\}/g, '"$1"')
    .replace(/\{'([^']+)'\}/g, '"$1"')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  svg = svg.replace(/id=\{`?([^`"}]+)`?\}/g, 'id="$1"');
  return svg;
}

const finalStickers = [];
const processedIds = new Set();

for (const item of catalog) {
  const stickerId = item.name || item.id;
  if (processedIds.has(stickerId)) continue;

  let rawSvg = null;
  if (item.svgSrc) {
    const decoded = decodeURIComponent(item.svgSrc.replace(/^\//, ''));
    const fullPath = path.join(publicDir, decoded);
    if (fs.existsSync(fullPath)) {
      rawSvg = fs.readFileSync(fullPath, 'utf8');
    }
  }

  if (!rawSvg && item.componentName) {
    const compExport = item.exportName || (item.componentName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('') + 'Sticker');
    const compFile = path.join(reactDir, compExport + '.tsx');
    if (fs.existsSync(compFile)) {
      rawSvg = extractSvgFromReactComponent(compFile);
    }
  }

  if (!rawSvg) {
    const cleanName = item.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const matchFile = fs.readdirSync(reactDir).find(f => f.toLowerCase().includes(cleanName));
    if (matchFile) {
      rawSvg = extractSvgFromReactComponent(path.join(reactDir, matchFile));
    }
  }

  if (rawSvg) {
    processedIds.add(stickerId);
    const cleanedSvg = cleanAndFormatSvg(rawSvg, stickerId);
    finalStickers.push({
      id: stickerId,
      name: item.title || item.name,
      category: normalizeCategory(item.category),
      description: item.description || '',
      tags: item.tags || [stickerId],
      svg: cleanedSvg
    });
  }
}

// Add the 4 custom media-island bonus stickers: donut, gamepad, saturn, rocket
const existingCode = fs.readFileSync('app/stickers.js', 'utf8');
const matchOld = existingCode.match(/const STICKERS = (\[[\s\S]*?\]);\s*let/);
if (matchOld) {
  const oldList = JSON.parse(matchOld[1]);
  for (const oldItem of oldList) {
    if (!processedIds.has(oldItem.id)) {
      processedIds.add(oldItem.id);
      finalStickers.push({
        id: oldItem.id,
        name: oldItem.name,
        category: 'symbols',
        description: `${oldItem.name} sticker decal`,
        tags: [oldItem.id, 'island', 'custom'],
        svg: cleanAndFormatSvg(oldItem.svg, oldItem.id)
      });
    }
  }
}

// Save to scripts/stickers-catalog.json
fs.writeFileSync(
  path.join(__dirname, 'stickers-catalog.json'),
  JSON.stringify(finalStickers, null, 2),
  'utf8'
);

console.log('Saved scripts/stickers-catalog.json with', finalStickers.length, 'stickers!');
