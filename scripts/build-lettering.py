"""Build pressure-mapped vector lockups from the fitted project typeface.

Source: the fitted Fase Pressure Black build (Anybody OFL foundation).
Typeface fitting is handled by make-font; this step only maps display lockups.
"""
from pathlib import Path
from math import sin, cos, pi, sqrt
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
import json

ROOT = Path(__file__).resolve().parents[1]
font = TTFont(ROOT / 'public/fonts/FasePressure-Black.ttf')
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()

class FlatPen(BasePen):
    def __init__(self):
        super().__init__(glyphs)
        self.contours = []
        self.points = []
    def _moveTo(self, p): self.points = [p]
    def _lineTo(self, p):
        a = self.points[-1]
        steps = max(1, int(max(abs(p[0]-a[0]),abs(p[1]-a[1]))/15))
        self.points.extend([(a[0]+(p[0]-a[0])*t/steps,a[1]+(p[1]-a[1])*t/steps) for t in range(1,steps+1)])
    def _qCurveToOne(self,b,c):
        a=self.points[-1]
        for i in range(1,13):
            t=i/12; s=1-t
            self.points.append((s*s*a[0]+2*s*t*b[0]+t*t*c[0],s*s*a[1]+2*s*t*b[1]+t*t*c[1]))
    def _curveToOne(self,b,c,d):
        a=self.points[-1]
        for i in range(1,17):
            t=i/16; s=1-t
            self.points.append((s**3*a[0]+3*s*s*t*b[0]+3*s*t*t*c[0]+t**3*d[0],s**3*a[1]+3*s*s*t*b[1]+3*s*t*t*c[1]+t**3*d[1]))
    def _closePath(self):
        self.contours.append(self.points);self.points=[]
    def _endPath(self): self._closePath()

def outlines(text):
    pen=FlatPen(); offset=0
    for char in text:
        name=cmap.get(ord(char),'space')
        glyphs[name].draw(TransformPen(pen,(1,0,0,1,offset,0)))
        offset += font['hmtx'][name][0] - font['head'].unitsPerEm * .045
    xs=[x for c in pen.contours for x,y in c]; ys=[y for c in pen.contours for x,y in c]
    return pen.contours,(min(xs),min(ys),max(xs),max(ys))

def path(text,width,height,mode='plain'):
    contours,bounds=outlines(text); x0,y0,x1,y1=bounds
    def point(x,y):
        u=(x-x0)/(x1-x0); v=1-(y-y0)/(y1-y0); s=u*2-1
        if mode=='oval':
            envelope=sqrt(max(.01,1-(s*.95)**2))
            top=.5-.435*envelope; bottom=.5+.435*envelope
            v=top+v*(bottom-top);u=.045+.91*u
            # Subtle optical irregularity softens the geometric base lettering.
            v += .012*sin(u*pi*5)*sin(v*pi)
        elif mode=='pinch':
            top=.035+.40*max(0,1-s*s)**.65
            bottom=.965-.055*max(0,1-s*s)
            v=top+v*(bottom-top)
        elif mode=='hourglass':
            u=.5+(u-.5)*(.32+.68*(abs(v-.5)*2)**1.45)
        return f'{u*width:.2f},{v*height:.2f}'
    return ' '.join('M'+' L'.join(point(x,y) for x,y in c)+' Z' for c in contours)

assets={}
for key,text,w,h,mode in [
    ('fase','EMILE',1200,330,'oval'),
    ('montevideo','MONTEVIDEO',1400,250,'pinch'),
    ('emile','EMILE',700,180,'oval'),
    ('date','19.12',500,180,'oval'),
    ('lineup','LINEUP',900,190,'pinch'),
]:
    assets[key]={'path':path(text,w,h,mode),'width':w,'height':h,'text':text}
(ROOT/'src/lib/lettering.json').write_text(json.dumps(assets),encoding='utf-8')
for key,asset in assets.items():
    w,h=asset['width'],asset['height']
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"><path fill="#393838" d="{asset["path"]}"/></svg>'
    (ROOT/f'public/brand/{key}.svg').write_text(svg,encoding='utf-8')
print('Built 5 pressure-mapped SVG lockups from Fase Pressure Black.')
