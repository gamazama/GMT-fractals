/**
 * indesignIdml — build an InDesign IDML package whose Swatches panel holds each
 * gradient as a real **gradient swatch**. ASE (Adobe Swatch Exchange) can only
 * carry solid colours, and InDesign's "Load Swatches" rejects our plain-text .ai
 * (it wants PDF-format), so IDML is the reliable InDesign-native route.
 *
 * IDML is a ZIP of XML parts. Reverse-engineered from a real InDesign export:
 *   - Resources/Graphic.xml holds <Color> swatches + <Gradient Type="Linear">
 *     with <GradientStop StopColor="Color/…" Location="0..100" Midpoint="50"/>
 *     (first stop omits Midpoint; stops ascending).
 *   - designmap.xml's Root <ColorGroup> lists each swatch via <ColorGroupSwatch>,
 *     cross-linked to the gradient's SwatchColorGroupReference.
 * Every other package part is kept verbatim from the template (guaranteeing
 * InDesign-validity); we only rebuild Graphic.xml and patch the colour group.
 *
 * Each 256-step ramp is reduced to ≤AI_STOP_LIMIT stops (shared Douglas-Peucker),
 * so the swatch matches the displayed ramp — same stop budget as .ai.
 */

import { zipSync, strToU8, strFromU8, unzlibSync } from 'fflate';
import type { RGB } from './oklab';
import { reduceStopIndices, AI_STOP_LIMIT } from './exportFormats';
import { IDML_TEMPLATE_B64 } from './indesignIdmlTemplate';

interface IdmlTemplate {
  order: string[];
  parts: Record<string, string>;
}

const b64ToU8 = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
};

let _tpl: IdmlTemplate | null = null;
const template = (): IdmlTemplate => {
  if (!_tpl) _tpl = JSON.parse(strFromU8(unzlibSync(b64ToU8(IDML_TEMPLATE_B64)))) as IdmlTemplate;
  return _tpl;
};

const ri = (c: RGB): [number, number, number] => [Math.round(c.r), Math.round(c.g), Math.round(c.b)];
const xmlEsc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const loc = (n: number): string => {
  let s = n.toFixed(6);
  if (s.indexOf('.') !== -1) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
};

// Standard InDesign "new document" resources — present in every doc. Hardcoded
// (not user data) so generated docs resolve Black/Paper/Registration/None + the
// default helper colours and gradient that InDesign expects.
const GRAPHIC_RESERVED = [
  '\t<Color Self="Color/Black" Model="Process" Space="RGB" ColorValue="0 0 0" ColorOverride="Specialblack" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Black" ColorEditable="false" ColorRemovable="false" Visible="true" SwatchCreatorID="7937" SwatchColorGroupReference="u18ColorGroupSwatch3" />',
  '\t<Color Self="Color/Cyan" Model="Process" Space="CMYK" ColorValue="100 0 0 0" ColorOverride="Hiddenreserved" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Cyan" ColorEditable="false" ColorRemovable="false" Visible="false" SwatchCreatorID="7937" SwatchColorGroupReference="n" />',
  '\t<Color Self="Color/Magenta" Model="Process" Space="CMYK" ColorValue="0 100 0 0" ColorOverride="Hiddenreserved" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Magenta" ColorEditable="false" ColorRemovable="false" Visible="false" SwatchCreatorID="7937" SwatchColorGroupReference="n" />',
  '\t<Color Self="Color/Yellow" Model="Process" Space="CMYK" ColorValue="0 0 100 0" ColorOverride="Hiddenreserved" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Yellow" ColorEditable="false" ColorRemovable="false" Visible="false" SwatchCreatorID="7937" SwatchColorGroupReference="n" />',
  '\t<Color Self="Color/Paper" Model="Process" Space="CMYK" ColorValue="0 0 0 0" ColorOverride="Specialpaper" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Paper" ColorEditable="true" ColorRemovable="false" Visible="true" SwatchCreatorID="7937" SwatchColorGroupReference="u18ColorGroupSwatch2" />',
  '\t<Color Self="Color/Registration" Model="Registration" Space="CMYK" ColorValue="100 100 100 100" ColorOverride="Specialregistration" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Registration" ColorEditable="false" ColorRemovable="false" Visible="true" SwatchCreatorID="7937" SwatchColorGroupReference="u18ColorGroupSwatch1" />',
  '\t<Color Self="Color/u96" Model="Process" Space="RGB" ColorValue="0 0 0" ColorOverride="Normal" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="$ID/" ColorEditable="true" ColorRemovable="true" Visible="false" SwatchCreatorID="7937" SwatchColorGroupReference="n" />',
  '\t<Color Self="Color/u98" Model="Process" Space="CMYK" ColorValue="0 0 0 0" ColorOverride="Normal" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="$ID/" ColorEditable="true" ColorRemovable="true" Visible="false" SwatchCreatorID="7937" SwatchColorGroupReference="n" />',
  '\t<Ink Self="Ink/$ID/Process Cyan" Name="$ID/Process Cyan" Angle="75" ConvertToProcess="false" Frequency="70" NeutralDensity="0.61" PrintInk="true" TrapOrder="1" InkType="Normal" />',
  '\t<Ink Self="Ink/$ID/Process Magenta" Name="$ID/Process Magenta" Angle="15" ConvertToProcess="false" Frequency="70" NeutralDensity="0.76" PrintInk="true" TrapOrder="2" InkType="Normal" />',
  '\t<Ink Self="Ink/$ID/Process Yellow" Name="$ID/Process Yellow" Angle="0" ConvertToProcess="false" Frequency="70" NeutralDensity="0.16" PrintInk="true" TrapOrder="3" InkType="Normal" />',
  '\t<Ink Self="Ink/$ID/Process Black" Name="$ID/Process Black" Angle="45" ConvertToProcess="false" Frequency="70" NeutralDensity="1.7" PrintInk="true" TrapOrder="4" InkType="Normal" />',
  '\t<Swatch Self="Swatch/None" Name="None" ColorEditable="false" ColorRemovable="false" Visible="true" SwatchCreatorID="7937" SwatchColorGroupReference="u18ColorGroupSwatch0" />',
].join('\n');

