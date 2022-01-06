// environment variables
require('dotenv').config()
const axios = require('axios');
// process arguments
const { argv } = require('process');

// converts temperature from kelvin to celsius
const convertKelvinToCelsius = (tempKelvin) => {
    return (tempKelvin - 273.15).toFixed(2);
}

// converts temperature from kelvin to fahrenheit
const convertKelvinToFahrenheit = (tempKelvin) => {
    return (1.8 * ( (tempKelvin - 273.15) + 32 )).toFixed(2);
}

// extracts rest of the day condition from hourly report of 24 hours.
const restOfDayCondition = (hourlyWeather) => {
    if(hourlyWeather.length > 24) {
        hourlyWeather = hourlyWeather.slice(0, 23);
    }
    const conditionFreq = {};
    hourlyWeather.forEach(report => {
        const condition = report.weather[0].main;
        if(!conditionFreq[condition]) {
            conditionFreq[condition] = 1;
        } else {
            conditionFreq[condition]++;
        }
    })

    const [dayCondition, ] = Object.keys(conditionFreq).reduce((acc, key) => {
        conditionFreq[key]
        if(conditionFreq[key] > acc) {
            return [key, conditionFreq[key]];
        } else {
            return acc;
        }
    }, 0)
    return dayCondition;
}

// extract longitude, latitude and place name from the query using MapBox API
const getLonLatPlace = async (query) => {
    const locationUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?types=place&limit=1&access_token=${process.env.MAPBOX_API_KEY}`
    const locationRes = await axios.get(locationUrl);
    const locData = locationRes.data;
    const [ lon, lat ] = locData.features[0].geometry.coordinates;
    const { place_name } = locData.features[0];
    return [ lon, lat, place_name ];
}

// Get weatherData from the openweathermap API using the query
const getWeatherData = async (lon, lat) => {
    const weatherUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,daily,alerts&appid=${process.env.OPEN_WEATHER_API_KEY}`;
    const weatherRes = await axios.get(weatherUrl)
    const weatherData = weatherRes.data;
    return weatherData;
}

const main = (async () => {
    // in the scenario where no place is specified or is input without double quotes
    if(argv.length > 3 || argv.length <= 2) {
        console.error('Please enter the place name within double quotes!\nEx: node app.js "New Delhi"');
    } else {
        const query = argv[2];

        try {
            // getting the location from mapbox
            // we are interested in the lon, lat and the place_name
            const [ lon, lat, place_name ] = await getLonLatPlace(query);
            // GET weather data 
            const weatherData = await getWeatherData(lon, lat);

             // extract info from weather data
            const dayCondition = restOfDayCondition(weatherData.hourly)
            const currTemp = weatherData.current.temp;
            const currTempCF = [convertKelvinToCelsius(currTemp), convertKelvinToFahrenheit(currTemp)];
            const currCondition = weatherData.current.weather[0].main;
        
            const output = `Current temperature in ${place_name} is ${currTempCF[0]} C / ${currTempCF[1]} F.\nConditions are currently: ${currCondition}.\nWhat you should expect: ${dayCondition} throughout the day.`
            console.log(output);
        } catch(e) {
            console.error('There was an error with one of the APIs, try again later.');
        }
    }    
})();