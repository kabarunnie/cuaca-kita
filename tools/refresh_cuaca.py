#!/usr/bin/env python3
"""Cache BMKG open forecasts for a fixed list of verified adm4 codes.
Never invent weather. On failure, keep the previous archive.
"""
from __future__ import annotations

import json, ssl, time, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app/data/forecast.json"
CITIES = Path(__file__).resolve().parents[2] / "_kit/bmkg-cities.json"
# When running inside the repo, cities list is bundled:
LOCAL_CITIES = ROOT / "tools/bmkg-cities.json"
WIB = timezone(timedelta(hours=7))
CTX = ssl.create_default_context()
UA = {"User-Agent": "CuacaKita/1.0 (https://kabarunnie.github.io/cuaca-kita/)"}


def get(url: str) -> dict:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, context=CTX, timeout=25) as r:
        return json.loads(r.read().decode("utf-8"))


def slim_hour(h: dict) -> dict:
    return {
        "local_datetime": h.get("local_datetime") or h.get("utc_datetime"),
        "t": h.get("t"),
        "hu": h.get("hu"),
        "weather_desc": h.get("weather_desc"),
        "ws": h.get("ws"),
        "wd": h.get("wd"),
    }


def load_prev():
    if OUT.exists():
        try:
            return json.loads(OUT.read_text(encoding="utf-8"))
        except Exception:
            return {"cities": []}
    return {"cities": []}


def city_list():
    for p in (LOCAL_CITIES, CITIES):
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))
    return []


def main():
    prev = load_prev()
    prev_by = {c.get("adm4"): c for c in prev.get("cities", [])}
    codes = city_list()
    now = datetime.now(WIB).isoformat(timespec="seconds")
    out_cities = []
    errors = []
    for meta in codes:
        code = meta["adm4"]
        url = f"https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={code}"
        try:
            raw = get(url)
            loc = {}
            forecast = []
            block = (raw.get("data") or [None])[0] or {}
            loc = block.get("lokasi") or raw.get("lokasi") or {}
            cuaca = block.get("cuaca") or []
            hours = []
            if cuaca and isinstance(cuaca[0], list):
                for day in cuaca:
                    hours.extend(day)
            elif cuaca and isinstance(cuaca[0], dict):
                hours = cuaca
            forecast = [slim_hour(h) for h in hours]
            rec = {
                "adm4": code,
                "desa": loc.get("desa") or meta.get("desa"),
                "kecamatan": loc.get("kecamatan") or meta.get("kecamatan"),
                "kotkab": loc.get("kotkab") or meta.get("kotkab"),
                "provinsi": loc.get("provinsi") or meta.get("provinsi"),
                "lat": loc.get("lat") or meta.get("lat"),
                "lon": loc.get("lon") or meta.get("lon"),
                "timezone": loc.get("timezone") or meta.get("timezone"),
                "label": (loc.get("kotkab") or meta.get("kotkab") or "") + " / " + (loc.get("desa") or meta.get("desa") or code),
                "forecast": forecast,
            }
            out_cities.append(rec)
        except Exception as e:
            errors.append(f"{code}: {type(e).__name__}: {e}")
            if code in prev_by:
                out_cities.append(prev_by[code])
        time.sleep(0.3)
    payload = {
        "fetchedAt": now,
        "timezone": "Asia/Jakarta",
        "status": "ok" if not errors else ("partial" if out_cities else "unavailable"),
        "source": "BMKG — Data Prakiraan Cuaca Terbuka",
        "sourceUrl": "https://data.bmkg.go.id/prakiraan-cuaca/",
        "attribution": "Sumber: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)",
        "notes": [
            "Setiap kota memakai satu kelurahan sebagai titik prakiraan, bukan rata-rata kota.",
            "Jika pengambilan gagal, arsip terakhir tetap ditampilkan beserta waktunya. Tidak ada cuaca yang dikira-kira.",
        ],
        "fetchErrors": errors,
        "cities": out_cities,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT, "cities", len(out_cities), "errors", len(errors))


if __name__ == "__main__":
    main()
