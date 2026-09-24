"""Energy estimate: typical monthly climate for Karachi -> hourly days (clear-sky shape scaled to the monthly GHI),
Erbs split, Hay-Davies transposition to 15 deg south, Faiman cell temperature, PVWatts DC/AC and losses."""
import numpy as np, pandas as pd, pvlib, json
LAT, LON, TZ = 24.86, 67.01, "Asia/Karachi"
GHI = [4.36, 5.20, 6.13, 6.79, 7.09, 6.62, 5.49, 5.20, 5.74, 5.48, 4.62, 4.07]           # kWh/m2/day, typical long-term
TAMB = [18.9, 21.3, 25.4, 28.9, 30.9, 31.6, 30.2, 29.2, 29.1, 28.4, 24.6, 20.3]         # deg C, 24 h mean
TDAY = [t + 4 for t in TAMB]                                                            # daytime mean is warmer
LINKE = [4.2, 4.5, 4.8, 5.2, 5.6, 5.8, 5.8, 5.6, 5.2, 4.8, 4.4, 4.2]
DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
GAMMA = -0.0034; ALBEDO = 0.28; BIF_GAIN = 0.05
LOSS = dict(soiling=5.0, mismatch=2.0, dc_wiring=1.5, ac_wiring=1.0, grid_outage_load_shedding=3.0, lid_first_year=1.5)
loc = pvlib.location.Location(LAT, LON, TZ, 10)
def month(m, tilt=15, az=180):
    t = pd.date_range(f"2025-{m + 1:02d}-15 00:30", periods=24, freq="1h", tz=TZ)
    sp = loc.get_solarposition(t); cs = loc.get_clearsky(t, model="ineichen", linke_turbidity=LINKE[m])
    k = GHI[m] * 1000 / cs["ghi"].sum(); ghi = cs["ghi"] * min(k, 1.0)
    dni_extra = pvlib.irradiance.get_extra_radiation(t)
    erbs = pvlib.irradiance.erbs(ghi, sp["apparent_zenith"], t)
    poa = pvlib.irradiance.get_total_irradiance(tilt, az, sp["apparent_zenith"], sp["azimuth"], erbs["dni"], ghi, erbs["dhi"], dni_extra=dni_extra, model="haydavies", albedo=ALBEDO)
    aoi = pvlib.irradiance.aoi(tilt, az, sp["apparent_zenith"], sp["azimuth"])
    iam = pvlib.iam.ashrae(aoi, b=0.05)
    eff = poa["poa_direct"] * iam + poa["poa_diffuse"] * 0.95
    tc = pvlib.temperature.faiman(poa["poa_global"], TDAY[m], wind_speed=2.0)
    pdc = pvlib.pvsystem.pvwatts_dc(eff, tc, 1.0, GAMMA)                     # kW per kWp
    return poa["poa_global"].sum() / 1000 * DAYS[m], ghi.sum() / 1000 * DAYS[m], pdc.sum() * DAYS[m], (tc * poa["poa_global"]).sum() / max(poa["poa_global"].sum(), 1)
rows = [month(m) for m in range(12)]
poa_y = sum(r[0] for r in rows); ghi_y = sum(r[1] for r in rows); dc_y = sum(r[2] for r in rows)
lf = np.prod([1 - v / 100 for v in LOSS.values()]); inv = 0.98
mono = dc_y * lf * inv; bif = mono * (1 + BIF_GAIN)
out = dict(ghi_year=round(ghi_y), poa_year_15deg=round(poa_y), dc_before_losses=round(dc_y), losses=LOSS, inverter_eff=inv, bifacial_gain=BIF_GAIN,
           specific_yield_monofacial=round(mono), specific_yield_bifacial=round(bif), pr=round(mono / poa_y, 3),
           monthly_kwh_per_kwp=[round(r[2] * lf * inv * (1 + BIF_GAIN), 1) for r in rows], monthly_ghi=[round(r[1], 1) for r in rows])
print(json.dumps(out, indent=1)); json.dump(out, open("yield.json", "w"), indent=1)
