using System.Text.Json;

namespace EtichetteSci;

class Settings
{
    public string Printer { get; set; } = "";
    public string Season { get; set; } = DefaultSeason();
    public string LastFile { get; set; } = "";

    static string FilePath => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "EtichetteSci", "settings.json");

    /// <summary>Da agosto in poi la stagione è anno/anno+1, altrimenti anno-1/anno.</summary>
    public static string DefaultSeason()
    {
        var n = DateTime.Today;
        int start = n.Month >= 8 ? n.Year : n.Year - 1;
        return $"{start}/{start + 1}";
    }

    public static Settings Load()
    {
        try { return JsonSerializer.Deserialize<Settings>(File.ReadAllText(FilePath)) ?? new(); }
        catch { return new(); }
    }

    public void Save()
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
            File.WriteAllText(FilePath, JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = true }));
        }
        catch { /* impostazioni non critiche */ }
    }
}
