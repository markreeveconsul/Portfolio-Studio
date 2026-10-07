import locationData from './cebu-locations.json';
export const CEBU_LOCATIONS = locationData;
export const CEBU_CITY_CODE = '0730600000';
export function cityCode(address: CebuAddress): string {
  return address.city_code ?? CEBU_CITY_CODE;
}
export function cityLocation(address: CebuAddress) {
  return CEBU_LOCATIONS.find((city) => city.code === cityCode(address));
}
export function addressSummary(address: CebuAddress): string {
  const city = cityLocation(address);
  return city ? city.name + ', Philippines' : 'Cebu, Philippines';
}
// PSA PSGC City of Cebu, retrieved 7 October 2026. Page labels list as of 31 July 2025.
// https://psa.gov.ph/classification/psgc/barangays/0730600000
export const CEBU_BARANGAYS: readonly string[] = [
  'Adlaon',
  'Agsungot',
  'Apas',
  'Babag',
  'Bacayan',
  'Banilad',
  'Basak Pardo',
  'Basak San Nicolas',
  'Binaliw',
  'Bonbon',
  'Budla-an',
  'Buhisan',
  'Bulacao',
  'Buot-Taup Pardo',
  'Busay',
  'Calamba',
  'Cambinocot',
  'Camputhaw',
  'Capitol Site',
  'Carreta',
  'Central',
  'Cogon Pardo',
  'Cogon Ramos',
  'Day-as',
  'Duljo',
  'Ermita',
  'Guadalupe',
  'Guba',
  'Hippodromo',
  'Inayawan',
  'Kalubihan',
  'Kalunasan',
  'Kamagayan',
  'Kasambagan',
  'Kinasang-an Pardo',
  'Labangon',
  'Lahug',
  'Lorega',
  'Lusaran',
  'Luz',
  'Mabini',
  'Mabolo',
  'Malubog',
  'Mambaling',
  'Pahina Central',
  'Pahina San Nicolas',
  'Pamutan',
  'Pardo',
  'Pari-an',
  'Paril',
  'Pasil',
  'Pit-os',
  'Pulangbato',
  'Pung-ol-Sibugay',
  'Punta Princesa',
  'Quiot Pardo',
  'Sambag I',
  'Sambag II',
  'San Antonio',
  'San Jose',
  'San Nicolas Central',
  'San Roque',
  'Santa Cruz',
  'Sapangdaku',
  'Sawang Calero',
  'Sinsin',
  'Sirao',
  'Suba Pob.',
  'Sudlon I',
  'Sudlon II',
  'T. Padilla',
  'Tabunan',
  'Tagbao',
  'Talamban',
  'Taptap',
  'Tejero',
  'Tinago',
  'Tisa',
  'To-ong Pardo',
  'Zapatera',
];
export interface CebuAddress {
  city_code?: string;
  barangay: string;
  street: string;
  postal_code: string;
}
export const emptyCebuAddress = (): CebuAddress => ({
  city_code: '',
  barangay: '',
  street: '',
  postal_code: '',
});
export function normalizePhilippinePhone(value: string): string {
  const compact = value.replace(/[\s()-]/g, '');
  if (!compact) return '';
  if (compact.startsWith('+63')) return '+63' + compact.slice(3).replace(/^0/, '');
  if (compact.startsWith('63')) return '+' + compact;
  return '+63' + compact.replace(/^0/, '');
}
export function validPhilippinePhone(value: string): boolean {
  return !value || /^\+63(?:9\d{9}|32\d{7})$/.test(value);
}
