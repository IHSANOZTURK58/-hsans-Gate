$path = 'c:\Users\pc\OneDrive\Desktop\PROJELERİM\İhsansGAte\İhsans Gate\js\words.js'
$content = Get-Content $path
$count = $content.Length
# Remove the last line ];
$content[0..($count - 2)] | Set-Content $path -NoNewline
# Add a comma to the last record if it doesn't have one
Add-Content $path ',' -NoNewline
# Add new records
$newWords = @(
    '    { "id": 11987, "word": "Recursion", "meaning": "Özyineleme", "level": "C1" },',
    '    { "id": 11988, "word": "Syntactic", "meaning": "Sözdizimsel", "level": "C1" },',
    '    { "id": 11989, "word": "Neurolinguistics", "meaning": "Nörolinguistik", "level": "C1" },',
    '    { "id": 11990, "word": "Hominid", "meaning": "İnsansı", "level": "C1" },',
    '    { "id": 11991, "word": "Phoneme", "meaning": "Ses birimi", "level": "C1" },',
    '    { "id": 11992, "word": "Morpheme", "meaning": "Biçimbirim", "level": "C1" },',
    '    { "id": 11993, "word": "Semantics", "meaning": "Anlambilim", "level": "C1" },',
    '    { "id": 11994, "word": "Pragmatics", "meaning": "Edimbilim", "level": "C1" },',
    '    { "id": 11995, "word": "Cognitive", "meaning": "Bilişsel", "level": "C1" },',
    '    { "id": 11996, "word": "Meta-linguistic", "meaning": "Üstdilsel", "level": "C1" },',
    '    { "id": 11997, "word": "Ethno-linguistics", "meaning": "Etnolinguistik", "level": "C1" },',
    '    { "id": 11998, "word": "Socio-linguistics", "meaning": "Sosyolinguistik", "level": "C1" },',
    '    { "id": 11999, "word": "Prototypes", "meaning": "Prototipler", "level": "C1" },',
    '    { "id": 12000, "word": "Globalization", "meaning": "Küreselleşme", "level": "C1" },',
    '    { "id": 12001, "word": "Revitalization", "meaning": "Yeniden canlandırma", "level": "C1" },',
    '    { "id": 12002, "word": "Extinction", "meaning": "Yok olma", "level": "C1" },',
    '    { "id": 12003, "word": "Epigenetics", "meaning": "Epigenetik", "level": "C1" },',
    '    { "id": 12004, "word": "Scaffolding", "meaning": "İskele kurma", "level": "C1" },',
    '    { "id": 12005, "word": "Intonation", "meaning": "Tonlama", "level": "C1" },',
    '    { "id": 12006, "word": "Prosody", "meaning": "Bürün/Prosodi", "level": "C1" },',
    '    { "id": 12007, "word": "Forensic", "meaning": "Adli", "level": "C1" },',
    '    { "id": 12008, "word": "Stylometry", "meaning": "Biçembilim", "level": "C1" },',
    '    { "id": 12009, "word": "Idiolect", "meaning": "İdiolekt", "level": "C1" },',
    '    { "id": 12010, "word": "Decolonization", "meaning": "Sömürgesizleştirme", "level": "C1" },',
    '    { "id": 12011, "word": "Imperialism", "meaning": "Emperyalizm", "level": "C1" },',
    '    { "id": 12012, "word": "Ambiguity", "meaning": "Belirsizlik", "level": "C1" },',
    '    { "id": 12013, "word": "Perception", "meaning": "Algı", "level": "C1" },',
    '    { "id": 12014, "word": "Hierarchical", "meaning": "Hiyerarşik", "level": "C1" },',
    '    { "id": 12015, "word": "Anthropological", "meaning": "Antropolojik", "level": "C1" },',
    '    { "id": 12016, "word": "Kinship", "meaning": "Akrabalık", "level": "C1" },',
    '    { "id": 12017, "word": "Indigenous", "meaning": "Yerli", "level": "C1" },',
    '    { "id": 12018, "word": "Dialect", "meaning": "Lehçe", "level": "C1" },',
    '    { "id": 12019, "word": "Prestige", "meaning": "Prestij", "level": "C1" },',
    '    { "id": 12020, "word": "Agglutinative", "meaning": "Bitişken", "level": "C1" },',
    '    { "id": 12021, "word": "Polysynthetic", "meaning": "Çok sentezli", "level": "C1" },',
    '    { "id": 12022, "word": "Typology", "meaning": "Tipoloji", "level": "C1" },',
    '    { "id": 12023, "word": "Corpus", "meaning": "Derlem", "level": "C1" },',
    '    { "id": 12024, "word": "Sentiment", "meaning": "Duygu/Görüş", "level": "C1" },',
    '    { "id": 12025, "word": "Tokenization", "meaning": "Simgeleştirme", "level": "C1" },',
    '    { "id": 12026, "word": "Paradox", "meaning": "Paradoks", "level": "C1" },',
    '    { "id": 12027, "word": "Inference", "meaning": "Çıkarım", "level": "C1" },',
    '    { "id": 12028, "word": "Implicature", "meaning": "Sezdirim", "level": "C1" },',
    '    { "id": 12029, "word": "Cooperative", "meaning": "İşbirlikçi", "level": "C1" },',
    '    { "id": 12030, "word": "Maxim", "meaning": "İlke", "level": "C1" },',
    '    { "id": 12031, "word": "Irony", "meaning": "İroni", "level": "C1" },',
    '    { "id": 12032, "word": "Sarcasm", "meaning": "İğneleme", "level": "C1" },',
    '    { "id": 12033, "word": "Etymology", "meaning": "Kökenbilim", "level": "C1" },',
    '    { "id": 12034, "word": "Cognate", "meaning": "Soydaş", "level": "C1" },',
    '    { "id": 12035, "word": "Lexicon", "meaning": "Sözlükçe", "level": "C1" },',
    '    { "id": 12036, "word": "Denotation", "meaning": "Düzanlam", "level": "C1" }'
)
foreach ($line in $newWords) {
    Add-Content $path "`n$line"
}
Add-Content $path "`n];"
