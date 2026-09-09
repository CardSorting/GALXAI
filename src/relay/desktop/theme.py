"""Code-authored window decorations: restrained macOS-style controls, no copied OS assets."""
from pathlib import Path
out = Path('/usr/share/themes/GalxDesktop/xfwm4')
out.mkdir(parents=True, exist_ok=True)
def xpm(name, w, h, pixels, colors):
    rows = [f'"{w} {h} {len(colors)} 1",'] + [f'"{k} c {v}",' for k, v in colors.items()]
    rows += [f'"{row}"' + (',' if i < len(pixels)-1 else '') for i, row in enumerate(pixels)]
    (out / f'{name}.xpm').write_text('/* XPM */\nstatic char *image[] = {\n' + '\n'.join(rows) + '\n};\n')
for state in ['active', 'inactive']:
    bg = '#252936' if state == 'active' else '#202430'
    for part in ['title-1', 'title-2', 'title-3', 'title-4', 'title-5', 'top-left', 'top-right']:
        xpm(f'{part}-{state}', 8, 32, ['.'*8]*32, {'.':bg})
    for part in ['left', 'right', 'bottom-left', 'bottom-right', 'bottom']:
        xpm(f'{part}-{state}', 4, 4, ['.'*4]*4, {'.':bg})
    for app, color in [('close','#ff6058'), ('hide','#ffbd2e'), ('maximize','#28c840')]:
        for suffix in [state, state+'-prelight', state+'-pressed']:
            pixels=[]
            for y in range(24):
                pixels.append(''.join('o' if (x-11.5)**2+(y-11.5)**2<=36 else '.' for x in range(24)))
            xpm(f'{app}-{suffix}',24,24,pixels,{'.':bg,'o':color if state=='active' else '#727888'})
(out/'themerc').write_text('active_text_color=#edf0f7\ninactive_text_color=#a2a8b8\ntitle_vertical_offset_active=0\ntitle_vertical_offset_inactive=0\nbutton_offset=8\nbutton_spacing=0\nfull_width_title=true\n')
