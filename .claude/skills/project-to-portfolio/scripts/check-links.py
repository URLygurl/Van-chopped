#!/usr/bin/env python3
"""Resolve every internal href/src as a file:// browser would.

Catches the two failures that a local HTTP server hides:
  - a link to a bare directory renders a directory listing from file://
  - a missing relative path silently 404s
Skips absolute URLs, in-page anchors and URI schemes (data:, mailto:).
"""
import pathlib, re, sys

SKIP = re.compile(r'^(https?:|data:|mailto:|tel:|#|//)')
COMMENT = re.compile(r'<!--.*?-->', re.S)

def check(paths):
    bad = []
    for f in paths:
        p = pathlib.Path(f).resolve()
        # Strip comments first: commented-out example markup ("<img src=
        # 'your-photo.jpg'>") is instructional, not a broken link.
        html = COMMENT.sub('', p.read_text())
        for attr in ('href', 'src'):
            for ref in set(re.findall(attr + r'="([^"]+)"', html)):
                ref = ref.split('#')[0]
                if not ref or SKIP.match(ref):
                    continue
                t = (p.parent / ref).resolve()
                if not t.exists():
                    bad.append(f'{f}: {attr}="{ref}" -> MISSING')
                elif t.is_dir():
                    bad.append(f'{f}: {attr}="{ref}" -> DIRECTORY (file:// lists it)')
    return bad

if __name__ == '__main__':
    bad = check(sys.argv[1:])
    print('\n'.join(bad) if bad else f'OK — every internal link in {len(sys.argv)-1} file(s) resolves to a real file')
    sys.exit(1 if bad else 0)
