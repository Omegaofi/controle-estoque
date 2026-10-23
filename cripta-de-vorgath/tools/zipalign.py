"""Rewrites an APK so every uncompressed entry starts on a 4-byte boundary (what zipalign does)."""
import sys, zipfile

src, dst = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(src) as zin, open(dst, "wb") as raw, zipfile.ZipFile(raw, "w") as zout:
    for info in zin.infolist():
        data = zin.read(info)
        out = zipfile.ZipInfo(info.filename, date_time=info.date_time)
        out.compress_type, out.external_attr, out.extra = info.compress_type, info.external_attr, b""
        if out.compress_type == zipfile.ZIP_STORED:
            start = raw.tell() + 30 + len(out.filename.encode())
            out.extra = b"\0" * (-start % 4)
        zout.writestr(out, data)
