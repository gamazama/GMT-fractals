"""Generates the GE v2 tray canvas artboards (*.dc.html + canvas.json) from shared fragments.
Run from plans/ge-v2-canvas: `python gen.py`, then seed with the design helper."""
from pathlib import Path

HERE = Path(__file__).parent
CSS = (HERE / '_shared.css').read_text(encoding='utf-8')

SW = ['#2B1B3D', '#5A2E5C', '#9B3F5C', '#C8624F', '#E8925A', '#F2C078']
RAMP = 'linear-gradient(to right, #2B1B3D, #5A2E5C, #9B3F5C, #C8624F, #E8925A, #F2C078, #F7E2A8, #D9E4C9)'

def icon(name, size=15):
    p = {
        'heart': 'M12 21l-1.45-1.3C8.87 18.18 7.48 16.88 6.38 15.78 5.28 14.68 4.4 13.69 3.75 12.83 3.1 11.94 2.64 11.13 2.38 10.4 2.13 9.67 2 8.92 2 8.15c0-1.57.53-2.88 1.58-3.93S5.93 2.65 7.5 2.65c.87 0 1.69.18 2.48.55.78.37 1.45.88 2.02 1.55.57-.67 1.24-1.18 2.03-1.55.78-.37 1.6-.55 2.47-.55 1.57 0 2.88.53 3.93 1.58S22 6.58 22 8.15c0 .77-.13 1.52-.4 2.25-.25.73-.7 1.54-1.35 2.43-.65.86-1.53 1.85-2.63 2.95-1.1 1.1-2.49 2.4-4.17 3.92L12 21zm0-2.7c1.6-1.43 2.92-2.66 3.95-3.68 1.03-1.03 1.85-1.92 2.45-2.67.6-.77 1.02-1.44 1.25-2.03.23-.6.35-1.19.35-1.77 0-1-.33-1.83-1-2.5s-1.5-1-2.5-1c-.78 0-1.51.23-2.18.68-.67.43-1.12.99-1.37 1.67h-1.9c-.25-.68-.71-1.24-1.38-1.67C8.99 4.88 8.27 4.65 7.5 4.65c-1 0-1.83.33-2.5 1S4 7.15 4 8.15c0 .58.12 1.17.35 1.77.23.59.65 1.26 1.25 2.03.6.75 1.42 1.64 2.45 2.67 1.03 1.02 2.35 2.25 3.95 3.68z',
        'share': 'M17 22c-.83 0-1.54-.29-2.13-.88C14.29 20.54 14 19.83 14 19c0-.1.03-.33.08-.7l-7.03-4.1c-.27.25-.58.45-.93.59-.35.14-.72.21-1.12.21-.83 0-1.54-.29-2.13-.88C2.29 13.54 2 12.83 2 12s.29-1.54.88-2.13C3.46 9.29 4.17 9 5 9c.4 0 .78.07 1.13.21.35.14.66.34.92.59l7.03-4.1c-.03-.12-.05-.23-.06-.34S14 5.13 14 5c0-.83.29-1.54.88-2.13C15.46 2.29 16.17 2 17 2s1.54.29 2.13.88C19.71 3.46 20 4.17 20 5s-.29 1.54-.88 2.13C18.54 7.71 17.83 8 17 8c-.4 0-.78-.07-1.13-.21-.35-.14-.66-.34-.92-.59l-7.03 4.1c.03.12.05.23.06.34.01.11.02.23.02.36s-.01.25-.02.36c-.01.11-.03.22-.06.34l7.03 4.1c.27-.25.58-.45.93-.59.35-.14.72-.21 1.12-.21.83 0 1.54.29 2.13.88.58.58.87 1.29.87 2.12s-.29 1.54-.88 2.13c-.58.58-1.29.87-2.12.87z',
        'download': 'M12 16l-5-5 1.4-1.45 2.6 2.6V4h2v8.15l2.6-2.6L17 11l-5 5zm-6 4c-.55 0-1.02-.2-1.41-.59C4.2 19.02 4 18.55 4 18v-3h2v3h12v-3h2v3c0 .55-.2 1.02-.59 1.41-.39.39-.86.59-1.41.59H6z',
        'photo': 'M5 21c-.55 0-1.02-.19-1.43-.58C3.19 20.03 3 19.55 3 19V5c0-.55.19-1.02.58-1.4C3.97 3.2 4.45 3 5 3h14c.55 0 1.02.2 1.4.6.4.38.6.85.6 1.4v14c0 .55-.2 1.03-.6 1.43-.38.38-.85.57-1.4.57H5zm0-2h14V5H5v14zm1-2h12l-3.75-5-3 4L9 13l-3 4z',
        'fullscreen': 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
    }
    if name in p:
        return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="{p[name]}"></path></svg>'
    s = {'chevronDown': 'M4 6l4 4 4-4', 'chevronUp': 'M4 10l4-4 4 4', 'plus': 'M8 3.5v9M3.5 8h9', 'menu': 'M3 4.5h10M3 8h10M3 11.5h10', 'swap': 'M3 5.5h8M9 3l2 2.5-2 2.5M13 10.5H5M7 8l-2 2.5 2 2.5'}[name]
    return f'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="{s}"></path></svg>'

