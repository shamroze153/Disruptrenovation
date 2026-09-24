"""v4: splice the module sources into viewer_app.js and syntax-check it."""
import subprocess, sys
D = '/home/claude/work/v4v/src/'
s = open(D + 'viewer_app.js').read()
a = s.index('// ================================================================ FURNITURE, EQUIPMENT & PEOPLE (v3.2)')
b = s.index('// ================================================================ WALKTHROUGH')
furn = '\n'.join(open(D + f).read() for f in ('m_core.js', 'm_people.js', 'm_furn.js', 'm_build.js'))
s = s[:a] + '// ================================================================ FURNITURE, EQUIPMENT & PEOPLE (v3.2)\n' + furn.split('// ================================================================ FURNITURE, EQUIPMENT & PEOPLE (v3.2)\n', 1)[-1] + '\n' + s[b:]
def block(s, name, files):
    body = '\n'.join(open(D + f).read() for f in files)
    B, E = f'// @@{name}_BEGIN\n', f'// @@{name}_END\n'
    if B not in s:
        anchor = 'window.__dmPlaced = '
        i = s.index(anchor); s = s[:i] + B + E + '\n' + s[i:]
    i = s.index(B); j = s.index(E)
    return s[:i] + B + body + '\n' + s[j:]
s = block(s, 'ARCH', ['m_arch.js'])
s = block(s, 'MAP', ['m_map.js'])
extra = [a for a in sys.argv[1:]]
for f in ['m_perf.js'] + extra:
    s = block(s, f[2:-3].upper(), [f])
open(D + 'viewer_app.js', 'w').write(s)
r = subprocess.run(['node', '--check', D + 'viewer_app.js'], capture_output=True, text=True)
print('syntax ok' if r.returncode == 0 else r.stderr[:2000])
