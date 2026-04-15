import { useEffect, useMemo, useRef, useState } from "react";

const PSGC_BASE = "https://psgc.cloud/api";

const FALLBACK = {
  regions: [
    { code: "130000000", name: "National Capital Region (NCR)" },
    { code: "040000000", name: "Region IV-A (CALABARZON)" },
    { code: "030000000", name: "Region III (Central Luzon)" },
  ],
  municipalitiesByRegion: {
    "130000000": [
      { code: "137404000", name: "City of Manila", zip_code: "1000" },
      { code: "137401000", name: "Quezon City", zip_code: "1100" },
      { code: "137405000", name: "City of Marikina", zip_code: "1800" },
    ],
    "040000000": [
      { code: "043404000", name: "City of Calamba", zip_code: "4027" },
      { code: "045624000", name: "City of Lipa", zip_code: "4217" },
      { code: "042114000", name: "Bacoor City", zip_code: "4102" },
    ],
    "030000000": [
      { code: "035416000", name: "City of San Fernando", zip_code: "2000" },
      { code: "036922000", name: "City of Malolos", zip_code: "3000" },
      { code: "034928000", name: "Mabalacat City", zip_code: "2010" },
    ],
  },
  barangaysByMunicipality: {
    "137404000": [
      { code: "137404001", name: "Barangay 1" },
      { code: "137404010", name: "Barangay 10" },
      { code: "137404699", name: "Barangay 699" },
    ],
    "137401000": [
      { code: "137401001", name: "Alicia" },
      { code: "137401002", name: "Bagumbayan" },
      { code: "137401003", name: "Batasan Hills" },
    ],
  },
};

const cache = {
  regions: null,
  municipalitiesByRegion: new Map(),
  barangaysByMunicipality: new Map(),
};

const firstArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const toCode = (item) => String(item?.code || item?.psgc_code || item?.id || "");
const toName = (item) => String(item?.name || item?.city_municipality_name || "").trim();
const toZip = (item) => String(item?.zip_code || item?.zipCode || item?.postal_code || item?.postalCode || "").trim();

const safeFetchJson = async (url, timeoutMs = 3500) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
};

const normalizeRegionList = (raw) =>
  firstArray(raw)
    .map((item) => ({ code: toCode(item), name: toName(item) }))
    .filter((item) => item.code && item.name)
    .sort((a, b) => a.name.localeCompare(b.name));

const normalizeMunicipalityList = (raw) =>
  firstArray(raw)
    .map((item) => ({ code: toCode(item), name: toName(item), zip_code: toZip(item) }))
    .filter((item) => item.code && item.name)
    .sort((a, b) => a.name.localeCompare(b.name));

const normalizeBarangayList = (raw) =>
  firstArray(raw)
    .map((item) => ({ code: toCode(item), name: toName(item) }))
    .filter((item) => item.code && item.name)
    .sort((a, b) => a.name.localeCompare(b.name));

const composeAddress = ({ street, barangay, municipality, region, postalCode }) => {
  const streetValue = String(street || "").trim();
  const barangayValue = String(barangay || "").trim();
  const municipalityValue = String(municipality || "").trim();
  const regionValue = String(region || "").trim();
  const postalValue = String(postalCode || "").trim();
  const left = [streetValue, barangayValue, municipalityValue, regionValue, "Philippines"].filter(Boolean).join(", ");
  if (!left && !postalValue) return "";
  if (!postalValue) return left;
  return `${left} ${postalValue}`;
};

async function fetchRegions() {
  if (cache.regions) return cache.regions;
  try {
    const [v1, v2] = await Promise.allSettled([
      safeFetchJson(`${PSGC_BASE}/regions`),
      safeFetchJson(`${PSGC_BASE}/v2/regions`),
    ]);
    const merged = [
      ...normalizeRegionList(v1.status === "fulfilled" ? v1.value : []),
      ...normalizeRegionList(v2.status === "fulfilled" ? v2.value : []),
    ];
    const unique = Array.from(new Map(merged.map((item) => [item.code, item])).values());
    cache.regions = unique.length ? unique : FALLBACK.regions;
    return cache.regions;
  } catch {
    cache.regions = FALLBACK.regions;
    return cache.regions;
  }
}

