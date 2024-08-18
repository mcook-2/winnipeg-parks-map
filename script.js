/******w**************

    Assignment 4 Javascript
    Name: Mckenzie Cook
    Date: 02.24.2024
    Description: Dynamic Winnipeg Park & Open Space Map JS
    leaflet api + AJAX geoJson data

*********************/

/*
This JavaScript file makes a dynamic map of Winnipeg's parks and open spaces using Leaflet API and AJAX GeoJSON data.
It fetches park information from the "City of Winnipeg Parks and Open Spaces" GeoJson data and displays it on the map.
The script allows users to search for parks by name and see detailed information when hovering over park areas.
It also lets users filter parks by electoral ward, district, or neighborhood, by updating the map.
When a park is hovered over it will update the text content in the search bar.
The search bar will provide more information on the park using a AJAX fetch. limited to 100 and ordered alphabetically.
*/

/*
I have used leaflets "Interactive Choropleth Map" tutorial for referance for this map.
Which can be found here "https://leafletjs.com/examples/choropleth/".
*/


// Check if Leaflet library is available
document.addEventListener('DOMContentLoaded', function() {

    // geoJson defalut url
    var defaultUrlString = 'https://data.winnipeg.ca/resource/tx3d-pfxq.geojson?' +
        '$limit=2000'; // there is currently only 1339 parks/open spaces in the geoJson dataset
    var url = encodeURI(defaultUrlString);

    // Initialize the map
    const map = L.map('map').setView([49.876025652254526, -97.1142843482076], 13); // Winnipeg Coordinates
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 15,
        minZoom: 0,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);


    /*
    getGeoJsonMap(url)

    fetches GeoJSON data from the URL param and uses it to populate the map with park polygons(or multipolygons).
    It iterates over each feature in the GeoJSON data, creates a GeoJSON layer for each park polygon, and adds it to the map.
    I needed to "reorganize" the geoJSON data to replace the defalut geometry data with polygons coordinates.
    By defalut L.geoJSON() grabs the geometry key.
    Applied (to the "map layer") styling options such as line weight, color, opacity, and fill color and event listeners for mouse interactions are attached.
    When a user hovers over a park polygon, detailed information about the park is displayed, and clicking on a park polygon zooms the map to focus on that specific park.

    This function will be reused to display map info based on the url provided (AJAX fetch)
    */

    function getGeoJsonMap(url) {

        //Remove previous map layer
        map.eachLayer(function(layer) {
            if (!layer.hasOwnProperty('_url')) {
                map.removeLayer(layer);
            }
        });

        // Fetch GeoJSON data to populate map
        fetch(url)
            .then(function(response) {
                return response.json();
            })
            .then(function(geojsonData) {
                // Iterate each "feature" in the GeoJSON data
                geojsonData.features.forEach(feature => {
                    const coordinates = feature.properties.geometry.coordinates;
                    const area = feature.properties.area_in_hectares;
                    const properties = feature.properties;

                    // Create a GeoJSON layer with style and event listeners
                    const layer = L.geoJSON({
                        "type": "Feature",
                        "geometry": {
                            "type": feature.properties.geometry.type,
                            "coordinates": coordinates
                        },
                        "properties": properties
                    }, {
                        style: function(feature) {
                            return {
                                weight: 2,
                                opacity: 1,
                                dashArray: '3',
                                color: '#9F9F9F',
                                fillOpacity: 0.7,
                                fillColor: getColor(area)
                            };
                        },
                        onEachFeature: function(feature, layer) {
                            layer.on({
                                mouseover: function(e) {
                                    highlightFeature(e, properties);
                                },
                                mouseout: resetHighlight,
                                click: zoomToFeature
                            });
                        }
                    }).addTo(map);

                });
            });
    }

    // Retrieve complete park info on page load.
    getGeoJsonMap(url);


    /*
    Simialar to getGeoJsonMap()
    This is an AJAX call to retrieve data for select elements (electoral wards, districts, and neighborhoods) from "defaultUrlString".
    The retrieved GeoJSON data is extracted for "unique values" of electoral wards, districts, and neighborhoods.
    Each unique value is sorted alphabetically and will be output as such.
    HTML options for select elements are generated based on the extracted values, (converting them to lowercase and frist char uppercase for data consistency).
    The generated HTML options are then appended to their select elements.
    Select elements are auto generated from the GeoJSON data.
    */

    // get select data
    fetch(url)
        .then(function(response) {
            return response.json();
        })
        .then(function(geojsonData) {
            // Arrays for electoral wards, districts, and neighborhoods from GeoJSON properties
            const electoralWards = [];
            const districts = [];
            const neighborhoods = [];

            geojsonData.features.forEach(feature => {
                const electoralWard = feature.properties.electoral_ward;
                const district = feature.properties.district;
                const neighborhood = feature.properties.neighbourhood;

                if (!electoralWards.includes(electoralWard)) {
                    electoralWards.push(electoralWard);
                }

                if (!districts.includes(district)) {
                    districts.push(district);
                }

                if (!neighborhoods.includes(neighborhood)) {
                    neighborhoods.push(neighborhood);
                }
            });

            // Sort electoral wards, districts, and neighborhoods alphabetically
            electoralWards.sort();
            districts.sort();
            neighborhoods.sort();

            // Generate HTML for select options for electoral ward, district & neighborhood
            const electoralWardOptions = electoralWards.map(ward => `<option value="${ward}">${ward.charAt(0) + ward.slice(1).toLowerCase()}</option>`).join("");

            const districtOptions = districts.map(district => `<option value="${district}">${district.charAt(0) + district.slice(1).toLowerCase()}</option>`).join("");

            const neighborhoodOptions = neighborhoods.map(neighborhood => `<option value="${neighborhood}">${neighborhood.charAt(0).toUpperCase() + neighborhood.slice(1).toLowerCase()}</option>`).join("");

            // Append select options to select elements
            const electoralWardSelect = document.getElementById("electoral_ward");
            electoralWardSelect.innerHTML = electoralWardOptions;

            const districtSelect = document.getElementById("district");
            districtSelect.innerHTML = districtOptions;

            const neighborhoodSelect = document.getElementById("neighbourhood");
            neighborhoodSelect.innerHTML = neighborhoodOptions;
        });

    /*
    This event listener handles the click event for the "submit_radio" button.
    It retrieves the selected radio button option (electoral ward, district, neighborhood, or "all").
    Based on the option selected, it constructs a URL to fetch corresponding GeoJSON data from the Winnipeg Parks dataset.
    If "all" is selected, it fetches all park data from the "defaultUrlString" .
    When choosen specific options (electoral ward, district, or neighborhood), it constructs a URL with a query parameter to filter parks.
    The constructed URL is then passed to the "getGeoJsonMap()" function to update the map.
    */

    document.getElementById('submit_radio').addEventListener('click', function() {
        const selectedOption = document.querySelector('input[name="selected_option"]:checked').value;
        var selectURL;

        if (selectedOption === 'all') {
            // there is currently only 1339 parks/open spaces in the geoJson dataset
            selectURL = url;
        } else {
            const selectValue = document.getElementById(selectedOption).value;

            if (selectedOption === 'electoral_ward' || selectedOption === 'district' || selectedOption === 'neighbourhood') {
            // Construct the URL
                selectURL = 'https://data.winnipeg.ca/resource/tx3d-pfxq.geojson?' +
                '$where=' + selectedOption + "='" + selectValue + "'";
            }
        }

        selectURL = encodeURI(selectURL)
        getGeoJsonMap(selectURL);

    });


    // ---------------------- Leaflet Map Configuration for Park Data Display ------------------------------//

    // control that shows state info on hover
    const info = L.control();

    // create park info window on add
    info.onAdd = function(map) {

        this._div = L.DomUtil.create('div', 'info');
        this.update();
        return this._div;
    };

    // Update the info window based on GeoJSON map data
    info.update = function(props) {
        const contents = props ?
            `<h3><b>${props.park_name}</b></h3><br />
             <b>Location:</b> ${props.location_description}<br />
             <b>Neighbourhood:</b> ${props.neighbourhood}<br />
             <b>Electoral Ward:</b> ${props.electoral_ward}<br />
             <b>District:</b> ${props.district}<br />
             <b>Area (ha):</b> ${props.area_in_hectares}<br />
             <b>Land Area (ha):</b> ${props.land_area_in_hectares}<br />
             <b>Water Area (ha):</b> ${props.water_area_in_hectares}<br />` :
            'Hover over a park';
        this._div.innerHTML = `<h2>Park Information</h2>${contents}`;
    };

    info.addTo(map);

    // Colors go from "darkgreen" to "light green based" based on Hector value in GeoJSON data, else is the color "red"
    function getColor(d) {
        return d > 200.0 ? '#082300' :
            d > 150.0 ? '#0F4000' :
            d > 100.0 ? '#145400' :
            d > 75.0 ? '#1F6B07' :
            d > 50.0 ? '#218A00' :
            d > 25.0 ? '#26A100' :
            d > 15.00 ? '#2EC400' :
            d > 10.00 ? '#35E100' :
            d > 5.00 ? '#39F001' :
            d > 2.50 ? '#3CFF00' :
            d > 1.50 ? '#AEE100' :
            d > 0.75 ? '#C5FF00' :
            '#7f0000';
    }

    let hoveredPark = null; // Variable to store the currently hovered park

    function resetHighlight(e) {
        const layer = e.target;
        layer.setStyle({
            weight: 2,
            color: '#9F9F9F',
            fillOpacity: 0.7
        });
        if (hoveredPark !== null) {
            info.update(hoveredPark.feature.properties); // Update with the previously hovered park info
        } else {
            info.update(); // Clear the info control if no park is hovered
        }
    }

    function highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({
            weight: 5,
            color: '#666',
            dashArray: '3',
            fillOpacity: 0.7
        });
        layer.bringToFront();
        hoveredPark = layer; // Update the currently hovered park
        info.update(layer.feature.properties); // Update the info control with feature properties

        // Get the name of the park and update the form input
        const parkName = layer.feature.properties.park_name;
        const searchInput = document.getElementById('search');
        searchInput.value = parkName; // Add value to textbox
    }

    //zoom on park click
    function zoomToFeature(e) {
        map.fitBounds(e.target.getBounds());
    }

    // Add link to City of Winnipeg Parks and Open Space data
    map.attributionControl.addAttribution('Parks and Open Space data, <a href="https://data.winnipeg.ca/Parks/Parks-and-Open-Space/tx3d-pfxq/about_data">City of Winnipeg Open Data</a>');

    // Creating scale legend
    const legend = L.control({
        position: 'bottomleft'
    });

    // populate the scale legend based on size(ha), from low to high. Add color to legend.
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'info legend');
        const grades = [0, 0.1, 2.5, 5, 10, 15, 25, 50, 75, 100, 150, 200];
        const labels = [];
        let from, to;

        // Add label indicating units
        div.innerHTML += '<h4>Area (ha)</h4>';

        for (let i = 0; i < grades.length; i++) {
            from = grades[i];
            to = grades[i + 1];

            if (from < 0.1) {
                labels.push(`<span class="legend-color" style="background:#7f0000"></span> 0.1<`);
            } else {
                labels.push(`<span class="legend-color" style="background:${getColor(from + 1)}"></span> ${from}${to ? `&ndash;${to}` : '+'}`);
            }
        }

        div.innerHTML += labels.join('<br>');
        return div;
    };

    legend.addTo(map);

    // ----------------------------------  Parks Data Form Functions  ----------------------------------------//

    /*
    fetchParks(searchQuery)

    Gets park data based on a "search query" param.
    parkUrl query is case insensitive.
    Constructs the URL with the search query, orders the results by park name,
    and limits the number of results to 100.
    Parses the response as JSON and returns the array of park feature objects.
    If an error occurs during the fetch request, logs the error to the console.
    */

    function fetchParks(searchQuery) {
        const parkUrl = 'https://data.winnipeg.ca/resource/tx3d-pfxq.geojson?' +
            `$where=lower(park_name) LIKE lower('%${searchQuery}%')` +
            '&$order=park_name' +
            '&$limit=100';
        const searchURL = encodeURI(parkUrl);

        return fetch(searchURL)
            .then(function(result) {
                return result.json();
            })
            .then(function(retrieved) {
                return retrieved.features; // Return the array of feature objects
            })
            .catch(error => {
                console.error('Error fetching park data:', error);
            });
    }


    /*
    displayParks(parks)

    This function is for appending park data to the HTML.
    It populates the table with park information based on the provided array of park objects.
    If no parks are found, it displays a message indicating that no parks were found.
    Otherwise, it iterates over the park data and creates table rows with park properties
    in the desired order.
    */

    function displayParks(parks) {
        const parkTableBody = document.querySelector('#parkTable tbody');
        const parkCountMessage = document.getElementById('parkCount');
        parkTableBody.innerHTML = ''; // Clear previous data

        if (parks.length === 0) {
            parkTableBody.innerHTML = '<tr><td colspan="13">No parks found.</td></tr>';
        } else {
            parkCountMessage.textContent = `Found ${parks.length} parks.`; // Update park count message
            parks.forEach(park => {
                const parkRow = document.createElement('tr');

                // Map properties to display in order
                const propertiesOrder = [
                    'park_id',
                    'park_name',
                    'location_description',
                    'classification_type',
                    'linear_park_system',
                    'park_category',
                    'district',
                    'electoral_ward',
                    'neighbourhood',
                    'cca',
                    'area_in_hectares',
                    'land_area_in_hectares',
                    'water_area_in_hectares'
                ];

                propertiesOrder.forEach(propertyName => {
                    const cell = document.createElement('td');
                    cell.textContent = park.properties[propertyName] || ''; // If property doesn't exist, display empty string
                    parkRow.appendChild(cell);
                });

                parkTableBody.appendChild(parkRow);
            });
        }
    }

    /*
    This event listener is triggered when a form is submitted.
    PreventDefault() is called so form submission is keeping the user on the same page.
    It gets the "search query" from the input field, trims whitespace from the search query,
    and checks if the search query is empty. If the search query is empty, it displays "No parks found.".
    If the search query is not empty, it fetches parks based on the search query and displays them.
    */

    // Event listener for form submission
    document.getElementById('form').addEventListener('submit', async function(event) {
        event.preventDefault(); // Prevent default form submission behavior
        const searchQuery = document.getElementById('search').value.trim();

        if (!searchQuery) {
            // If search query is empty after trimming, display "No parks found."
            displayParks([]);
        } else {
            // If search query is not empty, fetch parks and display them
            const parks = await fetchParks(searchQuery);
            displayParks(parks);
        }
    });

}); //end of DOMContentLoaded