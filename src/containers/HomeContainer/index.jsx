import React, { useState, useEffect, useRef } from "react";
import Cosmic from "cosmicjs";
import Mapbox from "mapbox-gl";
import SkeletonContainer from "../SkeletonContainer";
import HomeContent from "../../components/HomeContent";
import PageTitle from "../../components/PageTitle";
import Container from "../../components/Container";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";

let map = null;
let marker = null;
let weatherKey = process.env.WEATHERSTACK_API_KEY;
function HomeContainer() {
  const mapElement = useRef(null);
  Mapbox.accessToken = process.env.MAPBOX_API_KEY;

  const [style, setStyle] = useState(
    "mapbox://styles/sandernl/ckkxyzmis0jua17qidgsr1fu7"
  );
  const [mapMarkersState, setMapMarkersState] = useState([]);
  const [infoContent, setInfoContent] = useState(null);
  const [stop, setStop] = useState(null);
  const [pageData, setPageData] = useState(null);
  const [weatherData, setWeatherData] = useState([]);
  const [isWeatherData, setIsWeatherData] = useState(false);

  // Cosmicjs
  useEffect(() => {
    const client = new Cosmic();
    const bucket = client.bucket({
      slug: process.env.BUCKET_SLUG,
      read_key: process.env.READ_KEY,
    });

    bucket
      .getObject({
        slug: "verdens-syv-nye-underverk",
        props: "slug,title,content,metadata",
      })

      .then((data) => {
        setPageData(data.object);
        console.log("Page Data from Cosmic", data);
      })
      .catch((error) => {});

    bucket
      .getObjects({
        type: "underverkene",
        props: "slug,title,content,metadata",
      })

      .then((data) => {
        setMapMarkersState(data.objects);
        console.log("Marker Data from Cosmic", data.objects);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  //
  useEffect(() => {
    if (pageData !== null) {
      map = new Mapbox.Map({
        container: mapElement.current,
        center: [10.381198, 28.748947],
        zoom: 1.5,
        style: style,
      });
      map.addControl(new Mapbox.NavigationControl(), "bottom-right");
      map.addControl(
        new MapboxGeocoder({
          accessToken: process.env.MAPBOX_API_KEY, // mapboxgl.accessToken,
          mapboxgl: Mapbox,
        })
      );
    }
  }, [pageData]);

  useEffect(() => {
    console.log("useEffect MapMarker IsWhetherData.... ", isWeatherData);
    if (
      !mapMarkersState ||
      !map ||
      !sessionStorage.getItem("WEATHER-DATA") ||
      JSON.parse(sessionStorage.getItem("WEATHER-DATA")).length === 0
    ) {
      return;
    } else {
      mapMarkersState.map((item, index) => {
        let el = document.createElement("div");

        el.className = "my-destination";
        el.setAttribute("data-name", `${item.title}`);
        el.setAttribute("stop-country", `${item.slug}`);
        el.style.display = "block";
        el.style.height = "50px";
        el.style.width = "50px";
        el.style.pointer = "clicker";
        el.style.backgroundImage = `url('${item.metadata.contentimage.imgix_url}')`;
        el.style.backgroundSize = "50px 50px";

        el.addEventListener("keydown", function (event) {
          if (event.key !== "Enter") return;
          let selectedStop = el.getAttribute("data-name");
          let country = el.getAttribute("stop-country");
          let stopToPass = mapMarkersState.find(
            (el) => el.title === selectedStop
          );
          console.log(selectedStop);
          setStop(stopToPass);
          map.flyTo({
            center: [item.metadata.longitude, item.metadata.latitude],
            zoom: 4,
          });
          setVisualization(country, map);
          setWeatherToPopup(country);
        });

        el.addEventListener("click", function () {
          let selectedStop = el.getAttribute("data-name");
          let country = el.getAttribute("stop-country");
          let stopToPass = mapMarkersState.find(
            (el) => el.title === selectedStop
          );
          console.log(selectedStop);
          setStop(stopToPass);
          map.flyTo({
            center: [item.metadata.longitude, item.metadata.latitude],
            zoom: 4,
          });
          setVisualization(country, map);
        });

        setInfoContent(item.content);

        const weatherData = JSON.parse(sessionStorage.getItem("WEATHER-DATA"));
        var weather = weatherData.filter((p) => p.slug === item.slug)[0];

        let popUpCard = `
					<div class="popup-destination">
            <button id="demo">x</button>
            <h2>${item.title}</h2>
            <p>${item.content}</p>
            <img class="item-img" src=${item.metadata.infoimage.imgix_url} alt=${item.metadata.infoimagealt}>
            <h3>Værmelding (${weather?.location?.name})</h3>

            <div class="weather">
              <p class="weather-temp" id="${item.slug}-stop-temperature">${weather?.current?.temperature}°c</p>
              <img class="weather-img" id="${item.slug}-stop-weather-icon" src=${weather?.current?.weather_icons}>
              <p class="weather-desc" id="${item.slug}-stop-weather-desc">${weather?.current?.weather_descriptions}</p>
            </div>
            <div class="bar-chart-container">
              <canvas id="chart" class="bar-chart"></canvas>              
            </div>       
          </div>`;

        let popUp = new Mapbox.Popup({ closeButton: false });
        popUp.setHTML(popUpCard);

        new Mapbox.Marker(el, {
          anchor: "top",
        })
          .setLngLat([item.metadata.longitude, item.metadata.latitude])
          .setPopup(popUp)
          .addTo(map);
      });
    }
  }, [mapMarkersState, isWeatherData]);

  function getBarData(covidDeathsData) {
    const barData = [];
    for (let i = 0; i < 12; i++) {
      barData[i] = covidDeathsData[i] ? covidDeathsData[i] : 0;
    }
    return barData;
  }

  function setVisualization(country, map) {
    let currentData = sessionStorage.getItem("COVID-DATA");
    currentData = !currentData ? {} : JSON.parse(currentData);
    console.log("deaths", currentData);

    if (!currentData[country]) return;

    setTimeout(() => {
      if (document.getElementById("demo")) {
        let yoEl = document.getElementById("demo");
        console.log("yoEl found===>", yoEl);
        console.log(
          "The parent of found yoEl",
          yoEl.parentElement.parentElement.parentElement
        );
        const popUPEl = yoEl.parentElement.parentElement.parentElement;

        yoEl.onclick = function () {
          popUPEl.remove();

          map.flyTo({
            center: [10.381198, 28.748947],
            zoom: 1.5,
          });
          map.click();
          console.log("Click found");
        };
      }
    }, 500);

    setTimeout(() => {
      const ctx = document.getElementById("chart");

      const data = getBarData(currentData[country]);
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: [
            "Jan",
            "Feb",
            "Mars",
            "April",
            "Mai",
            "Juni",
            "Juli",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Des",
          ],
          datasets: [
            {
              label: "COVID Dødsfall i 2020",
              data: data,
              backgroundColor: ["rgba(255, 99, 132, 0.2)"],
              borderColor: ["rgba(255, 99, 132, 0.2)"],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: false,
          scales: {
            xAxes: [
              {
                ticks: {
                  maxRotation: 90,
                  minRotation: 80,
                },
                gridLines: {
                  offsetGridLines: true,
                },
              },
              {
                position: "top",
                ticks: {
                  maxRotation: 90,
                  minRotation: 80,
                },
                gridLines: {
                  offsetGridLines: true,
                },
              },
            ],
            yAxes: [
              {
                ticks: {
                  beginAtZero: true,
                },
              },
            ],
          },
        },
      });
    }, 1000);
  }
  useEffect(() => {
    //
    if (!mapMarkersState) {
      return;
    }
    console.log(mapMarkersState);
    mapMarkersState.map((i) => {
      fetch(
        `https://api.weatherstack.com/forecast?access_key=${weatherKey}&query=${i.metadata.weatherquery}`
      )
        .then((response) => response.json())
        .then((data) => {
          data.slug = i.slug;
          if (sessionStorage.getItem("WEATHER-DATA")) {
            const currentData = JSON.parse(
              sessionStorage.getItem("WEATHER-DATA")
            );
            currentData.push(data);
            console.log("currrentData", currentData.length);
            sessionStorage.setItem("WEATHER-DATA", JSON.stringify(currentData));
            if (currentData.length >= 8) {
              setIsWeatherData(true);
            }
          } else {
            sessionStorage.setItem("WEATHER-DATA", JSON.stringify([data]));
          }
        });
      getCovidData(i.slug);
    });
  }, [mapMarkersState]);

  function renderSkeleton() {
    return <SkeletonContainer />;
  }

  function renderPage() {
    return (
      <Container as="main">
        <PageTitle></PageTitle>
        <HomeContent dangerouslySetInnerHTML={{ __html: pageData.content }} />
        <div
          className="mapContainer"
          style={{ height: "100vh", width: "100vw" }}
          ref={mapElement}
        ></div>
      </Container>
    );
  }

  function getCovidData(country) {
    fetch(`https://covid-193.p.rapidapi.com/history?country=${country}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-key": process.env.RAPID_API_KEY,
        "x-rapidapi-host": "covid-193.p.rapidapi.com",
        useQueryString: true,
      },
    })
      .then((res) => res.json())
      .then(
        (result) => processCovidData(result.response, country),
        (error) => console.log("COVID", error)
      );
  }

  function setWeatherToPopup(country) {
    const weatherData = JSON.parse(sessionStorage.getItem("WEATHER-DATA"));
    const weather = weatherData.filter((p) => p.slug === country)[0];
    setTimeout(() => {
      document.getElementById(
        `${country}-stop-temperature`
      ).innerHTML = `${weather?.current?.temperature}°c`;
      document.getElementById(
        `${country}-stop-weather-icon`
      ).innerHTML = `${weather?.current?.weather_icons}`;
      document.getElementById(
        `${country}-stop-weather-desc`
      ).innerHTML = `${weather?.current?.weather_descriptions}`;
    }, 1000);
  }

  function processCovidData(result, country) {
    if (!result || result.length === 0) return;
    const formattedData = result.reduce((accumulator, data) => {
      const date = new Date(data.day);
      if (date.getFullYear() !== 2020) return accumulator;
      const newDeaths = data.deaths.new
        ? parseInt(data.deaths.new.replace("+", ""))
        : 0;
      if (accumulator[data.day] && newDeaths > accumulator[data.day]) {
        accumulator[data.day] = newDeaths;
      } else if (!accumulator[data.day]) {
        accumulator[data.day] = newDeaths;
      }
      return accumulator;
    }, {});
    const mappedResult = Object.keys(formattedData).reduce(
      (accumulator, key) => {
        const date = new Date(key);
        if (accumulator[date.getMonth()]) {
          accumulator[date.getMonth()] += formattedData[key];
        } else if (!accumulator[date.getMonth()]) {
          accumulator[date.getMonth()] = formattedData[key];
        }
        return accumulator;
      },
      {}
    );
    let currentData = sessionStorage.getItem("COVID-DATA");
    currentData = !currentData ? {} : JSON.parse(currentData);
    currentData = { ...currentData, [country]: mappedResult };
    sessionStorage.setItem("COVID-DATA", JSON.stringify(currentData));
  }
  return <>{pageData === null ? renderSkeleton() : renderPage()}</>;
}

export default HomeContainer;