def act(label, cls='', ic=None, after=None):
    inner = (icon(ic) if ic else '') + (f'<span>{label}</span>' if label else '') + (icon(after) if after else '')
    return f'<div class="act {cls}">{inner}</div>'

def slider(label, value, frac):
    return (f'<div class="slider"><div class="row"><span>{label}</span><span class="mono">{value}</span></div>'
            f'<div class="track"><div class="fill" style="width: {frac:.0%}"></div><div class="thumb" style="left: calc({frac:.0%} - 2px)"></div></div></div>')

def tabrow(active):
    tabs = ''.join(act(t, 'on' if t == active else '', after='chevronUp' if t == active else 'chevronDown') for t in ['Mix', 'Image', 'Curves', 'Adjust'])
    return (f'<div class="tabrow">{tabs}<div class="meta"><span>blend</span><b>Oklab</b><span>output</span><b>Linear</b>'
            f'<div class="act icon" style="height: 22px; width: 22px">{icon("menu")}</div></div></div>')

def hero_card(state='preview'):
    swatches = ''.join(f'<div class="bar" style="flex: 1 1 0; height: 36px; background: {c}"></div>' for c in SW)
    state_html = ('<div style="display: flex; align-items: center; gap: 6px; color: #4B5563"><div style="width: 8px; height: 8px; border-radius: 4px; background: #6B7280"></div><span>preview</span></div>'
                  if state == 'preview' else
                  '<div style="display: flex; align-items: center; gap: 6px; color: #16A34A"><div style="width: 8px; height: 8px; border-radius: 4px; background: #16A34A"></div><span>live from Mix</span></div>')
    return f'''
<div style="padding: 10px; background: #D3D3D3; border-bottom: 1px solid rgba(17,24,39,0.1)">
  <div style="display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 16px; padding-left: 13px; border-radius: 20px; background: #C5C5C5; border: 1px solid rgba(17,24,39,0.2); overflow: hidden">
    <div style="display: flex; flex-direction: column; justify-content: center; padding: 4px 0">
      <div style="width: 45px; height: 84px; border-radius: 8px; border: 1px dashed rgba(17,24,39,0.4); color: #4B5563; display: flex; align-items: center; justify-content: center">{icon('photo', 18)}</div>
    </div>
    <div style="display: flex; flex-direction: column; border-radius: 20px; background: #B6B6B6; overflow: hidden; min-width: 0">
      <div style="display: flex; align-items: center; gap: 6px; height: 42px; padding: 0 16px; background: #D3D3D3">
        <div style="font-size: 18px; font-weight: 600; color: #111111">Copper Dusk</div>
        {state_html}
        <div style="flex: 1"></div>
        {act('More like this')}
        <div style="display: flex; align-items: center; gap: 6px; margin-left: 4px">
          {act('', 'icon', 'heart')}{act('', 'icon', 'share')}{act('', 'icon', 'download')}{act('', 'icon', 'fullscreen')}
        </div>
      </div>
      <div style="display: flex; flex-direction: column; padding: 16px 16px 8px">
        <div style="display: flex; align-items: center; gap: 6px; height: 36px; margin-bottom: 12px">
          {swatches}
          <div style="padding-left: 4px">{act('', 'icon', 'plus')}</div>
          <div style="display: flex; gap: 6px; padding-left: 4px">{act('Even', 'on accent')}{act('Perceptual')}{act('Stops')}</div>
        </div>
        <div style="border-radius: 10px; overflow: hidden; background: linear-gradient(to right, #2B1B3D 50%, #D9E4C9 50%)">
          <div style="margin: 0 8px; height: 60px; background: {RAMP}"></div>
          <div style="height: 24px; background: rgba(17,24,39,0.05); position: relative">
            <div style="position: absolute; left: 2px; top: 4px; width: 12px; height: 14px; background: #FFFFFF; border: 1px solid #111111; border-radius: 2px"></div>
            <div style="position: absolute; right: 2px; top: 4px; width: 12px; height: 14px; background: #FFFFFF; border: 1px solid #111111; border-radius: 2px"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>'''

