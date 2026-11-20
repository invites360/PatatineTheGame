"""Scontorna i volti: rimuove lo sfondo con rembg, ritaglia sulla testa,
sfuma il collo/spalle in basso e salva PNG trasparenti 320x400."""
import sys
from pathlib import Path
from PIL import Image, ImageFilter
from rembg import remove, new_session

root = Path(sys.argv[1])
# uso: python tools/cut_faces.py <cartella progetto> [modello] [cartella output]
model = sys.argv[2] if len(sys.argv) > 2 else "birefnet-portrait"
out_dir = Path(sys.argv[3]) if len(sys.argv) > 3 else root / "img" / "faces"
out_dir.mkdir(parents=True, exist_ok=True)

# centro testa (cx, cy) e semi-altezza ry nell'immagine originale
FACES = {
    "Peppe_Troise": (132, 178, 160),
    "Marianna_meta": (198, 185, 170),
    "Checco_LaBarbera": (88, 108, 100),
    "Claudia_Ottaviano": (125, 160, 150),
    "Emanuele_Ferrante": (110, 140, 128),
    "Guido_Coppola": (70, 88, 78),
    "Martina_Murat": (108, 135, 128),
    "Yoel_Federico_Soimer": (68, 92, 88),
}
W, H = 320, 400
ERASE = {
    # mano in basso a sinistra e persona accanto a destra
    "Checco_LaBarbera": [
        [(0, 240), (60, 300), (70, 400), (0, 400)],
        [(292, 90), (320, 90), (320, 400), (292, 400), (286, 260)],
    ],
}
session = new_session(model)

for name, (cx, cy, ry) in FACES.items():
    src = Image.open(root / "img" / f"{name}.png").convert("RGB")
    # upscale piccoli per segmentazione migliore
    scale = max(1, 512 / max(src.size))
    big = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
    cut = remove(big, session=session, post_process_mask=True)
    # erosione leggera del bordo (toglie l'alone chiaro) + sfumatura
    a = cut.getchannel("A").filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.5))
    cut.putalpha(a)
    cx, cy, ry = cx * scale, cy * scale, ry * scale * 1.1
    rx = ry * W / H
    box = (round(cx - rx), round(cy - ry), round(cx + rx), round(cy + ry))
    crop = cut.crop(box).resize((W, H), Image.LANCZOS)
    # sfuma la parte bassa (collo/spalle) per un "busto" morbido
    fade = Image.new("L", (W, H), 255)
    px = fade.load()
    start = int(H * 0.80)
    for y in range(start, H):
        v = int(255 * (1 - (y - start) / (H - start)))
        for x in range(W):
            px[x, y] = v
    alpha = Image.composite(crop.getchannel("A"), Image.new("L", (W, H), 0), fade)
    from PIL import ImageChops
    alpha = ImageChops.multiply(crop.getchannel("A"), fade)
    # zone da cancellare (coordinate output 320x400)
    from PIL import ImageDraw
    dr = ImageDraw.Draw(alpha)
    for poly in ERASE.get(name, []):
        dr.polygon(poly, fill=0)
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
    crop.putalpha(alpha)
    crop.save(out_dir / f"{name}.png", optimize=True)
    print("ok", name)
