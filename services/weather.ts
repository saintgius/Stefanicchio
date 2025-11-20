
import { WeatherData } from '../types';

// Mapping Serie A Teams to Stadium Coordinates (Approx)
const STADIUM_COORDS: { [key: string]: { lat: number, lon: number } } = {
  'inter': { lat: 45.478, lon: 9.124 }, // San Siro
  'milan': { lat: 45.478, lon: 9.124 }, // San Siro
  'juventus': { lat: 45.109, lon: 7.641 }, // Allianz
  'torino': { lat: 45.041, lon: 7.650 }, // Olimpico Grande Torino
  'roma': { lat: 41.934, lon: 12.454 }, // Olimpico
  'lazio': { lat: 41.934, lon: 12.454 }, // Olimpico
  'napoli': { lat: 40.827, lon: 14.193 }, // Maradona
  'atalanta': { lat: 45.709, lon: 9.680 }, // Gewiss
  'fiorentina': { lat: 43.780, lon: 11.282 }, // Franchi
  'bologna': { lat: 44.492, lon: 11.310 }, // Dall'Ara
  'sassuolo': { lat: 44.714, lon: 10.647 }, // Mapei
  'udinese': { lat: 46.081, lon: 13.200 }, // Bluenergy
  'verona': { lat: 45.435, lon: 10.968 }, // Bentegodi
  'lecce': { lat: 40.358, lon: 18.204 }, // Via del Mare
  'monza': { lat: 45.585, lon: 9.296 }, // U-Power
  'frosinone': { lat: 41.636, lon: 13.320 }, // Stirpe
  'genoa': { lat: 44.416, lon: 8.952 }, // Ferraris
  'cagliari': { lat: 39.200, lon: 9.145 }, // Unipol Domus
  'salernitana': { lat: 40.673, lon: 14.797 }, // Arechi
  'empoli': { lat: 43.724, lon: 10.962 }, // Castellani
  'parma': { lat: 44.807, lon: 10.336 }, // Tardini
  'como': { lat: 45.812, lon: 9.074 }, // Sinigaglia
  'venezia': { lat: 45.426, lon: 12.365 }, // Penzo
};

// Normalize helper from storage service logic
const normalizeName = (name: string): string => {
  return name.toLowerCase().replace(/fc|ac|as|ssc|calcio|football club|sportiva|u\.s\.|c\.f\./g, '').trim();
};

export const WeatherService = {
  getMatchWeather: async (homeTeam: string, matchTime: string): Promise<WeatherData | null> => {
    const cleanName = normalizeName(homeTeam);
    let coords = null;

    // Fuzzy find coords
    for (const [key, val] of Object.entries(STADIUM_COORDS)) {
        if (cleanName.includes(key) || key.includes(cleanName)) {
            coords = val;
            break;
        }
    }

    if (!coords) return null;

    // Open-Meteo API (No Key required)
    // Format: YYYY-MM-DDTHH:MM
    const dateObj = new Date(matchTime);
    const hour = dateObj.getHours();
    const dateStr = dateObj.toISOString().split('T')[0];

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code&start_date=${dateStr}&end_date=${dateStr}`;
        
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();

        const index = hour; // Hourly array index corresponds to hour of day roughly
        
        if (!data.hourly || !data.hourly.temperature_2m[index]) return null;

        const code = data.hourly.weather_code[index];
        let condition: WeatherData['condition'] = 'SUN';
        
        // WMO Weather interpretation codes
        if (code >= 51 && code <= 67) condition = 'RAIN';
        else if (code >= 80 && code <= 82) condition = 'RAIN';
        else if (code >= 71 && code <= 77) condition = 'SNOW';
        else if (code >= 1 && code <= 3) condition = 'CLOUDY';
        else if (code === 0) condition = 'SUN';

        const wind = data.hourly.wind_speed_10m[index];
        if (wind > 25) condition = 'WIND';

        return {
            temp: data.hourly.temperature_2m[index],
            condition: condition,
            wind_speed: wind,
            precip_prob: data.hourly.precipitation_probability[index]
        };

    } catch (e) {
        console.error("Weather fetch error", e);
        return null;
    }
  }
};