"""
make_kb_json.py - turns the knowledge-base Excel into data/knowledge_base.json for the website.

Run from the website folder:   python tools/make_kb_json.py  [path/to/Crop_Disease_Knowledge_Base_FINAL.xlsx]
Needs: pip install openpyxl
Keeps only the columns the website uses (sheet "Recommendation_Data", one row per class).
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

HERE = Path(__file__).resolve().parent.parent            # the website folder
EXCEL = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent / "knowledge-base" / "Crop_Disease_Knowledge_Base_FINAL.xlsx"
OUT = HERE / "data" / "knowledge_base.json"


def text(v):
    """Cell value as clean text ('' for empty cells)."""
    return "" if v is None else str(v).strip()


def number(v):
    """Cell value as a number, or None if it is empty or not a number."""
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def source_links(cell):
    """
    All links of a Source cell as [{"label": ..., "url": ...}].
    - Web addresses written in the cell text ("https://a.gov.bd/x ; https://b.org/y") each become a link,
      labelled with the website name ("a.gov.bd").
    - A hyperlink hidden behind a label (the cell shows "BAMIS bulletin", the link opens a URL) is added too,
      with the cell text as its label. Excel allows only one hidden hyperlink per cell.
    """
    shown = text(cell.value)
    links = []
    for url in re.findall(r"https?://[^\s;,)]+", shown):
        links.append({"label": url.split("/")[2].removeprefix("www."), "url": url})
    hidden = cell.hyperlink.target if cell.hyperlink and cell.hyperlink.target else ""
    if hidden.startswith("http") and hidden not in [l["url"] for l in links]:
        links.insert(0, {"label": shown or hidden.split("/")[2], "url": hidden})
    return links


def split_pairs(cell):
    """'Brand A: x; Brand B: y' -> {'Brand A': 'x', 'Brand B': 'y'}"""
    return dict(p.split(": ", 1) for p in text(cell).split("; ") if ": " in p)


# Not read_only: read_only mode cannot see hyperlinks. data_only=True gives the values, not the formulas.
sheet = openpyxl.load_workbook(EXCEL, data_only=True)["Recommendation_Data"]
rows = list(sheet.iter_rows())
header, kb = [c.value for c in rows[0]], {}
for cells in rows[1:]:
    r = dict(zip(header, [c.value for c in cells]))
    source_cell = cells[header.index("Source URL")]
    if not r["Disease / Class"]:
        continue
    brands = [b.strip() for b in text(r["Medicine Brand"]).split(";") if b.strip()]
    reg, dose = split_pairs(r["DAE Registration Number"]), split_pairs(r["Recommended Dosage"])
    kb[r["Disease / Class"]] = {
        "crop": text(r["Crop"]),
        "type": text(r["Class Type"]),
        "symptoms": text(r["Symptoms"]),
        "bn": {"name": text(r["Disease Name (Bangla)"]), "symptoms": text(r["Symptoms (Bangla, short)"]),
               "advice": text(r["Advice (Bangla, short)"])},
        "management": text(r["Management / Medicine (Generic Name)"]),
        # only brands that have a DAE registration number are shown to farmers
        "products": [{"brand": b, "registration": reg[b], "dose": dose.get(b, "")} for b in brands if b in reg],
        "source": text(r["Source URL"]),               # the cell text, as written in the Excel
        "links": source_links(source_cell),             # the same sources as clickable links
        # weather rule (WR_*) columns, used by js/weather.js
        "rule": {k[3:]: (number(r[k]) if number(r[k]) is not None else text(r[k])) for k in header if k.startswith("WR_")},
        # spray rule columns, used by js/weather.js
        "spray": {"productClass": text(r["Spray_Product_Class"]), "rainFreeHours": text(r["Spray_Rainfree_Hours_Min"]),
                  "windMin": number(r["Spray_Wind_Min_kmh"]), "windMax": number(r["Spray_Wind_Max_kmh"])},
    }

OUT.write_text(json.dumps(kb, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"Wrote {len(kb)} classes to {OUT}")