async function fetchMunicipalitiesByRegion(regionCode) {
  if (!regionCode) return [];
  if (cache.municipalitiesByRegion.has(regionCode)) return cache.municipalitiesByRegion.get(regionCode);
  if (cache.regions === FALLBACK.regions) {
    const fallback = FALLBACK.municipalitiesByRegion[regionCode] || [];
    cache.municipalitiesByRegion.set(regionCode, fallback);
    return fallback;
  }
  try {
    const [v1, v2] = await Promise.allSettled([
      safeFetchJson(`${PSGC_BASE}/regions/${encodeURIComponent(regionCode)}/cities-municipalities`),
      safeFetchJson(`${PSGC_BASE}/v2/regions/${encodeURIComponent(regionCode)}/cities-municipalities`),
    ]);
    const merged = [
      ...normalizeMunicipalityList(v1.status === "fulfilled" ? v1.value : []),
      ...normalizeMunicipalityList(v2.status === "fulfilled" ? v2.value : []),
    ];
    const unique = Array.from(new Map(merged.map((item) => [item.code, item])).values());
    const result = unique.length ? unique : (FALLBACK.municipalitiesByRegion[regionCode] || []);
    cache.municipalitiesByRegion.set(regionCode, result);
    return result;
  } catch {
    const fallback = FALLBACK.municipalitiesByRegion[regionCode] || [];
    cache.municipalitiesByRegion.set(regionCode, fallback);
    return fallback;
  }
}

async function fetchMunicipalityDetail(code) {
  if (!code) return null;
  try {
    const detail = await safeFetchJson(`${PSGC_BASE}/cities-municipalities/${encodeURIComponent(code)}`);
    const list = normalizeMunicipalityList(detail);
    return list[0] || { code, name: "", zip_code: toZip(detail) };
  } catch {
    try {
      const detail = await safeFetchJson(`${PSGC_BASE}/v2/cities-municipalities/${encodeURIComponent(code)}`);
      const list = normalizeMunicipalityList(detail);
      return list[0] || { code, name: "", zip_code: toZip(detail) };
    } catch {
      return null;
    }
  }
}

async function fetchBarangaysByMunicipality(municipalityCode) {
  if (!municipalityCode) return [];
  if (cache.barangaysByMunicipality.has(municipalityCode)) return cache.barangaysByMunicipality.get(municipalityCode);
  if (cache.regions === FALLBACK.regions) {
    const fallback = FALLBACK.barangaysByMunicipality[municipalityCode] || [];
    cache.barangaysByMunicipality.set(municipalityCode, fallback);
    return fallback;
  }
  try {
    const [v1, v2] = await Promise.allSettled([
      safeFetchJson(`${PSGC_BASE}/cities-municipalities/${encodeURIComponent(municipalityCode)}/barangays`),
      safeFetchJson(`${PSGC_BASE}/v2/cities-municipalities/${encodeURIComponent(municipalityCode)}/barangays`),
    ]);
    const merged = [
      ...normalizeBarangayList(v1.status === "fulfilled" ? v1.value : []),
      ...normalizeBarangayList(v2.status === "fulfilled" ? v2.value : []),
    ];
    const unique = Array.from(new Map(merged.map((item) => [item.code, item])).values());
    const result = unique.length ? unique : (FALLBACK.barangaysByMunicipality[municipalityCode] || []);
    cache.barangaysByMunicipality.set(municipalityCode, result);
    return result;
  } catch {
    const fallback = FALLBACK.barangaysByMunicipality[municipalityCode] || [];
    cache.barangaysByMunicipality.set(municipalityCode, fallback);
    return fallback;
  }
}

