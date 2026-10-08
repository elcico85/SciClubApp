using System.Drawing.Drawing2D;
using System.Drawing.Text;

namespace EtichetteSci;

/// <summary>Disegna un'etichetta 62x25 mm. Il Graphics deve avere PageUnit = Millimeter e origine nell'angolo dell'etichetta.</summary>
static class LabelRenderer
{
    public const float WidthMm = 62f, HeightMm = 25f;
    const float MarginX = 2f, MarginY = 1.2f;

    record Seg(string Text, bool Bold);

    public static void Draw(Graphics g, Athlete a, string season)
    {
        g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
        g.SmoothingMode = SmoothingMode.AntiAlias;

        var lines = new[]
        {
            new[] { new Seg("Codice: ", false), new Seg(a.Codice, true), new Seg("  Nome: ", false), new Seg(a.NomeCompleto, true) },
            new[] { new Seg("Nato/a il: ", false), new Seg(a.DataNascita, true), new Seg("  A: ", false), new Seg(a.CittaNascita, true) },
            new[] { new Seg("C.F.: ", false), new Seg(a.CodiceFiscale, true), new Seg("   Sesso: ", false), new Seg(a.Sesso, true) },
        };
        var seasonLine = new[] { new Seg("Stagione " + season, true) };

        float avail = WidthMm - 2 * MarginX;
        float pitch = (HeightMm - 2 * MarginY) / 4f;

        // dimensione fissa: il testo che eccede lo spazio disponibile viene troncato
        float size = pitch * 0.56f;
        float seasonSize = pitch;

        for (int i = 0; i < lines.Length; i++)
            DrawLine(g, lines[i], size, MarginX, MarginY + i * pitch, pitch, Brushes.Black, avail);

        float sw = Math.Min(Measure(g, seasonLine, seasonSize), avail);
        DrawLine(g, seasonLine, seasonSize, (WidthMm - sw) / 2f, MarginY + 3 * pitch, pitch, Brushes.Red, avail);
    }

    static Font MakeFont(bool bold, float emMm) =>
        new("Arial", emMm, bold ? FontStyle.Bold : FontStyle.Regular, GraphicsUnit.Millimeter);

    static StringFormat Fmt() =>
        new(StringFormat.GenericTypographic) { FormatFlags = StringFormatFlags.MeasureTrailingSpaces | StringFormatFlags.NoWrap };

    static float Measure(Graphics g, Seg[] segs, float size)
    {
        float w = 0;
        using var fmt = Fmt();
        foreach (var s in segs) { using var f = MakeFont(s.Bold, size); w += g.MeasureString(s.Text, f, PointF.Empty, fmt).Width; }
        return w;
    }

    static void DrawLine(Graphics g, Seg[] segs, float size, float x, float rowTop, float rowH, Brush brush, float maxWidth)
    {
        using var fmt = Fmt();
        float y = rowTop + (rowH - size * 1.15f) / 2f;
        float limit = x + maxWidth;
        foreach (var s in segs)
        {
            using var f = MakeFont(s.Bold, size);
            var text = s.Text;
            float w = g.MeasureString(text, f, PointF.Empty, fmt).Width;
            bool cut = x + w > limit;
            while (cut && text.Length > 0 && x + w > limit)
            {
                text = text[..^1];
                w = g.MeasureString(text, f, PointF.Empty, fmt).Width;
            }
            g.DrawString(text, f, brush, x, y, fmt);
            if (cut) return; // il resto della riga non entra
            x += w;
        }
    }
}
