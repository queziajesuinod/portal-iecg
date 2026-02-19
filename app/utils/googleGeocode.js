/* eslint-disable import/prefer-default-export */
const GOOGLE_GEOCODE_KEY = process.env.REACT_APP_GOOGLE_GEOCODE_KEY;

const getComponentValue = (components, types) => components.find((component) => types.every((type) => component.types.includes(type))
)?.long_name || '';

const getComponentShortValue = (components, types) => components.find((component) => types.every((type) => component.types.includes(type))
)?.short_name || '';

export const fetchGeocode = async (query) => {
  if (!query) return null;
  if (!GOOGLE_GEOCODE_KEY) {
    throw new Error('REACT_APP_GOOGLE_GEOCODE_KEY precisa ser configurada.');
  }

  const params = new URLSearchParams({
    address: query,
    key: GOOGLE_GEOCODE_KEY,
  });
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Falha ao consultar o Google Maps.');
  }
  const data = await response.json();
  if (!data || data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
    return null;
  }
  const result = data.results[0];
  const location = result.geometry?.location;
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return null;
  }
  const components = result.address_components || [];
  const bairro = getComponentValue(components, ['sublocality', 'political'])
    || getComponentValue(components, ['neighborhood', 'political'])
    || '';
  const logradouro = getComponentValue(components, ['route']);
  const numeroEncontrado = getComponentValue(components, ['street_number'])
    || getComponentValue(components, ['premise'])
    || getComponentValue(components, ['subpremise'])
    || '';
  const cidade = getComponentValue(components, ['locality'])
    || getComponentValue(components, ['administrative_area_level_2'])
    || '';
  const estado = getComponentValue(components, ['administrative_area_level_1']) || '';
  const uf = getComponentShortValue(components, ['administrative_area_level_1']) || '';
  const cepEncontrado = getComponentValue(components, ['postal_code']) || '';

  return {
    lat: location.lat,
    lon: location.lng,
    bairro,
    logradouro,
    numeroEncontrado,
    cidade,
    estado,
    uf,
    cepEncontrado,
  };
};