export default function PhilippineAddressField({
  value = "",
  onChange,
  initialData = null,
  onDataChange,
  label = "Address",
  required = false,
  streetLabel = "Building No. / Street",
  streetPlaceholder = "House/Building No., Street",
  hint = "",
}) {
  const hydratedRef = useRef(false);
  const [regionCode, setRegionCode] = useState("");
  const [municipalityCode, setMunicipalityCode] = useState("");
  const [barangayCode, setBarangayCode] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [regions, setRegions] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    if (value && !regionCode && !municipalityCode && !barangayCode && !street) {
      setStreet(value);
    }
  }, [value, regionCode, municipalityCode, barangayCode, street]);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    if (!initialData || typeof initialData !== "object") return;
    setRegionCode(String(initialData.region_code || ""));
    setMunicipalityCode(String(initialData.municipality_code || ""));
    setBarangayCode(String(initialData.barangay_code || ""));
    setStreet(String(initialData.street_line || initialData.street || ""));
    setPostalCode(String(initialData.postal_code || ""));
  }, [initialData]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingRegions(true);
      const items = await fetchRegions();
      if (!mounted) return;
      setRegions(items);
      setFallbackMode(items === FALLBACK.regions);
      setLoadingRegions(false);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!regionCode) {
      setMunicipalities([]);
      setMunicipalityCode("");
      setBarangays([]);
      setBarangayCode("");
      setPostalCode("");
      return () => { mounted = false; };
    }
    (async () => {
      setLoadingMunicipalities(true);
      const items = await fetchMunicipalitiesByRegion(regionCode);
      if (!mounted) return;
      setMunicipalities(items);
      setLoadingMunicipalities(false);
    })();
    return () => { mounted = false; };
  }, [regionCode]);

  useEffect(() => {
    let mounted = true;
    if (!municipalityCode) {
      setBarangays([]);
      setBarangayCode("");
      setPostalCode("");
      return () => { mounted = false; };
    }
    (async () => {
      setLoadingBarangays(true);
      const items = await fetchBarangaysByMunicipality(municipalityCode);
      if (!mounted) return;
      setBarangays(items);
      setLoadingBarangays(false);
    })();
    return () => { mounted = false; };
  }, [municipalityCode]);

  useEffect(() => {
    const selectedMunicipality = municipalities.find((m) => m.code === municipalityCode);
    const zip = String(selectedMunicipality?.zip_code || "").trim();
    if (zip) {
      setPostalCode(zip);
      return;
    }
    if (!municipalityCode) {
      setPostalCode("");
      return;
    }
    let mounted = true;
    (async () => {
      const detail = await fetchMunicipalityDetail(municipalityCode);
      if (!mounted) return;
      setPostalCode(String(detail?.zip_code || ""));
    })();
    return () => { mounted = false; };
  }, [municipalityCode, municipalities]);

  const selectedRegion = useMemo(() => regions.find((r) => r.code === regionCode), [regions, regionCode]);
  const selectedMunicipality = useMemo(
    () => municipalities.find((m) => m.code === municipalityCode),
    [municipalities, municipalityCode],
  );
  const selectedBarangay = useMemo(() => barangays.find((b) => b.code === barangayCode), [barangays, barangayCode]);

  useEffect(() => {
    if (!onChange) return;
    const composed = composeAddress({
      street,
      barangay: selectedBarangay?.name || "",
      municipality: selectedMunicipality?.name || "",
      region: selectedRegion?.name || "",
      postalCode,
    });
    onChange(composed);
  }, [street, selectedBarangay, selectedMunicipality, selectedRegion, postalCode, onChange]);

  useEffect(() => {
    if (!onDataChange) return;
    onDataChange({
      region_code: regionCode,
      region_name: selectedRegion?.name || "",
      municipality_code: municipalityCode,
      municipality_name: selectedMunicipality?.name || "",
      barangay_code: barangayCode,
      barangay_name: selectedBarangay?.name || "",
      postal_code: postalCode,
      street_line: street,
      full_address: composeAddress({
        street,
        barangay: selectedBarangay?.name || "",
        municipality: selectedMunicipality?.name || "",
        region: selectedRegion?.name || "",
        postalCode,
      }),
    });
  }, [
    onDataChange,
    regionCode,
    municipalityCode,
    barangayCode,
    selectedRegion,
    selectedMunicipality,
    selectedBarangay,
    postalCode,
    street,
  ]);

  return (
    <div className="input-group">
      <label>{label}{required ? " *" : ""}</label>
      <div style={styles.grid}>
        <div className="input-group">
          <label style={styles.subLabel}>Region</label>
          <select className="input-field" value={regionCode} onChange={(e) => setRegionCode(e.target.value)} required={required}>
            <option value="">{loadingRegions ? "Loading regions..." : "Select region"}</option>
            {regions.map((item) => (
              <option key={item.code} value={item.code}>{item.name}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label style={styles.subLabel}>Municipality / City</label>
          <select
            className="input-field"
            value={municipalityCode}
            onChange={(e) => setMunicipalityCode(e.target.value)}
            disabled={!regionCode || loadingMunicipalities}
            required={required}
          >
            <option value="">
              {!regionCode ? "Select region first" : loadingMunicipalities ? "Loading municipalities..." : "Select municipality/city"}
            </option>
            {municipalities.map((item) => (
              <option key={item.code} value={item.code}>{item.name}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label style={styles.subLabel}>Barangay</label>
          <select
            className="input-field"
            value={barangayCode}
            onChange={(e) => setBarangayCode(e.target.value)}
            disabled={!municipalityCode || loadingBarangays}
            required={required}
          >
            <option value="">
              {!municipalityCode ? "Select municipality/city first" : loadingBarangays ? "Loading barangays..." : "Select barangay"}
            </option>
            {barangays.map((item) => (
              <option key={item.code} value={item.code}>{item.name}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label style={styles.subLabel}>Postal Code</label>
          <input className="input-field" value={postalCode} readOnly placeholder="Auto-generated" />
        </div>

        <div className="input-group" style={{ gridColumn: "1 / -1" }}>
          <label style={styles.subLabel}>{streetLabel}</label>
          <input
            className="input-field"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder={streetPlaceholder}
            required={required}
          />
        </div>
      </div>
      {hint && <small style={styles.hint}>{hint}</small>}
      {fallbackMode && (
        <small style={styles.warn}>
          Live PSGC source unavailable right now. Fallback location data is loaded.
        </small>
      )}
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
  },
  subLabel: {
    fontSize: 12,
    color: "var(--gray-600)",
    marginBottom: 4,
  },
  hint: {
    marginTop: 4,
    color: "var(--gray-500)",
    display: "block",
  },
  warn: {
    marginTop: 4,
    color: "var(--yellow)",
    display: "block",
  },
};