def shell(tray_html, tray_top=233 + 48, extra=''):
    return f'''
<div style="position: relative; width: 1280px; height: 800px; background: #D1D1D1; overflow: hidden; display: flex; flex-direction: column">
  <div style="height: 48px; display: flex; align-items: center; padding: 0 16px; gap: 10px; background: #D3D3D3; border-bottom: 1px solid rgba(17,24,39,0.1); color: #111111; font-size: 15px"><b style="color: #0E7A90">GMT</b> Gradient Explorer</div>
  {hero_card()}
  <div style="flex: 1; background: #B6B6B6"></div>
  <div style="height: 88px; background: #D3D3D3; border-top: 1px solid rgba(17,24,39,0.1)"></div>
  <div class="tray" style="top: {tray_top}px">{tray_html}</div>
  {extra}
</div>'''

# ── faces ─────────────────────────────────────────────────────────────────────
def group(inner, flex='1'):
    return f'<div style="flex: {flex}; display: flex; flex-direction: column; gap: 12px; padding: 12px 14px; border-radius: 10px; background: #B6B6B6">{inner}</div>'

FACE_ADJUST = tabrow('Adjust') + f'''
<div class="face" style="flex-direction: row; gap: 12px; align-items: stretch">
  {group(slider('Hue rotate', '0', 0.5) + slider('Chroma ×', '1.00', 0.4) + slider('Contrast', '1.00', 0.35), '1.1')}
  {group(slider('Phase', '0.00', 0) + slider('Repeats', '1', 0) + slider('Posterize bands', '0', 0), '1')}
  {group(slider('Noise: Strength', '0', 0) + slider('Noise: Frequency', '32', 0.25) + '<div style="display: flex; align-items: center; gap: 6px"><span class="zone" style="margin-right: 4px">Targets</span>' + act('lightness', 'on accent') + act('chroma') + act('hue') + '</div>', '1')}
</div>'''

FACE_MIX = tabrow('Mix') + f'''
<div class="face" style="flex-direction: row; align-items: center; gap: 8px; padding-top: 4px">
  {act('Swap', '', 'swap')}{act('Split by channel', '', after='chevronDown')}
  <span style="color: #4B5563; margin-left: 8px">Picks fill band B. Click band A above to fill A instead. Drag the line between them to blend.</span>
</div>'''

FACE_CURVES = tabrow('Curves') + f'''
<div class="face">
  <div style="display: flex; align-items: center; gap: 8px">
    {act('Fit from source')}{act('Curves off')}{act('Reset')}
    <div style="display: flex; align-items: center; gap: 8px; margin-left: 12px; width: 220px"><span>Detail</span><div class="slider" style="flex: 1"><div class="track"><div class="fill" style="width: 75%"></div><div class="thumb" style="left: calc(75% - 2px)"></div></div></div><span class="mono">8</span></div>
    <div style="display: flex; align-items: center; gap: 8px; width: 220px"><span>Smooth</span><div class="slider" style="flex: 1"><div class="track"><div class="fill" style="width: 50%"></div><div class="thumb" style="left: calc(50% - 2px)"></div></div></div><span class="mono">5</span></div>
    <span style="margin-left: auto; color: #4B5563">Detail and Smooth are the fit recipe; the faint ghost previews a re-fit.</span>
  </div>
  <div style="height: 240px; border-radius: 10px; background: #B6B6B6; position: relative; overflow: hidden">
    <svg width="1200" height="240" viewBox="0 0 1200 240" style="position: absolute; inset: 0" aria-hidden="true">
      <path d="M0 200 C 300 190, 600 60, 1200 40" fill="none" stroke="#FFFFFF" stroke-width="2"></path>
      <path d="M0 140 C 400 150, 700 120, 1200 130" fill="none" stroke="#0E7A90" stroke-width="2"></path>
      <path d="M0 90 C 300 60, 800 180, 1200 100" fill="none" stroke="#D97706" stroke-width="2"></path>
    </svg>
    <div style="position: absolute; left: 12px; top: 10px; display: flex; gap: 12px; font-size: 11px; color: #4B5563"><span style="color: #FFFFFF">L</span><span style="color: #0E7A90">C</span><span style="color: #D97706">h</span></div>
  </div>
</div>'''

