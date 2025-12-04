
import { WeatherData } from '../types';

// Cache runtime per evitare chiamate ripetute all'API di Geocoding
const GEO_CACHE: { [key: string]: { lat: number, lon: number } } = {};

// Coordinate Hardcoded per casi disperati o ambigui (Fallback)
const HARDCODED_COORDS: { [key: string]: { lat: number, lon: number } } = {
    'Bodø': { lat: 67.2804, lon: 14.4049 }, // Artico, difficile da trovare per geocoder generici
    'Piraeus': { lat: 37.9429, lon: 23.6469 },
    'Razgrad': { lat: 43.525, lon: 26.525 }, // Ludogorets
    'Herning': { lat: 56.13, lon: 8.97 }, // Midtjylland
    'Farum': { lat: 55.81, lon: 12.39 }, // Nordsjaelland
    'Molde': { lat: 62.7375, lon: 7.1591 },
    'Baku': { lat: 40.4093, lon: 49.8671 }, // Qarabag
    'Larnaca': { lat: 34.9167, lon: 33.6292 }, // Squadre cipriote spesso qui
    'Nicosia': { lat: 35.1856, lon: 33.3823 }
};

// Normalizza rimuovendo accenti e caratteri speciali (Bodø -> bodo)
const normalizeName = (name: string): string => {
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Rimuove accenti
    .replace(/[^a-z0-9]/g, ''); // Rimuove tutto ciò che non è alfanumerico
};

