$(document).ready(function() {

	var width = $('#world_map').width(),
	    height = 0.52 * width;

	var projection = d3.geo.orthographic()
	    .scale(100)
	    .clipAngle(90)
	    .translate([width * 0.5,height * 0.5]);

	var canvas = d3.select("#world_map").append("canvas")
	    .attr("width", width)
	    .attr("height", height)
	    .attr("max-width",width)
	    .attr("max-height",height)
	    .attr("class","text-center");

	var c = canvas.node().getContext("2d");

	var path = d3.geo.path()
	    .projection(projection)
	    .context(c);

	var title = d3.select("#world_map h1");
	var formCoverage = d3.select("#coverage-form");
	var formName = d3.select("#country-name-form");
	var formMDA = d3.select("#mda-form");
	queue()
	    .defer(d3.json, "./assets/world/world-110m.json")
	    .defer(d3.tsv, "./assets/world/country-LF.tsv")
	    .await(ready);


	function ready(error, world, names) {
	  var globe = {type: "Sphere"},
	      land = topojson.feature(world, world.objects.land),
	      countries = topojson.feature(world, world.objects.countries).features,
	      borders = topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }),
	      i = -1,
	      n = countries.length;

	  countries = countries.filter(function(d) {
	    return names.some(function(n) {
	      if (d.id == n.id) return d.name = n.name;
	    });
	  }).sort(function(a, b) {
	    return a.name.localeCompare(b.name);
	  });
      
	  d3.select("#selectCountry")
      .selectAll("option")
      .data(countries)
      .enter()
        .append("option")
        .attr("value", function (d,i) { return i; })
        .text(function (d) { return d.name; });

	  (function transition() {
	    d3.transition()
	        .duration(10)
	        .each("start", function() {
	          title.text(countries[i=$('#world_map select').val()].name);
	          formName.text(countries[i].name);
	          formCoverage.text(names[i].coverage);
	          formMDA.text(names[i].mda);
	          
	        })
	        .tween("rotate", function() {
	          var p = d3.geo.centroid(countries[i]),
	              r = d3.interpolate(projection.rotate(), [-p[0], -p[1]]);
	          return function(t) {
	            projection.rotate(r(t));
	            c.clearRect(0, 0, width, height);
	            c.fillStyle = "#bbb", c.beginPath(), path(land), c.fill();
	            c.fillStyle = "#f00", c.beginPath(), path(countries[i]), c.fill();
	            c.strokeStyle = "#fff", c.lineWidth = .5, c.beginPath(), path(borders), c.stroke();
	            c.strokeStyle = "#000", c.lineWidth = 2, c.beginPath(), path(globe), c.stroke();
	          };
	        })
	      .transition()
	        .each("end", transition);
	  })();
	}

});