def chan(label, value, frac, grad):
    return (f'<div style="display: flex; align-items: center; gap: 8px"><span class="mono" style="width: 12px; color: #4B5563; font-weight: 600">{label}</span>'
            f'<div style="flex: 1; height: 10px; border-radius: 5px; background: {grad}; position: relative"><div style="position: absolute; top: -3px; left: calc({frac:.0%} - 2px); width: 4px; height: 16px; background: #FFFFFF; border-radius: 2px; box-shadow: 0 0 0 1px rgba(0,0,0,0.45)"></div></div>'
            f'<span class="mono" style="width: 36px; text-align: right; color: #111111">{value}</span></div>')

def divider(collapsed=False, title=''):
    chev = 'M10 4l-4 4 4 4' if not collapsed else 'M6 4l4 4-4 4'
    return (f'<div style="display: flex; flex-direction: column; align-items: center; gap: 6px; width: 16px; align-self: stretch" title="{title}">'
            f'<div style="flex: 1; width: 1px; background: rgba(17,24,39,0.2)"></div>'
            f'<div style="width: 16px; height: 16px; border-radius: 8px; background: #C5C5C5; border: 1px solid rgba(17,24,39,0.2); display: flex; align-items: center; justify-content: center; color: #4B5563">'
            f'<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="{chev}"></path></svg></div>'
            f'<div style="flex: 1; width: 1px; background: rgba(17,24,39,0.2)"></div></div>')

FACE_INSPECTOR = f'''
<div class="tabrow"><span class="zone">stop 4 of 8 · t = 0.43</span></div>
<div class="face" style="flex-direction: row; gap: 12px; padding-top: 4px; align-items: stretch">
  <div style="width: 260px; display: flex; flex-direction: column; gap: 8px">
    <div style="display: flex; align-items: center; gap: 8px"><div class="bar" style="width: 26px; height: 26px; background: #C8624F"></div><div class="mono" style="flex: 1; height: 26px; border-radius: 8px; border: 1px solid rgba(17,24,39,0.2); display: flex; align-items: center; padding: 0 10px">#C8624F</div>{act('Copy')}</div>
    <div style="height: 150px; border-radius: 10px; background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, #E8541A)"></div>
  </div>
  {divider(False, 'collapse the colour field')}
  <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; justify-content: center">
    {chan('R', '200', 0.78, 'linear-gradient(to right, #00624F, #FF624F)')}{chan('G', '98', 0.38, 'linear-gradient(to right, #C8004F, #C8FF4F)')}{chan('B', '79', 0.31, 'linear-gradient(to right, #C86200, #C862FF)')}
    <div style="height: 2px"></div>
    {chan('H', '9', 0.03, 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)')}{chan('S', '61', 0.61, 'linear-gradient(to right, #C8C8C8, #C8402A)')}{chan('B', '78', 0.78, 'linear-gradient(to right, #000, #FF7D65)')}
  </div>
  {divider(True, 'position · bias · interpolation — collapsed')}
  <div style="width: 22px; display: flex; align-items: center; justify-content: center"><span class="zone" style="writing-mode: vertical-rl; transform: rotate(180deg)">position · bias · interpolation</span></div>
  {divider(False, 'collapse the palette column')}
  <div style="width: 300px; display: flex; flex-direction: column; gap: 8px; justify-content: center">
    <div style="display: flex; align-items: center; gap: 8px"><span class="zone" style="width: 56px">Palette</span><div style="flex: 1; display: flex; gap: 4px">{''.join(f'<div class="bar" style="flex: 1; height: 22px; background: {c}"></div>' for c in SW)}</div></div>
    <div style="display: flex; align-items: center; gap: 8px"><span class="zone" style="width: 56px">Recent</span><div style="flex: 1; display: flex; gap: 4px">{''.join(f'<div class="bar" style="flex: 1; height: 22px; background: {c}"></div>' for c in ['#0E7A90', '#F2C078', '#2B1B3D', '#9B3F5C'])}<div style="flex: 2"></div></div></div>
    <div style="color: #4B5563; font-size: 11px">Harmony rows (Analog · Mono · Comp · Split) — Phase E decides whether they stay.</div>
  </div>
</div>'''

