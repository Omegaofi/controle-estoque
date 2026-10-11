"""Gerador de arquivos ASS (Advanced SubStation Alpha) para o libass/FFmpeg.

O ASS serve para duas coisas no estúdio:
  * legendas estilizadas (clássica ou karaokê palavra a palavra);
  * motion graphics leves: títulos animados, lower-thirds e textos de
    destaque com fade, deslizamento, escala e desfoque, renderizados pelo
    filtro `subtitles` do FFmpeg, sem depender de um editor gráfico.
"""
from __future__ import annotations

from dataclasses import dataclass, field


def ts(seconds: float) -> str:
    seconds = max(0.0, seconds)
    cs = int(round(seconds * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def color(hex_rgb: str, alpha: int = 0) -> str:
    """'#RRGGBB' -> '&HAABBGGRR' (o ASS usa BGR e alfa invertido)."""
    h = hex_rgb.lstrip("#")
    r, g, b = h[0:2], h[2:4], h[4:6]
    return f"&H{alpha:02X}{b}{g}{r}".upper()


def escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("{", "(").replace("}", ")").replace("\n", "\\N")


@dataclass
class Theme:
    font: str = "Inter"
    primary: str = "#FFFFFF"
    accent: str = "#FFD400"
    outline: str = "#000000"
    box: str = "#101418"


@dataclass
class AssDoc:
    width: int = 1920
    height: int = 1080
    theme: Theme = field(default_factory=Theme)
    events: list[str] = field(default_factory=list)

    @property
    def scale(self) -> float:
        """Escala tipográfica pelo lado menor: 1.0 em 1920x1080 e em 1080x1920."""
        return min(self.width, self.height) / 1080

    @property
    def vertical(self) -> bool:
        return self.height > self.width

    # ---------------------------------------------------------------- estilos
    def _styles(self) -> list[str]:
        t, s = self.theme, self.scale
        cap_mv = 0.2 * self.height / s if self.vertical else 90   # no vertical, acima da UI dos apps
        fmt = ("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, "
               "BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, "
               "BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding")

        def style(name, size, prim, sec, out, back, bold, border, outline, shadow, align, mv, ml=60):
            return (f"Style: {name},{t.font},{round(size * s)},{prim},{sec},{out},{back},{bold},0,0,0,"
                    f"100,100,0,0,{border},{round(outline * s, 1)},{round(shadow * s, 1)},{align},"
                    f"{round(ml * s)},{round(ml * s)},{round(mv * s)},1")
        return [fmt,
                style("Caption", 64, color(t.primary), color(t.accent), color(t.outline), color("#000000", 0x80),
                      -1, 1, 4, 2, 2, cap_mv),
                style("Karaoke", 70, color(t.accent), color(t.primary), color(t.outline), color("#000000", 0x80),
                      -1, 1, 5, 2, 2, cap_mv + 20),
                style("Title", 120, color(t.primary), color(t.accent), color(t.outline), color("#000000", 0xFF),
                      -1, 1, 0, 6, 5, 0),
                style("Subtitle", 54, color(t.accent), color(t.primary), color(t.outline), color("#000000", 0xFF),
                      0, 1, 0, 3, 5, 0),
                style("LowerName", 52, color(t.primary), color(t.primary), color(t.box), color(t.box),
                      -1, 3, 18, 0, 1, 150, 90),
                style("LowerRole", 36, color(t.box), color(t.box), color(t.accent), color(t.accent),
                      0, 3, 12, 0, 1, 90, 90),
                style("Callout", 84, color(t.primary), color(t.accent), color(t.outline), color("#000000", 0x60),
                      -1, 1, 5, 3, 8, 120)]

    def render(self) -> str:
        head = ["[Script Info]", "ScriptType: v4.00+", f"PlayResX: {self.width}",
                f"PlayResY: {self.height}", "WrapStyle: 0", "ScaledBorderAndShadow: yes",
                "YCbCr Matrix: TV.709", "", "[V4+ Styles]", *self._styles(), "", "[Events]",
                "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
        return "\n".join(head + self.events) + "\n"

    def add(self, start: float, end: float, style: str, text: str, layer: int = 0) -> None:
        if end - start <= 0.01:
            return
        self.events.append(f"Dialogue: {layer},{ts(start)},{ts(end)},{style},,0,0,0,,{text}")

    # ---------------------------------------------------------------- legendas
    def caption(self, start: float, end: float, text: str) -> None:
        self.add(start, end, "Caption", r"{\fad(80,80)}" + escape(text), layer=5)

    def karaoke(self, words: list[dict]) -> None:
        """Destaque palavra a palavra; `words` = [{start,end,word}] de uma mesma linha."""
        if not words:
            return
        start, end = words[0]["start"], words[-1]["end"]
        parts, cur = [], start
        for n, w in enumerate(words):
            gap = max(0.0, w["start"] - cur)
            if gap > 0.01:
                parts.append(r"{\k%d}" % round(gap * 100))
            sep = " " if n < len(words) - 1 else ""
            parts.append(r"{\k%d}%s%s" % (max(1, round((w["end"] - w["start"]) * 100)), escape(w["word"]), sep))
            cur = w["end"]
        # \k começa com SecondaryColour (primária do tema) e passa à PrimaryColour (destaque)
        self.add(start, end, "Karaoke", r"{\fad(60,60)}" + "".join(parts), layer=5)

    # ---------------------------------------------------------- motion graphics
    def title(self, start: float, end: float, text: str, subtitle: str = "") -> None:
        cx, cy = self.width // 2, self.height // 2
        d = round(40 * self.scale)
        # entra de baixo com blur e escala, sai com fade
        self.add(start, end, "Title",
                 r"{\an5\move(%d,%d,%d,%d,0,600)\fad(400,500)\blur8\fscx115\fscy115"
                 r"\t(0,600,\blur0\fscx100\fscy100)}%s" % (cx, cy + d, cx, cy - d // 2, escape(text)), layer=10)
        if subtitle:
            self.add(start + 0.35, end, "Subtitle",
                     r"{\an5\pos(%d,%d)\fad(500,500)\fsp20\t(0,800,\fsp4)}%s"
                     % (cx, cy + 3 * d, escape(subtitle)), layer=10)

    def lower_third(self, start: float, end: float, name: str, role: str = "") -> None:
        s = self.scale
        x = round(110 * s if not self.vertical else 70 * s)
        y = round(self.height * 0.58 if self.vertical else self.height - 330 * s)
        slide = round(600 * s)
        self.add(start, end, "LowerName",
                 r"{\an1\move(%d,%d,%d,%d,0,450)\fad(250,350)}%s" % (x - slide, y, x, y, escape(name)), layer=10)
        if role:
            y2 = y + round(78 * s)
            self.add(start + 0.15, end, "LowerRole",
                     r"{\an1\move(%d,%d,%d,%d,0,450)\fad(250,350)}%s" % (x - slide, y2, x, y2, escape(role)),
                     layer=10)

    def callout(self, start: float, end: float, text: str) -> None:
        """Texto de destaque com 'pop' (escala com overshoot)."""
        self.add(start, end, "Callout",
                 r"{\an8\fad(120,250)\fscx40\fscy40\t(0,180,\fscx112\fscy112)\t(180,300,\fscx100\fscy100)}%s"
                 % escape(text), layer=10)


def group_words(words: list[dict], max_chars: int = 32, max_dur: float = 3.2,
                max_gap: float = 0.7) -> list[list[dict]]:
    """Agrupa palavras em linhas curtas e legíveis, quebrando em pontuação/pausas."""
    lines, cur = [], []
    for w in words:
        if cur:
            text_len = len(" ".join(x["word"] for x in cur + [w]))
            if (text_len > max_chars or w["end"] - cur[0]["start"] > max_dur
                    or w["start"] - cur[-1]["end"] > max_gap
                    or cur[-1]["word"].rstrip()[-1:] in ".?!"):
                lines.append(cur)
                cur = []
        cur.append(w)
    if cur:
        lines.append(cur)
    return lines
