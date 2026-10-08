using System.Globalization;

namespace EtichetteSci;

record Athlete(string Codice, string NomeCompleto, string DataNascita, string CittaNascita, string CodiceFiscale, string Sesso)
{
    public static readonly string[] RequiredColumns =
        { "Cognome", "Nome", "Data di nascita", "Città nascita", "Codice fiscale", "Sesso", "Numero tesseramento" };

    public static Athlete? FromRow(Dictionary<string, string> r)
    {
        string G(string k) => r.TryGetValue(k, out var v) ? v : "";
        var cognome = G("Cognome"); var nome = G("Nome");
        if (cognome.Length == 0 && nome.Length == 0) return null;
        return new Athlete(
            G("Numero tesseramento") is { Length: > 0 } num ? num : "0",
            CamelCase((cognome + " " + nome).Trim()),
            NormalizeDate(G("Data di nascita")),
            CamelCase(G("Città nascita")),
            G("Codice fiscale").ToUpperInvariant(),
            G("Sesso").ToUpperInvariant());
    }

    /// <summary>"DE LUCA maria" -> "De Luca Maria" (anche dopo apostrofo e trattino).</summary>
    public static string CamelCase(string s)
    {
        var chars = s.ToLower(CultureInfo.CurrentCulture).ToCharArray();
        bool up = true;
        for (int i = 0; i < chars.Length; i++)
        {
            if (up && char.IsLetter(chars[i])) { chars[i] = char.ToUpper(chars[i], CultureInfo.CurrentCulture); up = false; }
            else up = chars[i] is ' ' or '\'' or '’' or '-';
        }
        return new string(chars);
    }

    static string NormalizeDate(string s) =>
        double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var serial) && serial > 1000
            ? DateTime.FromOADate(serial).ToString("dd/MM/yyyy") : s;
}