const GRAPHIC_STROKESTYLES = [
  'Triple_Stroke', 'ThickThinThick', 'ThinThickThin', 'ThickThick', 'ThickThin', 'ThinThick', 'ThinThin',
  'Japanese Dots', 'White Diamond', 'Left Slant Hash', 'Right Slant Hash', 'Straight Hash', 'Wavy',
  'Canned Dotted', 'Canned Dashed 3x2', 'Canned Dashed 4x4', 'Dashed', 'Solid',
].map((n) => `\t<StrokeStyle Self="StrokeStyle/$ID/${n}" Name="$ID/${n}" />`).join('\n');

const GRAPHIC_HEADER =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<idPkg:Graphic xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="21.4">';

/** Unique display names (InDesign merges same-named swatches). */
const uniqueNames = (items: { name: string }[]): string[] => {
  const seen = new Map<string, number>();
  return items.map((it) => {
    const base = it.name || 'gradient';
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n ? `${base} ${n + 1}` : base;
  });
};

interface Built {
  graphicXml: string;
  colorGroupSwatches: string; // <ColorGroupSwatch> lines for designmap
}

const buildGraphic = (items: { name: string; ramp: RGB[] }[]): Built => {
  const names = uniqueNames(items);
  const colors: string[] = [];
  const gradients: string[] = [];
  const cgSwatches: string[] = [];

  items.forEach((g, gi) => {
    const idx = reduceStopIndices(g.ramp, AI_STOP_LIMIT); // ascending positions
    const stops: string[] = [];
    idx.forEach((ii, si) => {
      const [r, gg, b] = ri(g.ramp[ii]);
      const cid = `Color/gmtG${gi}s${si}`;
      colors.push(
        `\t<Color Self="${cid}" Model="Process" Space="RGB" ColorValue="${r} ${gg} ${b}" ColorOverride="Normal" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="$ID/" ColorEditable="true" ColorRemovable="true" Visible="false" SwatchCreatorID="7937" SwatchColorGroupReference="n" />`,
      );
      const midpoint = si === 0 ? '' : ' Midpoint="50"';
      stops.push(`\t\t<GradientStop Self="gmtG${gi}Stop${si}" StopColor="${cid}" Location="${loc((ii / 255) * 100)}"${midpoint} />`);
    });
    const cgRef = `gmtCGS${gi}`;
    gradients.push(
      `\t<Gradient Self="Gradient/gmtGrad${gi}" Type="Linear" Name="${xmlEsc(names[gi])}" ColorEditable="true" ColorRemovable="true" Visible="true" SwatchCreatorID="7937" SwatchColorGroupReference="${cgRef}">\n${stops.join('\n')}\n\t</Gradient>`,
    );
    cgSwatches.push(`\t\t<ColorGroupSwatch Self="${cgRef}" SwatchItemRef="Gradient/gmtGrad${gi}" />`);
  });

  const graphicXml = [
    GRAPHIC_HEADER,
    GRAPHIC_RESERVED,
    ...colors,
    ...gradients,
    GRAPHIC_STROKESTYLES,
    '</idPkg:Graphic>',
  ].join('\n');

  return { graphicXml, colorGroupSwatches: cgSwatches.join('\n') };
};

/** Replace designmap's Root Color Group with the reserved swatches + our gradients. */
const patchDesignmap = (dm: string, cgSwatches: string): string => {
  const group =
    '<ColorGroup Self="ColorGroup/[Root Color Group]" Name="[Root Color Group]" IsRootColorGroup="true">\n' +
    '\t\t<ColorGroupSwatch Self="u18ColorGroupSwatch0" SwatchItemRef="Swatch/None" />\n' +
    '\t\t<ColorGroupSwatch Self="u18ColorGroupSwatch1" SwatchItemRef="Color/Registration" />\n' +
    '\t\t<ColorGroupSwatch Self="u18ColorGroupSwatch2" SwatchItemRef="Color/Paper" />\n' +
    '\t\t<ColorGroupSwatch Self="u18ColorGroupSwatch3" SwatchItemRef="Color/Black" />\n' +
    (cgSwatches ? cgSwatches + '\n' : '') +
    '\t</ColorGroup>';
  return dm.replace(/<ColorGroup\b[\s\S]*?<\/ColorGroup>/, group);
};

/** Build a complete InDesign `.idml` swatch library from one or more named ramps. */
export const buildIdmlSwatchLibrary = (items: { name: string; ramp: RGB[] }[]): Uint8Array => {
  const tpl = template();
  const { graphicXml, colorGroupSwatches } = buildGraphic(items);

  const parts: Record<string, string> = { ...tpl.parts };
  parts['Resources/Graphic.xml'] = graphicXml;
  parts['designmap.xml'] = patchDesignmap(parts['designmap.xml'], colorGroupSwatches);

  // Re-zip in the original part order. mimetype MUST be stored (uncompressed) and first.
  const files: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  for (const name of tpl.order) {
    files[name] = [strToU8(parts[name]), { level: name === 'mimetype' ? 0 : 6 }];
  }
  return zipSync(files);
};