// Mapping Manuale Esteso per squadre Europee
const CITY_MAPPINGS: { [key: string]: string } = {
  // --- SERIE A ---
  'juventus': 'Turin',
  'atalanta': 'Bergamo',
  'sassuolo': 'Reggio Emilia',
  'lazio': 'Rome',
  'inter': 'Milan',
  'milan': 'Milan',
  'roma': 'Rome',
  'napoli': 'Naples',
  'fiorentina': 'Florence',
  'salernitana': 'Salerno',
  'sampdoria': 'Genoa',
  'udinese': 'Udine',
  'monza': 'Monza',
  'lecce': 'Lecce',
  'frosinone': 'Frosinone',
  'cagliari': 'Cagliari',
  'empoli': 'Empoli',
  'verona': 'Verona',
  'bologna': 'Bologna',
  'torino': 'Turin',
  'genoa': 'Genoa',
  'parma': 'Parma',
  'como': 'Como',
  'venezia': 'Venice',

  // --- PREMIER LEAGUE ---
  'arsenal': 'London',
  'astonvilla': 'Birmingham',
  'brentford': 'London',
  'chelsea': 'London',
  'crystalpalace': 'London',
  'everton': 'Liverpool',
  'fulham': 'London',
  'tottenham': 'London',
  'westham': 'London',
  'wolves': 'Wolverhampton',
  'wolverhampton': 'Wolverhampton',
  'manchestercity': 'Manchester',
  'manchesterunited': 'Manchester',
  'newcastle': 'Newcastle upon Tyne',
  'brighton': 'Brighton',

  // --- LIGA ---
  'athleticclub': 'Bilbao',
  'atleticomadrid': 'Madrid',
  'realmadrid': 'Madrid',
  'realsociedad': 'San Sebastian',
  'betis': 'Seville',
  'realbetis': 'Seville',
  'osasuna': 'Pamplona',
  'rayovallecano': 'Madrid',
  'celta': 'Vigo',
  'mallorca': 'Palma',
  'girona': 'Girona',
  'barcelona': 'Barcelona',
  'sevilla': 'Seville',
  'villarreal': 'Villarreal',

  // --- BUNDESLIGA ---
  'bvb': 'Dortmund',
  'borussiadortmund': 'Dortmund',
  'bayernmunchen': 'Munich',
  'bayernmunich': 'Munich',
  'rb': 'Leipzig',
  'rbleipzig': 'Leipzig',
  'bayer04': 'Leverkusen',
  'bayerleverkusen': 'Leverkusen',
  'hoffenheim': 'Sinsheim',
  'mainz05': 'Mainz',
  'schalke04': 'Gelsenkirchen',
  'eintracht': 'Frankfurt',
  'stuttgart': 'Stuttgart',
  'heidenheim': 'Heidenheim',
  
  // --- LIGUE 1 ---
  'psg': 'Paris',
  'parissaintgermain': 'Paris',
  'monaco': 'Monaco',
  'lille': 'Lille',
  'brest': 'Brest',
  'lens': 'Lens',
  'rennes': 'Rennes',
  'nice': 'Nice',
  'marseille': 'Marseille',
  'lyon': 'Lyon',

  // --- ALTRI CAMPIONATI & SQUADRE EUROPEE (CL, EL, ECL) ---
  'sportingcp': 'Lisbon',
  'sporting': 'Lisbon',
  'benfica': 'Lisbon',
  'porto': 'Porto',
  'braga': 'Braga',
  
  'ajax': 'Amsterdam',
  'psv': 'Eindhoven',
  'feyenoord': 'Rotterdam',
  'azalkmaar': 'Alkmaar',
  'twente': 'Enschede',
  
  'celtic': 'Glasgow',
  'rangers': 'Glasgow',
  'hearts': 'Edinburgh',
  
  'aek': 'Athens',
  'panathinaikos': 'Athens',
  'olympiacos': 'Piraeus',
  'olympiakos': 'Piraeus',
  'paok': 'Thessaloniki',
  
  'besiktas': 'Istanbul',
  'galatasaray': 'Istanbul',
  'fenerbahce': 'Istanbul',
  'basaksehir': 'Istanbul',
  'trabzonspor': 'Trabzon',
  
  // SQUADRE CHE CREAVANO PROBLEMI (FIX RICHIESTO)
  'pafos': 'Paphos',
  'pafosfc': 'Paphos',
  'bodo': 'Bodø', // IMPORTANTE: Usare Bodø con la ø per l'API Meteo
  'bodoglimt': 'Bodø',
  'slaviapraha': 'Prague',
  'slaviaprague': 'Prague', // Alias inglese comune
  'spartapraha': 'Prague',
  'spartaprague': 'Prague',
  'viktoriaplzen': 'Plzen',
  'mlada': 'Mlada Boleslav',
  
  // EST EUROPA & NORDICS
  'shakhtar': 'Gelsenkirchen', // 24/25 Home in Gelsenkirchen
  'dynamokyiv': 'Hamburg', // 24/25 Home in Hamburg
  'qarabag': 'Baku',
  'macabitelaviv': 'Szombathely', // Displaced (Hungary)
  
  'redstar': 'Belgrade',
  'crvenazvezda': 'Belgrade',
  'partizan': 'Belgrade',
  'dinamozagreb': 'Zagreb',
  'hajduk': 'Split',
  'rijeka': 'Rijeka',
  'legia': 'Warsaw',
  'lech': 'Poznan',
  'rakow': 'Czestochowa',
  'jagiellonia': 'Bialystok',
  'molde': 'Molde',
  'rosenborg': 'Trondheim',
  'cophenagen': 'Copenhagen',
  'fckobenhavn': 'Copenhagen',
  'brondby': 'Copenhagen',
  'midtjylland': 'Herning',
  'nordsjaelland': 'Farum',
  'malmo': 'Malmo',
  'djurgarden': 'Stockholm',
  'aik': 'Stockholm',
  'elfsborg': 'Boras',
  'hacken': 'Gothenburg',
  'goteborg': 'Gothenburg',
  'hjk': 'Helsinki',
  'klaksvik': 'Torshavn',
  'vikingur': 'Reykjavik',
  'gent': 'Gent',
  'genk': 'Genk',
  'antwerp': 'Antwerp',
  'unionstgilloise': 'Brussels',
  'anderlecht': 'Brussels',
  'clubbrugge': 'Bruges',
  'cerclebrugge': 'Bruges',
  'youngboys': 'Bern',
  'lugano': 'Thun', // European matches often in Thun
  'servette': 'Geneva',
  'zurich': 'Zurich',
  'basel': 'Basel',
  'stgallen': 'Saint Gallen',
  'salzburg': 'Salzburg',
  'rbsalzburg': 'Salzburg',
  'sturm': 'Graz',
  'sturmgraz': 'Graz',
  'lask': 'Linz',
  'rapidwien': 'Vienna',
  'austriawien': 'Vienna',
  'ferencvaros': 'Budapest',
  'slovanbratislava': 'Bratislava',
  'fcsb': 'Bucharest',
  'steaua': 'Bucharest',
  'cluj': 'Cluj',
  'ludogorets': 'Razgrad',
  'sheriff': 'Tiraspol',
  'apoel': 'Nicosia',
  'omonia': 'Nicosia',
  'arislimassol': 'Limassol',
  'larne': 'Larne',
  'shamrock': 'Dublin',
  'newsaints': 'Oswestry'
};

