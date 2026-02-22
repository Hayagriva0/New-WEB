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
    async function fetchWeather(lat, lon) {
        try {
            var url = API_BASE + '?latitude=' + lat + '&longitude=' + lon +
                '&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m' +
                '&daily=temperature_2m_max,temperature_2m_min' +
                '&timezone=auto&forecast_days=1';

            var response = await fetch(url);
            if (!response.ok) return null;
            var data = await response.json();

            var current = data.current;
            var daily = data.daily;
            var code = current.weather_code;
            var weatherInfo = WMO_CODES[code] || { icon: '🌤️', desc: 'Fair' };

            return {
                temp: Math.round(current.temperature_2m),
                icon: weatherInfo.icon,
                desc: weatherInfo.desc,
                humidity: current.relative_humidity_2m,
                wind: Math.round(current.wind_speed_10m),
                high: daily ? Math.round(daily.temperature_2m_max[0]) : null,
                low: daily ? Math.round(daily.temperature_2m_min[0]) : null
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
    async function getCityName(lat, lon) {
        try {
            var url = 'https://nominatim.openstreetmap.org/reverse?lat=' + lat +
                '&lon=' + lon + '&format=json&zoom=10';
            var response = await fetch(url);
            if (!response.ok) return 'Your Location';
            var data = await response.json();
            return data.address.city || data.address.town || data.address.village || 'Your Location';
        } catch {
            return 'Your Location';
        }
    }

    function render(data, cityName) {
        try {
            var widget = document.getElementById('weather-widget');
            if (!widget || !data) {
                if (widget) widget.style.display = 'none';
                return;
            }

            document.getElementById('weather-icon').textContent = data.icon;
            document.getElementById('weather-temp').textContent = data.temp + '°C';
            document.getElementById('weather-desc').textContent = data.desc;
            document.getElementById('weather-city').textContent = cityName || 'Your Location';

            /* Fill extra details if elements exist */
            var hiLo = document.getElementById('weather-hilo');
            if (hiLo && data.high !== null) {
                hiLo.textContent = 'H:' + data.high + '° L:' + data.low + '°';
            }

            widget.style.display = 'flex';
        } catch (err) {
            console.warn('Weather render failed:', err);
        }
    }

    async function init() {
        try {
            var settings = await Storage.getMultiple(['weatherEnabled', 'weatherLat', 'weatherLon', 'weatherCity']);

            if (!settings.weatherEnabled) return;

            var lat = settings.weatherLat;
            var lon = settings.weatherLon;
            var city = settings.weatherCity;

            /* If no stored location, try geolocation */
            if (!lat || !lon) {
                var loc = await getLocation();
                if (!loc) return;
                lat = loc.lat;
                lon = loc.lon;
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
