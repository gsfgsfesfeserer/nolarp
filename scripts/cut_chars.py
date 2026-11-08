# Вырезание фона у персонажей: /tmp/chars-raw/{id}.jpg → public/chars/{id}.png
# Использование: python3 scripts/cut_chars.py {start} {end}
import os, sys, time
from pathlib import Path

RAW = Path("/tmp/chars-raw")
OUT = Path("/home/z/my-project/public/chars")
OUT.mkdir(parents=True, exist_ok=True)

from rembg import remove, new_session
from PIL import Image

session = new_session("u2net")

files = sorted(RAW.glob("*.jpg"))
start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
end = int(sys.argv[2]) if len(sys.argv) > 2 else len(files)
batch = files[start:end]

t0 = time.time()
ok = 0
for f in batch:
    dest = OUT / (f.stem + ".png")
    if dest.exists() and dest.stat().st_size > 5000:
        ok += 1
        continue
    try:
        img = Image.open(f).convert("RGBA")
        result = remove(img, session=session)
        # Обрезка прозрачных полей — персонаж компактнее
        bbox = result.getbbox()
        if bbox:
            result = result.crop(bbox)
        result.save(dest)
        ok += 1
        print(f"[{f.stem}] OK {dest.stat().st_size//1024}KB", flush=True)
    except Exception as e:
        print(f"[{f.stem}] FAIL {e}", flush=True)

print(f"Готово {ok}/{len(batch)} за {time.time()-t0:.0f}s", flush=True)
