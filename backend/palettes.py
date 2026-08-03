"""Preset color palettes organized by category. Each palette maps to a subset of
brand CSS variables. Frontend injects these at runtime on document root.
"""
from typing import List, Dict, Any


def _p(id: str, name: str, category: str, colors: Dict[str, str], mood: str = "") -> Dict[str, Any]:
    return {"id": id, "name": name, "category": category, "mood": mood, "colors": colors, "is_preset": True}


# Color keys correspond to CSS variables in /app/frontend/src/index.css
# We override the "brand-*" variables. Only include what changes; frontend keeps sensible defaults for the rest.
PALETTES: List[Dict[str, Any]] = [
    # ==================== DEFAULT ====================
    _p("signature", "Signature (default)", "signature",
       {
           "cream": "#FBF6EF", "surface-2": "#F6EFE6", "border": "#E7D9CC",
           "text": "#1F1E1C", "text-muted": "#5E5A55",
           "sage": "#8FAE97", "sage-deep": "#6F8F7A", "sage-tint": "#E6F0EA",
           "rose": "#C98F9B", "coral": "#D98A7A", "peach": "#E9B39A",
           "blush-tint": "#F7E3DD", "gold": "#C9A46A",
       },
       "The signature swell watercolor look"),

    # ==================== SPRING ====================
    _p("spring_blossom", "Spring Blossom", "spring",
       {"cream": "#FBF5F1", "surface-2": "#F7E7E4", "border": "#EDD6D2",
        "text": "#2B2321", "text-muted": "#6B5F5B",
        "sage": "#A9CBA0", "sage-deep": "#7EA37A", "sage-tint": "#E9F2E4",
        "rose": "#E29CB0", "coral": "#F0A28E", "peach": "#F4C0A8",
        "blush-tint": "#FBE1D9", "gold": "#D6A971"},
       "Soft cherry-blossom pinks + mint"),

    _p("spring_meadow", "Spring Meadow", "spring",
       {"cream": "#F5F7EE", "surface-2": "#E6EFD8", "border": "#D2DEBE",
        "text": "#2A2E1F", "text-muted": "#5D6552",
        "sage": "#9BB784", "sage-deep": "#6A8058", "sage-tint": "#E8F0DD",
        "rose": "#D9A08B", "coral": "#CD8B75", "peach": "#E4B594",
        "blush-tint": "#F1DDCC", "gold": "#B79656"},
       "Fresh sage greens with warm accents"),

    _p("easter_pastel", "Easter Pastels", "spring",
       {"cream": "#FBF7F4", "surface-2": "#F0E6F0", "border": "#E0D0E0",
        "text": "#2A2032", "text-muted": "#6B5C74",
        "sage": "#B5CFB5", "sage-deep": "#8AAF8A", "sage-tint": "#EAF3EA",
        "rose": "#E7BDD1", "coral": "#F0BDA5", "peach": "#F4DABF",
        "blush-tint": "#F8DEE6", "gold": "#D4B871"},
       "Pastel lavender, mint & buttercream"),

    # ==================== SUMMER ====================
    _p("summer_coastal", "Summer Coastal", "summer",
       {"cream": "#F6F8F7", "surface-2": "#E1EAEB", "border": "#C8D6D8",
        "text": "#1E2C30", "text-muted": "#546267",
        "sage": "#7BAEB1", "sage-deep": "#4E848A", "sage-tint": "#DEEDEE",
        "rose": "#D9887F", "coral": "#E29888", "peach": "#F0C0A4",
        "blush-tint": "#F0DDD7", "gold": "#C9A05A"},
       "Coastal breeze — dusty blues + terracotta"),

    _p("summer_citrus", "Summer Citrus", "summer",
       {"cream": "#FEFAEF", "surface-2": "#FBECC7", "border": "#EFD989",
        "text": "#2C2410", "text-muted": "#6C5F3E",
        "sage": "#B4C97C", "sage-deep": "#849A54", "sage-tint": "#EEF1DC",
        "rose": "#EEB48E", "coral": "#F09D6E", "peach": "#F5C692",
        "blush-tint": "#FBE4CE", "gold": "#D6A035"},
       "Golden citrus, olive & sunshine"),

    _p("summer_wildflower", "Summer Wildflower", "summer",
       {"cream": "#FDF7EE", "surface-2": "#F7E9D3", "border": "#EAD3B3",
        "text": "#2A2118", "text-muted": "#6C5A48",
        "sage": "#8CB08A", "sage-deep": "#5F8560", "sage-tint": "#E5EEE0",
        "rose": "#D18191", "coral": "#DE917F", "peach": "#F1C09A",
        "blush-tint": "#F5DDD3", "gold": "#C79E5C"},
       "Wildflower fields — warm sage & rose"),

    # ==================== FALL / AUTUMN ====================
    _p("autumn_harvest", "Autumn Harvest", "fall",
       {"cream": "#F9EFE1", "surface-2": "#F0DBBF", "border": "#DEC29A",
        "text": "#2B1F13", "text-muted": "#7B6141",
        "sage": "#8A9A6E", "sage-deep": "#606E4A", "sage-tint": "#E6E9D8",
        "rose": "#B26E5C", "coral": "#C67553", "peach": "#E5A576",
        "blush-tint": "#F0D2B6", "gold": "#B78241"},
       "Warm ambers, sage & cinnamon"),

    _p("autumn_burgundy", "Autumn Burgundy", "fall",
       {"cream": "#F7EEE6", "surface-2": "#EDD5CB", "border": "#D8B7AC",
        "text": "#2A1616", "text-muted": "#6D4D48",
        "sage": "#7A9578", "sage-deep": "#556B54", "sage-tint": "#DFE8DE",
        "rose": "#A34E52", "coral": "#B85D50", "peach": "#DA9483",
        "blush-tint": "#EEC7BC", "gold": "#A87A3B"},
       "Deep burgundy, dried rose & moss"),

    _p("halloween", "Halloween", "holiday",
       {"cream": "#F5EEE2", "surface-2": "#EBDCC0", "border": "#C9AF83",
        "text": "#1B1512", "text-muted": "#5C4C3F",
        "sage": "#7C6E51", "sage-deep": "#5A4E36", "sage-tint": "#EBE4D0",
        "rose": "#8B4A6E", "coral": "#C56A2D", "peach": "#E3A268",
        "blush-tint": "#EBCFB1", "gold": "#B67A2C"},
       "Vintage Halloween — plum & burnt orange"),

    _p("thanksgiving", "Thanksgiving", "holiday",
       {"cream": "#F8EEDE", "surface-2": "#EED9B4", "border": "#D3B77E",
        "text": "#2B1D0F", "text-muted": "#7A5F3B",
        "sage": "#8B9A72", "sage-deep": "#5F6E4B", "sage-tint": "#E7ECDA",
        "rose": "#B0654F", "coral": "#C57046", "peach": "#E7A66E",
        "blush-tint": "#F0D0AF", "gold": "#B0782C"},
       "Harvest table — bronze, moss & wheat"),

    # ==================== WINTER ====================
    _p("winter_frost", "Winter Frost", "winter",
       {"cream": "#F5F7FA", "surface-2": "#E2EAF2", "border": "#C6D3E1",
        "text": "#1B222B", "text-muted": "#525E6C",
        "sage": "#8FA6B0", "sage-deep": "#617884", "sage-tint": "#E1E9EE",
        "rose": "#B8909C", "coral": "#C6949B", "peach": "#DFBCB5",
        "blush-tint": "#EDD8D6", "gold": "#A6926A"},
       "Icy blues, silver & soft rose"),

    _p("winter_evergreen", "Winter Evergreen", "winter",
       {"cream": "#F3F1E9", "surface-2": "#E2E5D6", "border": "#C1C9B1",
        "text": "#141E17", "text-muted": "#4E594E",
        "sage": "#5B7A5F", "sage-deep": "#3E5842", "sage-tint": "#DDE6DD",
        "rose": "#A85E64", "coral": "#B76256", "peach": "#D48B75",
        "blush-tint": "#EBCEC5", "gold": "#B2874A"},
       "Deep evergreen, cranberry & cream"),

    _p("christmas", "Christmas", "holiday",
       {"cream": "#F5EDE4", "surface-2": "#EBD9CC", "border": "#D2B0A0",
        "text": "#1B1414", "text-muted": "#5A4A45",
        "sage": "#5D7C60", "sage-deep": "#3F5A42", "sage-tint": "#DEE9DE",
        "rose": "#A0424A", "coral": "#B04B45", "peach": "#DDA98F",
        "blush-tint": "#F0D2C6", "gold": "#B78A3E"},
       "Evergreen, cranberry & warm gold"),

    _p("new_year", "New Year — Champagne", "holiday",
       {"cream": "#F7F3EA", "surface-2": "#EBDFC4", "border": "#D2BC90",
        "text": "#1F1B12", "text-muted": "#6A5D42",
        "sage": "#9A9078", "sage-deep": "#6F664F", "sage-tint": "#EBE6D8",
        "rose": "#B48B76", "coral": "#C6997C", "peach": "#DDBC96",
        "blush-tint": "#F0E1CD", "gold": "#C89A45"},
       "Champagne, taupe & warm gold"),

    # ==================== HOLIDAYS ====================
    _p("valentines", "Valentine's Day", "holiday",
       {"cream": "#FCF3EF", "surface-2": "#F8E2DD", "border": "#EEC1BE",
        "text": "#2A1518", "text-muted": "#6E4849",
        "sage": "#B78B93", "sage-deep": "#8E5F68", "sage-tint": "#F0DDDE",
        "rose": "#D96A7C", "coral": "#E27484", "peach": "#F0AFAF",
        "blush-tint": "#FADADF", "gold": "#C78B60"},
       "Blush, deep rose & warm gold"),

    _p("mothers_day", "Mother's Day", "holiday",
       {"cream": "#FBF4EE", "surface-2": "#F5E4E1", "border": "#E6C6C4",
        "text": "#251B21", "text-muted": "#6B5761",
        "sage": "#A6BFA7", "sage-deep": "#7C9C7E", "sage-tint": "#E9F1E6",
        "rose": "#DA9CAD", "coral": "#E4A38E", "peach": "#F2C1A6",
        "blush-tint": "#F9DFD7", "gold": "#CFA26C"},
       "Soft pink, sage & cream"),

    _p("independence_day", "Independence Day", "holiday",
       {"cream": "#F7F4EF", "surface-2": "#E4E3EA", "border": "#C4C6D3",
        "text": "#161F2E", "text-muted": "#4D5364",
        "sage": "#7590AE", "sage-deep": "#4B658A", "sage-tint": "#DEE6EF",
        "rose": "#B85560", "coral": "#C05B4A", "peach": "#D69381",
        "blush-tint": "#EFCEC9", "gold": "#A88448"},
       "Dusty navy, faded red & cream"),

    # ==================== WEDDING SEASON ====================
    _p("wedding_blush", "Wedding — Blush", "wedding",
       {"cream": "#FBF3EE", "surface-2": "#F5E1DA", "border": "#EAC5BB",
        "text": "#241B18", "text-muted": "#6C574F",
        "sage": "#A6BFAB", "sage-deep": "#7B9B82", "sage-tint": "#E9F0EA",
        "rose": "#D89A9F", "coral": "#DFA290", "peach": "#F1C0A7",
        "blush-tint": "#F9DED4", "gold": "#C99F62"},
       "The classic wedding day palette"),

    _p("wedding_ivory", "Wedding — Ivory & Sage", "wedding",
       {"cream": "#F8F3EA", "surface-2": "#EFE6D0", "border": "#DACDA9",
        "text": "#221E14", "text-muted": "#635B48",
        "sage": "#93AC91", "sage-deep": "#6A876B", "sage-tint": "#E5EDDF",
        "rose": "#CFA091", "coral": "#D6A182", "peach": "#EABF9C",
        "blush-tint": "#F3DDCB", "gold": "#BC9855"},
       "Warm ivory, sage & taupe"),

    _p("wedding_garden", "Wedding — Garden", "wedding",
       {"cream": "#F7F4EA", "surface-2": "#E7E9CE", "border": "#CBD5A2",
        "text": "#1F2612", "text-muted": "#565F3A",
        "sage": "#8FAF7B", "sage-deep": "#617F52", "sage-tint": "#E4EEDA",
        "rose": "#D18B94", "coral": "#DC9584", "peach": "#EEB999",
        "blush-tint": "#F5DAD4", "gold": "#B49355"},
       "Fresh garden — sage, coral & citrus"),

    _p("wedding_moody", "Wedding — Moody Rose", "wedding",
       {"cream": "#F1E9E5", "surface-2": "#DBC7C1", "border": "#B99B95",
        "text": "#1E1215", "text-muted": "#5A3E43",
        "sage": "#7E8A83", "sage-deep": "#546059", "sage-tint": "#DFE3DF",
        "rose": "#8D4653", "coral": "#A05053", "peach": "#C8867E",
        "blush-tint": "#E6C4BE", "gold": "#9B7846"},
       "Moody rose, dusty sage & dried petal"),
]


CATEGORIES: List[Dict[str, str]] = [
    {"key": "signature", "label": "Signature"},
    {"key": "spring", "label": "Spring"},
    {"key": "summer", "label": "Summer"},
    {"key": "fall", "label": "Fall"},
    {"key": "winter", "label": "Winter"},
    {"key": "wedding", "label": "Wedding season"},
    {"key": "holiday", "label": "Holidays"},
]


def get_palette(pid: str) -> Dict[str, Any]:
    for p in PALETTES:
        if p["id"] == pid:
            return p
    return PALETTES[0]  # signature default