FACE_IMAGE = tabrow('Image') + f'''
<div class="face" style="gap: 12px">
  <div style="display: flex; align-items: center; gap: 6px">{act('Dominant', 'on accent')}{act('Tones')}{act('Path')}<div style="flex: 1"></div>{act('Replace image')}</div>
  <div style="display: grid; grid-template-columns: 360px minmax(0, 1fr) 240px; gap: 16px">
    <div style="display: flex; flex-direction: column; gap: 12px">{slider('Colours', '6', 0.35)}{slider('Saliency', '0.60', 0.6)}
      <div style="display: flex; align-items: center; gap: 8px"><span class="zone" style="width: 72px">Dominant</span><div style="flex: 1; display: flex; gap: 4px">{''.join(f'<div class="bar" style="flex: 1; height: 22px; background: {c}"></div>' for c in SW)}</div></div>
    </div>
    <div style="height: 200px; border-radius: 10px; background: linear-gradient(135deg, #8A6A4A, #3A2A2A 60%, #C8A070); position: relative">
      <svg width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="none" style="position: absolute; inset: 0" aria-hidden="true"><path d="M60 150 C 200 40, 380 170, 540 60" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="6 4"></path><circle cx="60" cy="150" r="6" fill="#FFFFFF"></circle><circle cx="540" cy="60" r="6" fill="#FFFFFF"></circle></svg>
      <div style="position: absolute; left: 8px; bottom: 8px; display: flex; gap: 6px">{act('Draw')}{act('Auto', 'on accent')}{act('Straight')}</div>
    </div>
    <div style="height: 200px; border-radius: 10px; background: #B6B6B6; display: flex; align-items: center; justify-content: center; color: #4B5563">colour cloud</div>
  </div>
</div>'''

def doc(body, title, w, h):
    return f'''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <title>{title}</title>
  <style>
{CSS}
  </style>
</helmet>
{body}
</x-dc>
</body>
</html>
'''

def standalone_tray(face, h):
    return f'<div style="position: relative; width: 1232px; height: {h}px; background: #B6B6B6"><div class="tray" style="left: 0; top: 0; border-top: 1px solid rgba(17,24,39,0.2)">{face}</div></div>'

boards = {
    'Main': (doc(shell(FACE_ADJUST), 'Tray — Adjust open', 1280, 800), 1280, 800),
    'TrayMix': (doc(standalone_tray(FACE_MIX, 120), 'Mix face', 1232, 120), 1232, 120),
    'TrayCurves': (doc(standalone_tray(FACE_CURVES, 360), 'Curves face', 1232, 360), 1232, 360),
    'TrayInspector': (doc(standalone_tray(FACE_INSPECTOR, 240), 'Stop inspector face', 1232, 240), 1232, 240),
    'TrayImage': (doc(standalone_tray(FACE_IMAGE, 320), 'Image face', 1232, 320), 1232, 320),
}
before = ''.join(f'<div style="display: flex; flex-direction: column; gap: 6px"><div class="zone">today — {n}</div><img src="before-{n}.jpg" style="width: 1200px; height: 525px; border-radius: 10px; display: block"></div>' for n in ['mix', 'image', 'curves', 'adjust', 'inspector'])
boards['Before'] = (doc(f'<div style="display: flex; flex-direction: column; gap: 24px; padding: 20px; width: 1200px; background: #D1D1D1">{before}</div>', 'Before — today', 1240, 5 * 555 + 40), 1240, 5 * 555 + 40)

for name, (html, w, h) in boards.items():
    (HERE / f'{name}.dc.html').write_text(html, encoding='utf-8', newline='\n')

canvas = {
    'artboards': [
        {'file': 'Main.dc.html', 'x': 0, 'y': 0, 'w': 1280, 'h': 800, 'title': 'Shell — tray open on Adjust'},
        {'file': 'TrayMix.dc.html', 'x': 0, 'y': 940, 'w': 1232, 'h': 120, 'title': 'Face — Mix (a strip)'},
        {'file': 'TrayCurves.dc.html', 'x': 0, 'y': 1200, 'w': 1232, 'h': 360, 'title': 'Face — Curves'},
        {'file': 'TrayInspector.dc.html', 'x': 0, 'y': 1700, 'w': 1232, 'h': 240, 'title': 'Face — Stop inspector'},
        {'file': 'TrayImage.dc.html', 'x': 0, 'y': 2080, 'w': 1232, 'h': 320, 'title': 'Face — Image'},
        {'file': 'Before.dc.html', 'x': 1440, 'y': 0, 'w': 1240, 'h': 5 * 555 + 40, 'title': 'Before — the five states today'},
    ],
    'annotations': [
        {'id': 'rule', 'x': 1440, 'y': -200, 'w': 420, 'text': 'ONE thing open under the card at a time. The tray hangs from the card\'s bottom edge, floats over the wall, never pushes the shelf. Esc closes. The ramp\'s Curves / Adjust row becomes the tray\'s tab row and gains Mix and Image; the stop inspector opens on a stop click and has no tab. Brief: plans/ge-v2-figma/trays-spec.md'},
    ],
    'launch': {'view': 'canvas'},
}
import json
(HERE / 'canvas.json').write_text(json.dumps(canvas, indent=2), encoding='utf-8', newline='\n')
print('wrote', ', '.join(boards))
