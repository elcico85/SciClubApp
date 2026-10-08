using System.IO.Compression;
using System.Xml.Linq;

namespace EtichetteSci;

/// <summary>Lettore minimale di .xlsx (prima scheda): restituisce le righe come dizionari intestazione -> valore.</summary>
static class XlsxReader
{
    static readonly XNamespace Ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    static readonly XNamespace RelNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    static readonly XNamespace PkgRel = "http://schemas.openxmlformats.org/package/2006/relationships";

    public static List<Dictionary<string, string>> Read(string path)
    {
        using var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
        using var zip = new ZipArchive(fs, ZipArchiveMode.Read);

        var shared = new List<string>();
        var ssEntry = zip.GetEntry("xl/sharedStrings.xml");
        if (ssEntry != null)
        {
            var ss = Load(ssEntry);
            foreach (var si in ss.Root!.Elements(Ns + "si"))
                shared.Add(string.Concat(si.Descendants(Ns + "t").Where(t => t.Parent?.Name != Ns + "rPh").Select(t => t.Value)));
        }

        var sheetEntry = zip.GetEntry(FirstSheetPath(zip)) ?? throw new InvalidDataException("Foglio di lavoro non trovato.");
        var sheet = Load(sheetEntry);

        var grid = new List<Dictionary<int, string>>();
        foreach (var row in sheet.Descendants(Ns + "row"))
        {
            var cells = new Dictionary<int, string>();
            foreach (var c in row.Elements(Ns + "c"))
            {
                var r = (string?)c.Attribute("r");
                if (r == null) continue;
                var type = (string?)c.Attribute("t");
                string val = type switch
                {
                    "s" when int.TryParse((string?)c.Element(Ns + "v"), out var i) && i < shared.Count => shared[i],
                    "inlineStr" => string.Concat(c.Descendants(Ns + "t").Select(t => t.Value)),
                    _ => (string?)c.Element(Ns + "v") ?? ""
                };
                cells[ColIndex(r)] = val;
            }
            grid.Add(cells);
        }
        if (grid.Count == 0) return new();

        var headers = grid[0];
        var result = new List<Dictionary<string, string>>();
        foreach (var cells in grid.Skip(1))
        {
            var d = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var (idx, name) in headers)
            {
                var key = name.Trim();
                if (key.Length == 0 || d.ContainsKey(key)) continue; // colonne duplicate: vale la prima
                d[key] = cells.TryGetValue(idx, out var v) ? v.Trim() : "";
            }
            result.Add(d);
        }
        return result;
    }

    static string FirstSheetPath(ZipArchive zip)
    {
        var wb = Load(zip.GetEntry("xl/workbook.xml") ?? throw new InvalidDataException("File xlsx non valido."));
        var rid = (string?)wb.Descendants(Ns + "sheet").First().Attribute(RelNs + "id");
        var rels = Load(zip.GetEntry("xl/_rels/workbook.xml.rels")!);
        var target = rels.Descendants(PkgRel + "Relationship").First(r => (string?)r.Attribute("Id") == rid).Attribute("Target")!.Value;
        return target.StartsWith('/') ? target.TrimStart('/') : "xl/" + target;
    }

    static XDocument Load(ZipArchiveEntry e) { using var s = e.Open(); return XDocument.Load(s); }

    static int ColIndex(string cellRef)
    {
        int n = 0;
        foreach (var ch in cellRef) { if (!char.IsLetter(ch)) break; n = n * 26 + (char.ToUpperInvariant(ch) - 'A' + 1); }
        return n;
    }
}
