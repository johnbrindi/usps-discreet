/**
 * Country input for the admin forms. Staff may type a full name ("United Arab Emirates"), a 3-letter
 * code ("ARE") or a 2-letter code ("AE"); everything is stored as the ISO 3166-1 alpha-2 code, which
 * the route map and time-zone lookup rely on.
 */

/** ISO 3166-1 alpha-3 → alpha-2. */
const ALPHA3 = Object.fromEntries(
  (
    "AFG AF ALA AX ALB AL DZA DZ ASM AS AND AD AGO AO AIA AI ATA AQ ATG AG ARG AR ARM AM ABW AW AUS AU AUT AT " +
    "AZE AZ BHS BS BHR BH BGD BD BRB BB BLR BY BEL BE BLZ BZ BEN BJ BMU BM BTN BT BOL BO BES BQ BIH BA BWA BW " +
    "BVT BV BRA BR IOT IO BRN BN BGR BG BFA BF BDI BI CPV CV KHM KH CMR CM CAN CA CYM KY CAF CF TCD TD CHL CL " +
    "CHN CN CXR CX CCK CC COL CO COM KM COG CG COD CD COK CK CRI CR CIV CI HRV HR CUB CU CUW CW CYP CY CZE CZ " +
    "DNK DK DJI DJ DMA DM DOM DO ECU EC EGY EG SLV SV GNQ GQ ERI ER EST EE SWZ SZ ETH ET FLK FK FRO FO FJI FJ " +
    "FIN FI FRA FR GUF GF PYF PF ATF TF GAB GA GMB GM GEO GE DEU DE GHA GH GIB GI GRC GR GRL GL GRD GD GLP GP " +
    "GUM GU GTM GT GGY GG GIN GN GNB GW GUY GY HTI HT HMD HM VAT VA HND HN HKG HK HUN HU ISL IS IND IN IDN ID " +
    "IRN IR IRQ IQ IRL IE IMN IM ISR IL ITA IT JAM JM JPN JP JEY JE JOR JO KAZ KZ KEN KE KIR KI PRK KP KOR KR " +
    "KWT KW KGZ KG LAO LA LVA LV LBN LB LSO LS LBR LR LBY LY LIE LI LTU LT LUX LU MAC MO MDG MG MWI MW MYS MY " +
    "MDV MV MLI ML MLT MT MHL MH MTQ MQ MRT MR MUS MU MYT YT MEX MX FSM FM MDA MD MCO MC MNG MN MNE ME MSR MS " +
    "MAR MA MOZ MZ MMR MM NAM NA NRU NR NPL NP NLD NL NCL NC NZL NZ NIC NI NER NE NGA NG NIU NU NFK NF MKD MK " +
    "MNP MP NOR NO OMN OM PAK PK PLW PW PSE PS PAN PA PNG PG PRY PY PER PE PHL PH PCN PN POL PL PRT PT PRI PR " +
    "QAT QA REU RE ROU RO RUS RU RWA RW BLM BL SHN SH KNA KN LCA LC MAF MF SPM PM VCT VC WSM WS SMR SM STP ST " +
    "SAU SA SEN SN SRB RS SYC SC SLE SL SGP SG SXM SX SVK SK SVN SI SLB SB SOM SO ZAF ZA SGS GS SSD SS ESP ES " +
    "LKA LK SDN SD SUR SR SJM SJ SWE SE CHE CH SYR SY TWN TW TJK TJ TZA TZ THA TH TLS TL TGO TG TKL TK TON TO " +
    "TTO TT TUN TN TUR TR TKM TM TCA TC TUV TV UGA UG UKR UA ARE AE GBR GB USA US UMI UM URY UY UZB UZ VUT VU " +
    "VEN VE VNM VN VGB VG VIR VI WLF WF ESH EH YEM YE ZMB ZM ZWE ZW XKX XK"
  )
    .match(/[A-Z]{3} [A-Z]{2}/g)!
    .map((pair) => pair.split(" ") as [string, string]),
);
const CODES = new Set(Object.values(ALPHA3));

/** Names and abbreviations people commonly use that differ from the standard English name. */
const ALIASES: Record<string, string> = {
  UK: "GB", "GREAT BRITAIN": "GB", ENGLAND: "GB", SCOTLAND: "GB", WALES: "GB", "NORTHERN IRELAND": "GB", BRITAIN: "GB",
  "UNITED STATES OF AMERICA": "US", AMERICA: "US", "U S": "US", "U S A": "US",
  UAE: "AE", "U A E": "AE", EMIRATES: "AE", DUBAI: "AE",
  "SOUTH KOREA": "KR", KOREA: "KR", "NORTH KOREA": "KP", RUSSIA: "RU", "CZECH REPUBLIC": "CZ",
  "IVORY COAST": "CI", "COTE D IVOIRE": "CI", HOLLAND: "NL", "THE NETHERLANDS": "NL", TURKIYE: "TR", TURKEY: "TR",
  "DR CONGO": "CD", DRC: "CD", "DEMOCRATIC REPUBLIC OF THE CONGO": "CD", "REPUBLIC OF THE CONGO": "CG", CONGO: "CG",
  SWAZILAND: "SZ", BURMA: "MM", "CAPE VERDE": "CV", "EAST TIMOR": "TL", VATICAN: "VA", "VATICAN CITY": "VA",
  MACEDONIA: "MK", PALESTINE: "PS", "HONG KONG": "HK", MACAU: "MO", KSA: "SA",
};

const key = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]+/g, " ")
    .trim();

let names: Map<string, string> | undefined;
/** English country names → alpha-2, built from the runtime's own country names. */
function byName() {
  if (names) return names;
  names = new Map();
  const display = new Intl.DisplayNames("en", { type: "region" });
  for (const code of CODES) {
    const name = display.of(code);
    if (name && name !== code) names.set(key(name), code);
  }
  for (const [alias, code] of Object.entries(ALIASES)) names.set(key(alias), code);
  return names;
}

/** Turns a typed country (name, 2- or 3-letter code) into its ISO alpha-2 code, or null if unknown. */
export function resolveCountry(input: string): string | null {
  const k = key(input);
  if (!k) return null;
  const compact = k.replace(/ /g, "");
  if (compact.length === 2 && CODES.has(compact)) return compact;
  if (compact.length === 3 && ALPHA3[compact]) return ALPHA3[compact];
  return byName().get(k) ?? ALIASES[compact] ?? null;
}

/** Full English name for a stored code ("AE" → "United Arab Emirates"); unknown values are returned as is. */
export function countryName(code: string | null | undefined): string {
  if (!code) return "";
  try {
    return new Intl.DisplayNames("en", { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Every country's English name, sorted, for type-ahead suggestions. */
export function countryNames(): string[] {
  const display = new Intl.DisplayNames("en", { type: "region" });
  return [...CODES].map((c) => display.of(c) ?? c).sort((a, b) => a.localeCompare(b));
}
