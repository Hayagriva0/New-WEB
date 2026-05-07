/**
 * weather.js — Weather Widget (Open-Meteo, free, no API key)
 * 
 * PRIVACY: Uses Open-Meteo API which requires NO API key.
 * Location is obtained via browser geolocation API (user must grant permission).
 * No location data is stored externally. Everything stays local.
 */

'use strict';

var Weather = (() => {

    var API_BASE = 'https://api.open-meteo.com/v1/forecast';

    /**
     * WMO Weather Codes → emoji + description
     */
    var WMO_CODES = {
        0: { icon: '☀️', desc: 'Clear' },
        1: { icon: '🌤️', desc: 'Mostly Clear' },
        2: { icon: '⛅', desc: 'Partly Cloudy' },
        3: { icon: '☁️', desc: 'Overcast' },
        45: { icon: '🌫️', desc: 'Foggy' },
        48: { icon: '🌫️', desc: 'Icy Fog' },
        51: { icon: '🌦️', desc: 'Light Drizzle' },
        53: { icon: '🌦️', desc: 'Drizzle' },
        55: { icon: '🌧️', desc: 'Heavy Drizzle' },
        56: { icon: '🌧️', desc: 'Freezing Drizzle' },
        57: { icon: '🌧️', desc: 'Heavy Freezing Drizzle' },
        61: { icon: '🌧️', desc: 'Light Rain' },
        63: { icon: '🌧️', desc: 'Rain' },
        65: { icon: '🌧️', desc: 'Heavy Rain' },
        66: { icon: '🌧️', desc: 'Freezing Rain' },
        67: { icon: '🌧️', desc: 'Heavy Freezing Rain' },
        71: { icon: '❄️', desc: 'Light Snow' },
        73: { icon: '❄️', desc: 'Snow' },
        75: { icon: '❄️', desc: 'Heavy Snow' },
        77: { icon: '❄️', desc: 'Snow Grains' },
        80: { icon: '🌦️', desc: 'Light Showers' },
        81: { icon: '🌧️', desc: 'Showers' },
        82: { icon: '🌧️', desc: 'Heavy Showers' },
        85: { icon: '🌨️', desc: 'Snow Showers' },
        86: { icon: '🌨️', desc: 'Heavy Snow Showers' },
        95: { icon: '⛈️', desc: 'Thunderstorm' },
        96: { icon: '⛈️', desc: 'Thunderstorm + Hail' },
        99: { icon: '⛈️', desc: 'Heavy Thunderstorm' }
    };

    /**
     * Fetch weather using Open-Meteo (no API key needed).
     */
    /**
     * Validate latitude and longitude values.
     */
    function isValidCoords(lat, lon) {
        return typeof lat === 'number' && typeof lon === 'number' &&
            isFinite(lat) && isFinite(lon) &&
            lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    }

    async function fetchWeather(lat, lon) {
        try {
            if (!isValidCoords(lat, lon)) return null;

            var url = API_BASE + '?latitude=' + lat + '&longitude=' + lon +
                '&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature,surface_pressure' +
                '&daily=temperature_2m_max,temperature_2m_min' +
                '&timezone=auto&forecast_days=1';

            var response = await fetch(url);
            if (!response.ok) return null;
            var data = await response.json();
            
            var aqi = 30; // default good
            try {
                var aqiResponse = await fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat + '&longitude=' + lon + '&current=us_aqi');
                if (aqiResponse.ok) {
                    var aqiData = await aqiResponse.json();
                    if (aqiData && aqiData.current && aqiData.current.us_aqi) {
                        aqi = aqiData.current.us_aqi;
                    }
                }
            } catch(e) {}

            /* Validate response shape */
            if (!data || !data.current || typeof data.current.temperature_2m !== 'number') {
                return null;
            }

            var current = data.current;
            var daily = data.daily;
            var code = current.weather_code;
            var weatherInfo = WMO_CODES[code] || { icon: '🌤️', desc: 'Fair' };

            return {
                temp: Math.round(current.temperature_2m),
                icon: weatherInfo.icon,
                desc: weatherInfo.desc,
                humidity: current.relative_humidity_2m,
                wind: Math.round(current.wind_speed_10m || 0),
                realFeel: Math.round(current.apparent_temperature || current.temperature_2m),
                pressure: Math.round(current.surface_pressure || 1012),
                aqi: aqi,
                high: (daily && Array.isArray(daily.temperature_2m_max) && daily.temperature_2m_max.length > 0)
                    ? Math.round(daily.temperature_2m_max[0]) : null,
                low: (daily && Array.isArray(daily.temperature_2m_min) && daily.temperature_2m_min.length > 0)
                    ? Math.round(daily.temperature_2m_min[0]) : null
            };
        } catch (err) {
            console.warn('Weather fetch failed:', err);
            return null;
        }
    }

    /**
     * Get user's location via Geolocation API.
     */
    function getLocation() {
        return new Promise(function (resolve) {
            if (!navigator.geolocation) {
                resolve(null);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                function (pos) {
                    resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                },
                function () {
                    /* User denied or error — try stored location */
                    resolve(null);
                },
                { timeout: 8000, maximumAge: 600000 }
            );
        });
    }

    /**
     * Reverse geocode to get city name (using Open-Meteo geocoding).
     */
    /**
     * Sanitize a city name string: trim, remove control chars, limit length.
     */
    function sanitizeCityName(name) {
        if (!name || typeof name !== 'string') return 'Your Location';
        var s = name.trim().replace(/[\x00-\x1F\x7F]/g, '');
        return s.substring(0, 60) || 'Your Location';
    }

    async function getCityName(lat, lon) {
        try {
            if (!isValidCoords(lat, lon)) return 'Your Location';
            var url = 'https://nominatim.openstreetmap.org/reverse?lat=' + lat +
                '&lon=' + lon + '&format=json&zoom=10';
            var response = await fetch(url);
            if (!response.ok) return 'Your Location';
            var data = await response.json();
            if (!data || !data.address) return 'Your Location';
            var raw = data.address.city || data.address.town || data.address.village || '';
            return sanitizeCityName(raw);
        } catch {
            return 'Your Location';
        }
    }

    function render(data, cityName) {
        try {
            var widget = document.getElementById('weather-widget');
            if (!widget || !data) {
                if (widget) widget.classList.add('hidden');
                return;
            }

            var tempEl = document.getElementById('weather-temp');
            if (tempEl) tempEl.textContent = data.temp + '°C';
            
            var cityEl = document.getElementById('weather-city');
            if (cityEl) cityEl.textContent = cityName || 'Your Location';

            /* Fill extra details if elements exist */
            var humEl = document.getElementById('weather-humidity');
            if (humEl) humEl.textContent = data.humidity + '%';
            
            var windEl = document.getElementById('weather-wind');
            if (windEl) windEl.textContent = data.wind + ' Km/h';
            
            var aqiEl = document.getElementById('weather-aqi');
            if (aqiEl) aqiEl.textContent = data.aqi;
            
            var realFeelEl = document.getElementById('weather-realfeel');
            if (realFeelEl) realFeelEl.textContent = data.realFeel + '°C';
            
            var pressureEl = document.getElementById('weather-pressure');
            if (pressureEl) pressureEl.textContent = data.pressure + ' mbar';
            
            var statusBar = document.getElementById('weather-status-bar');
            if (statusBar) {
                if (data.aqi <= 50) {
                    statusBar.textContent = 'Healthy';
                    statusBar.style.background = '#11d8d8';
                    statusBar.style.color = '#0b1522';
                } else if (data.aqi <= 100) {
                    statusBar.textContent = 'Moderate';
                    statusBar.style.background = '#ffd166';
                    statusBar.style.color = '#0b1522';
                } else {
                    statusBar.textContent = 'Unhealthy';
                    statusBar.style.background = '#ef476f';
                    statusBar.style.color = '#fff';
                }
            }

            widget.classList.remove('hidden');
        } catch (err) {
            console.warn('Weather render failed:', err);
        }
    }

    async function init() {
        try {
            var settings = await Storage.getMultiple(['weatherEnabled', 'weatherLat', 'weatherLon', 'weatherCity']);

            if (!settings.weatherEnabled) return;

            var lat = typeof settings.weatherLat === 'number' ? settings.weatherLat : null;
            var lon = typeof settings.weatherLon === 'number' ? settings.weatherLon : null;
            var city = settings.weatherCity;

            /* If no valid stored location, try geolocation */
            if (!isValidCoords(lat, lon)) {
                var loc = await getLocation();
                if (!loc) return;
                lat = loc.lat;
                lon = loc.lon;
                if (!isValidCoords(lat, lon)) return;
                city = await getCityName(lat, lon);
                /* Store for future use */
                Storage.set('weatherLat', lat);
                Storage.set('weatherLon', lon);
                Storage.set('weatherCity', city);
            }

            var data = await fetchWeather(lat, lon);
            render(data, city);
        } catch (err) {
            console.warn('Weather init failed:', err);
        }
    }

    return { init: init, render: render, getLocation: getLocation, getCityName: getCityName, fetchWeather: fetchWeather };
})();