const extractCityFromTeamName = (teamName: string): string => {
  const norm = normalizeName(teamName);
  
  // 1. Check Mapping Manuale (Priorità massima)
  for (const [key, city] of Object.entries(CITY_MAPPINGS)) {
      if (norm.includes(key) || key.includes(norm)) {
          return city;
      }
  }

  // 2. Euristica: Pulisci il nome da suffissi/prefissi comuni
  let clean = teamName
    .replace(/\b(FC|AC|AS|SSC|CF|SC|VfB|Borussia|Real|Sporting|Club|United|City|Town|Wanderers|Rovers|Albion|Athletic|Union|Saint|St|Olympique|Deportivo|Dyanmo|Dynamo|Sparta|Slavia|Red Star|Maccabi|Hapoel|CSKA|Lokomotiv|Legia|Lech|Rapid|Austria)\b/gi, '')
    .trim();

  // Rimuovi caratteri speciali e numeri
  clean = clean.replace(/[0-9]/g, '').trim();
  
  // Se rimane vuoto (caso limite), torna il nome originale
  return clean.length > 2 ? clean : teamName;
};

export const WeatherService = {
  
  getCoordinates: async (query: string): Promise<{lat: number, lon: number} | null> => {
      // 0. Check Hardcoded Coordinates (Instant Fallback)
      if (HARDCODED_COORDS[query]) return HARDCODED_COORDS[query];

      // 1. Check Runtime Cache
      const cacheKey = query.toLowerCase();
      if (GEO_CACHE[cacheKey]) return GEO_CACHE[cacheKey];

      try {
          const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=it&format=json`;
          const res = await fetch(url);
          const data = await res.json();

          if (data.results && data.results.length > 0) {
              const coords = { lat: data.results[0].latitude, lon: data.results[0].longitude };
              GEO_CACHE[cacheKey] = coords; // Salva in cache
              return coords;
          }
      } catch (e) {
          console.error(`Geocoding failed for ${query}`, e);
      }
      return null;
  },

  getMatchWeather: async (homeTeam: string, matchTime: string): Promise<WeatherData | null> => {
    try {
        // 1. Identifica la città target
        const cityTarget = extractCityFromTeamName(homeTeam);
        
        // 2. Ottieni coordinate (dinamico con fallback)
        const coords = await WeatherService.getCoordinates(cityTarget);
        
        if (!coords) {
             console.warn(`Meteo: Impossibile trovare coordinate per ${homeTeam} (${cityTarget})`);
             return null;
        }

        // 3. Ottieni Meteo da Open-Meteo
        const dateObj = new Date(matchTime);
        const hour = dateObj.getHours();
        const dateStr = dateObj.toISOString().split('T')[0];

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code&start_date=${dateStr}&end_date=${dateStr}`;
        
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();

        // Se l'ora è passata o non disponibile, usa l'ora corrente o la prima disponibile
        const index = data.hourly?.time ? (data.hourly.time.length > hour ? hour : 0) : 0;
        
        if (!data.hourly || data.hourly.temperature_2m[index] === undefined) return null;

        const code = data.hourly.weather_code[index];
        let condition: WeatherData['condition'] = 'SUN';
        
        // WMO Code Interpretation
        if (code >= 51 && code <= 67) condition = 'RAIN'; // Drizzle / Rain
        else if (code >= 80 && code <= 82) condition = 'RAIN'; // Showers
        else if (code >= 95) condition = 'RAIN'; // Thunderstorm
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
        console.error("Weather Service Error", e);
        return null;
    }
  }
};
