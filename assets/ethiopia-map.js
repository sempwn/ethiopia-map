

var glob_data;
var glob_prevs;
/*
DEFINE CLASS SESSION DATA TO STORE AND RETRIEVE RUNS.
Data structure
session ---- scenarios ---- ---- ---- params
                       ----      ---- label
                       ----      ---- stats   ----  ts
                       ----                   ----  doses
                       ----                   ----  prev_reds
                       ----                   ----  num_rounds
                       ----
                       ----      ---- results ----  ---- ---- Ws
                       ----                   ----       ---- Ms
                       ----                   ----       ---- ts
                                              ----       ---- doses


*/
function SessionData(){}

SessionData.storeResults =  function(results,scenLabel,stats){
  //takes results: an Array of json with each json obj having ts, Ms, Ws.
  //combines these with parameter information and stores to be retrieved whenever.
  var sessionData = JSON.parse(localStorage.getItem('sessionDataEthiopia')); //retrieve session dat from storage.
  if ( (sessionData == null) || (sessionData.scenarios == null) ){
    sessionData = {'scenarios':[]};
  }
  if(scenLabel==null){
    scenLabel = 'Scenario ' + (ScenarioIndex.getIndex()+1);
  }
  var scenario = {'params': params,'results' : results, 'label' : scenLabel};
  var scenInd = ScenarioIndex.getIndex();

  sessionData.scenarios[scenInd] = scenario;
  toStore = JSON.stringify(sessionData);
  localStorage.setItem('sessionDataEthiopia', toStore);
  return sessionData;

}

SessionData.storeStats = function(stats){
  var sessionData = JSON.parse(localStorage.getItem('sessionDataEthiopia')); //retrieve session dat from storage.
  var scenInd = ScenarioIndex.getIndex();
  sessionData.scenarios[scenInd]['stats'] = stats;
  toStore = JSON.stringify(sessionData);
  localStorage.setItem('sessionDataEthiopia', toStore);
}

SessionData.createNewSession = function(){
  var sessionData = JSON.parse(localStorage.getItem('sessionDataEthiopia'));
  if ( (sessionData == null) || (sessionData.scenarios == null) ){
    sessionData = {'scenarios':[]};
  }
  var scenario = {'params': params,'results' : []};
  var scenInd = ScenarioIndex.getIndex();

  sessionData.scenarios[scenInd] = scenario;
  toStore = JSON.stringify(sessionData);

}

SessionData.deleteSession = function(){
  //delete session data to start fresh when page loads.
  localStorage.setItem('sessionDataEthiopia', null);
}



SessionData.retrieveSession = function(){
  var ses = JSON.parse(localStorage.getItem('sessionDataEthiopia'));
  if (ses && ses.scenarios && ses.scenarios[0] && ses.scenarios[0].label){
    return ses
  } else {
    ses = {'scenarios':[]};
    toStore = JSON.stringify(ses);
    localStorage.setItem('sessionDataEthiopia', toStore);
    return ses
  }
}
SessionData.numScenarios = function(){
  var ses = SessionData.retrieveSession();
  if ( (ses == null) || (ses.scenarios == null) ){
    return 0;
  } else {
    return ses.scenarios.length;
  }
}
SessionData.convertRun = function(m,endemicity){
  //convert model object to JSON for run.
 return {'ts' : m.ts, 'Ms' : m.Ms, 'Ws': m.Ws,
 'reductionYears':m.reductionYears(),'nRounds' : m.nRounds(),
         'endemicity':endemicity}
}

SessionData.nRounds = function(i){
  var ses = SessionData.retrieveSession();
  var scen = ses.scenarios[i];
  var n = scen.results.length;
  var rounds = [];
  for (var j = 0; j < n; j++){
    rounds.push(scen.results[j].nRounds);
  }
  return rounds;
}

SessionData.reductions = function(i,yr,endemicity){
  var ses = SessionData.retrieveSession();
  var scen = ses.scenarios[i];
  var n = scen.results.length;
  red = 0;
  var nn = 0;
  for (var j = 0; j < n; j++){
    if(endemicity){
      if (scen.results[j].endemicity == endemicity){
        red += scen.results[j].reductionYears[yr];
        nn += 1;
      }
    }else{
      red += scen.results[j].reductionYears[yr];
      nn += 1;
    }
  }
  return red/nn;
}

SessionData.ran = function(i){
  var ses = SessionData.retrieveSession();

  if(!ses){ return false }
  if(!ses.scenarios[i]){ return false }

  var res = ses.scenarios[i].results;
  if(res.length>0){
    return true
  } else {
    return false
  }
}
SessionData.deleteScenario = function(){
  var ind = ScenarioIndex.getIndex();
  var ses = SessionData.retrieveSession();
  ses.scenarios.splice(ind,1);
  var toStore = JSON.stringify(ses);
  localStorage.setItem('sessionDataEthiopia', toStore);
  ScenarioIndex.setIndex(0);

}
/*
functions for retrieving current scenario index
*/
function ScenarioIndex(){}
ScenarioIndex.getIndex = function(){
  return Number(localStorage.getItem('scenarioIndex'));
}
ScenarioIndex.setIndex = function(ind){
  try{
    var ses = SessionData.retrieveSession();
    var scen = ses.scenarios[ind];
    params = scen.params;
    $('#scenario-title').html(ses.scenarios[ind].label + ' Overview');
  }catch(err){}

  return localStorage.setItem('scenarioIndex',ind);
}
/*
Specific mapping functions
*/
function clearSession(){
  bootbox.confirm("Are you sure you want to delete this session? This will remove all scenarios.", function(result) {
    if(result){
      SessionData.deleteSession();
      createScenarioBoxes();
      scenarioComparisonSelectVisibility();
      drawMap();
      drawComparisonPlot();
      $('#scenario-title').html('Scenario Overview');
    }
  });
}

function scenarioComparisonSelectVisibility(){
  var ses = SessionData.retrieveSession();
  var n = (ses && ses.scenarios)? ses.scenarios.length : 0;
  if (n>0){
    $('#sel-comp-stat-div').show();
  } else {
    $('#sel-comp-stat-div').hide();
  }
}
function scenarioRunStats(){
  var scenInd = ScenarioIndex.getIndex();
  var dfrd = $.Deferred();
  var ts = [],dyrs=[],ryrs=[];
  d3.json('./assets/EthiopiaNew.json',function(err,data){

      var ts=[];
      var dyrs = [];
      for (var t = 0; t < 20; t++){
        cLow = SessionData.reductions(scenInd,Math.floor(t),'low');
        cMedium = SessionData.reductions(scenInd,Math.floor(t),'medium');
        cHigh = SessionData.reductions(scenInd,Math.floor(t),'high');
        var stats = reductionStatsCalc(data,cLow,cMedium,cHigh,params.covMDA);
        dyrs.push(stats.doses);
        ts.push(t);
        ryrs.push((1-stats.reduction)*100);
      }
      console.log(ts);
      console.log(dyrs);
      SessionData.storeStats({'ts': ts,'prev_reds' : ryrs,'doses':dyrs});
      drawComparisonPlot();
    });


}
function createScenarioBoxes(){
  var ses = SessionData.retrieveSession();
  var curScen = ScenarioIndex.getIndex();
  n = (ses && ses.scenarios)? ses.scenarios.length : 0;
  d3.select('#scenario-button-group').html('');
  if(n>0){
    d3.select('#scenario-button-group').append('h4')
    .html('Select scenario to map:');
  }
  for(var i=0;i<n;i++){
    d3.select('#scenario-button-group').append('div')
      .attr('class','btn btn-primary btn-lg btn-block '.concat((i==curScen)? 'active':''))
      .attr('id','scenario-button-'+i)
      .attr('data-scenario-label',ses.scenarios[i].label)
      .attr('data-scenario',i)
      .attr('aria-pressed',(i==curScen))
      .html(ses.scenarios[i].label)
      .on('click',function(){
        ScenarioIndex.setIndex($('#'+this.id).data('scenario'));
        setmodelParams();
        fixInput();
        drawMap();
        $('#close_scenario').html('show scenario');
        $('#scenario-messages').html('<div class="alert alert-success alert-dismissible" role="alert">  '
        + $('#'+this.id).data('scenario-label')
        + ' set </div>');
        $(this).addClass("active").siblings().removeClass("active");
        $('#delete_scenario').removeClass('hidden').unbind().click(function(){
          bootbox.confirm("Are you sure you want to delete this scenario?", function(result) {
            if(result){
              SessionData.deleteScenario();
              createScenarioBoxes();
              scenarioComparisonSelectVisibility();
              drawComparisonPlot();
              drawMap();
              $('#settings-modal').modal('hide');
            }
          });
        });
        $('#settings-modal').modal('show');

        if(SessionData.ran(i)){
          $('#run_scenario').html('Display Scenario');
        }else{
          $('#run_scenario').html('Run Scenario');
        }
      });
  }
  if (n>0){
    d3.select('#scenario-button-group').append('div').attr('class','divider');
    d3.select('#scenario-button-group').append('div')
    .attr('class','btn btn-danger btn-lg btn-block ')
    .html('Clear Session')
    .on('click',clearSession);
  }

}

function drawComparisonPlot(){
  var ses = SessionData.retrieveSession();
  if (ses.scenarios.length > 0){
    var option = $('#sel-comp-stat').val();
    if (option=="doses"){
      drawDosesTimeLine();
    }else if (option=="rounds"){
      drawMapBoxPlot();
    } else if(option=="prev"){
      drawPrevalenceTimeLine();
    }
  } else {
    Plotly.newPlot('map-boxplot',[], {height:10,width:10},{displayModeBar: false});
  }
}

function drawDosesTimeLine(){ //TODO: fix this function.
  var orgScenInd = ScenarioIndex.getIndex();
  var ses = SessionData.retrieveSession();
  var n = ses.scenarios.length;
  var traces = [];
  var cLow,cMedium,cHigh;
  var timeline_plot_layout = { //main layout format for plot.ly chart
    autosize: true,
    title: 'Doses per year',
    xaxis: {
      title: 'time since start of intervention (yrs)',
      showgrid: true,
      zeroline: false
    },
    yaxis: {
      title: 'doses',
      showline: false,
      rangemode: 'tozero',
      autorange: true,
      zeroline: true
    }
  };


    for (var scenInd = 0; scenInd < n; scenInd ++)
    {
      var ts = ses.scenarios[scenInd].stats.ts;
      var dyrs = ses.scenarios[scenInd].stats.doses;


      var trace = {
        x: ts,
        y: dyrs,
        mode: 'lines+markers',
        name: ses.scenarios[scenInd].label
      };
      traces.push(trace);

    }
    console.log(traces);
    Plotly.newPlot('map-boxplot', traces, timeline_plot_layout, {displayModeBar: false});
    ScenarioIndex.setIndex(orgScenInd);




}

function drawPrevalenceTimeLine(){
  var orgScenInd = ScenarioIndex.getIndex();
  var ses = SessionData.retrieveSession();
  var n = ses.scenarios.length;
  var traces = [];
  var cLow,cMedium,cHigh;
  var timeline_plot_layout = { //main layout format for plot.ly chart
    autosize: true,
    title: 'Reduction in Prevalence (%)',
    xaxis: {
      title: 'time since start of intervention (yrs)',
      showgrid: true,
      zeroline: false
    },
    yaxis: {
      title: 'Reduction in prevalence (%)',
      showline: false,
      rangemode: 'tozero',
      autorange: true,
      zeroline: true
    }
  };


    for (var scenInd = 0; scenInd < n; scenInd ++)
    {
      var ts = ses.scenarios[scenInd].stats.ts;
      var dyrs = ses.scenarios[scenInd].stats.prev_reds;
      var trace = {
        x: ts,
        y: dyrs,
        mode: 'lines+markers',
        name: ses.scenarios[scenInd].label
      };
      traces.push(trace);

    }

    Plotly.newPlot('map-boxplot', traces, timeline_plot_layout, {displayModeBar: false});
    ScenarioIndex.setIndex(orgScenInd);




}

function drawMapBoxPlot(){
  var ses = SessionData.retrieveSession();
  var n = ses.scenarios.length;
  var traces = [];
  for (var i = 0; i <n; i++){
    var trace = {
      y: SessionData.nRounds(i),
      type: 'box',
      name: ses.scenarios[i].label
    };
    traces.push(trace);
  }
  var box_plot_layout = { //main layout format for plot.ly chart
    autosize: true,
    title: 'No. rounds to below 1% microfilariaemia',
    xaxis: {
      title: '',
      showgrid: false,
      zeroline: false
    },
    yaxis: {
      title: 'No. rounds',
      showline: false,
      rangemode: 'tozero',
      autorange: true,
      zeroline: true
    }
  };

  Plotly.newPlot('map-boxplot', traces, box_plot_layout, {displayModeBar: false});
}

function createTimeLine(){
  var tooltip = d3.select('#tooltip');
  var res = d3.select('#map-outputs').select('h4');
  d3.json('./assets/EthiopiaNew.json',function(err,data){
    d3.select('#slider1').call(d3.slider().axis(true).min(2016).max(2016+19).step(1)
                                 .on("slide",function(evt,value){
                                   value = value - 2016;
                                   var scenInd = ScenarioIndex.getIndex();
                                   var cRed = SessionData.reductions(scenInd,Math.floor(value)); //TODO: use correct index.
                                   var cLow = SessionData.reductions(scenInd,Math.floor(value),'low');
                                   var cMedium = SessionData.reductions(scenInd,Math.floor(value),'medium');
                                   var cHigh = SessionData.reductions(scenInd,Math.floor(value),'high');
                                   stats = reductionStatsCalc(data,cLow,cMedium,cHigh,params.covMDA);
                                   res.html(
                                     value + ' years after intervention, ' + Math.round((1-stats.reduction)*100) + '% reduction, '
                                           + numberWithCommas(Math.round(stats.doses)) + ' doses given. '
                                   );
                                   // Make the changes
                                   d3.selectAll('path')
                                     .attr("class", function(d,i) {
                                       if(i<glob_prevs.length){
                                         return colorIU(data.features[i].properties.endemicity,
                                                        data.features[i].properties.prev,
                                                        data.features[i].properties.pop,cLow,cMedium,cHigh);
                                       }else{
                                         return colorIU(0,0,0,0,0,0);
                                       }

                                     })
                                     .on('mousemove', function(d,i) {
                                         tooltip.style("visibility", "visible").html("<h5 class='text-center'> "
                                         + data.features[i].properties.ADMIN1 + ", " + data.features[i].properties.ADMIN2 + ", "
                                         + data.features[i].properties.ADMIN3 + ", "
                                         + "prevalence : " + Math.round(100*data.features[i].properties.prev*cRed) + "%. "
                                         + "Population size : " + numberWithCommas(Math.round(data.features[i].properties.pop))
                                         + " </h5>");
                                     });
                                 })
                               );
  });

}

function resetSlider() {
  d3.select('#slider-div').html('');
  d3.select('#map-outputs h4').html('');
  d3.select("#slider-div").append("div").attr('id','slider1');
  createTimeLine();
}


function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function runMapSimulation(){
  setInputParams({'nMDA':40});
  var scenLabel = $('#inputScenarioLabel').val();
   //max number of mda rounds even if doing it six monthly.
  var maxN = 100;
  var runs = [];
  var progression = 0;
  fixInput();
  $('#map-progress-bar').css('width','0%');
  $('#map-progress-bar').show();
  var progress = setInterval(function()
  {

    $('#map-progress-bar').css('width',Number(progression*100/maxN)+'%');
    if (progression < maxN/3){
      endemicity = 'low';
      setInputParams({'endemicity': 5.0,'nMDA':40});
    } else if (progression < 2*maxN/3){
      endemicity = 'medium';
      setInputParams({'endemicity': 10.0,'nMDA':40});
    } else {
      endemicity = 'high';
      setInputParams({'endemicity': 15.0,'nMDA':40});
    }
    var m = new Model(800);
    m.evolveAndSaves(120.0);
    runs.push(SessionData.convertRun(m,endemicity));
    $('#roundsTest').html(progression*100/maxN + '%');
    if(progression == maxN) {
      $('#map-progress-bar').hide();
      clearInterval(progress);
      SessionData.storeResults(runs,scenLabel);
      scenarioRunStats();
      createScenarioBoxes();
      scenarioComparisonSelectVisibility();
      drawMap();
      $('#scenario-title').html(scenLabel + ' Overview');
      $('#settings-modal').modal('hide');


    } else {
      progression += 1;
    }
  }, 10);
}

function reductionStatsCalc(data,cLow,cMedium,cHigh,coverage){
  var n = data.features.length;
  var nn = 0;
  var totR=0;
  var doses = 0;
  var end = '';
  var doses_year = (params.mdaFreq==6)? 2 : 1;
  for (var i = 0; i<n; i++){
    end = data.features[i].properties.endemicity;
    prev = data.features[i].properties.prev;
    pop = data.features[i].properties.pop;

    if (end=='low'){
      totR += cLow;
      nn += 1;
      if(prev*cLow>0.01) doses += pop*coverage*doses_year;
    } else if (end=='medium'){
      totR += cMedium;
      nn += 1;
      if(prev*cMedium>0.01) doses += pop*coverage*doses_year;
    } else if (end == 'high'){
      totR += cHigh;
      nn += 1;
      if(prev*cHigh>0.01) doses += pop*coverage*doses_year;
    } else {

    }
  }
  return {'reduction': totR/nn,'doses' : doses};

}

var quantize = d3.scale.quantize()
      .domain([0, 0.15])
      .range(d3.range(9).map(function(i) { return "q" + i + "-9"; }));

var quantizeDoses = d3.scale.quantize()
      .domain([0, 100000])
      .range(d3.range(9).map(function(i) { return "q" + i + "-9"; }));

var quantizeTAS = d3.scale.quantize()
            .domain([0, 1])
            .range(d3.range(2).map(function(i) { return "qTAS" + i + "-1"; }));

function colorIU(end,prev,pop,cLow,cMedium,cHigh){
  var stat = $( "#sel-stat" ).val();
  var coverage = params.covMDA; //TODO: maybe change this??
  var doses = 0;
  if (end=='low'){
    rPrev = prev*cLow;
    pTAS = (prev*cLow<0.01);
    if(prev*cLow>0.01) doses = pop*coverage;
  } else if (end=='medium'){
    rPrev = prev*cMedium;
    pTAS = (prev*cMedium<0.01);
    if(prev*cMedium>0.01) doses = pop*coverage;
  } else if (end == 'high'){
    rPrev = prev*cHigh;
    pTAS = (prev*cHigh<0.01);
    if(prev*cHigh>0.01) doses = pop*coverage;
  } else {
    doses = 0;
    pTAS = 1;
    rPrev = 0.0;
  }
  var colClass;
  if (stat=='prev'){

    colClass = quantize(rPrev);
  } else if (stat=='pTAS'){

    colClass = quantizeTAS(pTAS);
  } else if (stat=='doses'){
    colClass = quantizeDoses(doses);
  } else {
    var colClass = quantize(0);
  }
    return "iu " + colClass;
}

function modalConfirmation(i){
  if (SessionData.ran(i)){
    ScenarioIndex.setIndex(i);
    $('#settings-modal').modal('hide');

  } else {
    runSimClick();
  }
}

function addScenarioButton(){
  //TODO: add length of scenarios function.
  var i = SessionData.numScenarios();
  ScenarioIndex.setIndex(i);
  SessionData.createNewSession();
  $('#scenario-messages').html('');
  $('#delete_scenario').addClass('hidden');
  $('#settings-modal').modal('show');
  $('#close_scenario').html('close');
  fixInput(false);
}

function runSimClick(){
  runMapSimulation();
  var res = d3.select('#map-outputs').select('h4');
}

function drawMap() {
  d3.json('./assets/EthiopiaNew.json',function(err,data){
    d3.selectAll('path')
      .attr("class", function(d,i) {
        if(i<glob_prevs.length){
          return colorIU(data.features[i].properties.endemicity,
                         data.features[i].properties.prev,
                         data.features[i].properties.pop,1.0,1.0,1.0);
        }else{
          return colorIU(0,0,0,0,0,0);
        }

      }).on('mousemove', function(d,i) {
        d3.select('#tooltip').style("visibility", "visible").html("<h5 class='text-center'> "
        + data.features[i].properties.ADMIN1 + ", " + data.features[i].properties.ADMIN2 + ", "
        + data.features[i].properties.ADMIN3 + ", "
        + "prevalence : " + Math.round(100*data.features[i].properties.prev) + "%. "
        + "Population size : " + numberWithCommas(Math.round(data.features[i].properties.pop))
        + " </h5>");
      });
    });
    if(SessionData.ran(ScenarioIndex.getIndex())){
      resetSlider();
    }
}

function fixInput(fix_input){
  var curScen = ScenarioIndex.getIndex();
  if (fix_input == null){
    fix_input = true;
  }
  if (fix_input){
    $('#MDACoverage').slider('disable');
    $('#bedNetCoverage').slider('disable');
    $('#insecticideCoverage').slider('disable');
    $('#Microfilaricide').slider('disable');
    $('#Macrofilaricide').slider('disable');
    $('#run_scenario').hide();
    $('input:radio[name=mdaSixMonths]').attr('disabled',true);
    $('input:radio[name=mdaRegimenRadios]').attr('disabled',true);
    $('#inputScenarioLabel').attr('disabled',true);
  } else {
    $('#MDACoverage').slider('enable');
    $('#bedNetCoverage').slider('enable');
    $('#insecticideCoverage').slider('enable');
    $('#Microfilaricide').slider('enable');
    $('#Macrofilaricide').slider('enable');
    $('#run_scenario').show();
    $('input:radio[name=mdaSixMonths]').attr('disabled',false);
    $('input:radio[name=mdaRegimenRadios]').attr('disabled',false);
    $('#inputScenarioLabel').attr('disabled',false).val('Scenario '+(curScen+1));

  }
  if($("input[name=mdaRegimenRadios]:checked").val()==5){
    $('#custom-regimen-sliders').show();
  } else{
    $('#custom-regimen-sliders').hide();
  }
}
function setmodelParams(fixInput){
  if (fixInput == null){
    fixInput = false;
  }
  var scenInd = ScenarioIndex.getIndex();
  var ses = SessionData.retrieveSession();
  var ps = ses.scenarios[scenInd].params.inputs;
  $('#inputScenarioLabel').val(ses.scenarios[scenInd].label);
  $("#inputMDARounds").val(ps.mda);
  $('#MDACoverage').slider('setValue', Number(ps.coverage));
  $('#bedNetCoverage').slider('setValue',Number(ps.covN));
  $('#insecticideCoverage').slider('setValue', Number(ps.v_to_hR));
  $('input:radio[name=mdaSixMonths]').filter('[value='+ps.mdaSixMonths +']').prop('checked', true);
  $('input:radio[name=mdaRegimenRadios]').filter('[value='+ps.mdaRegimen +']').prop('checked', true);
  $('#Microfilaricide').slider('setValue',Number(ps.microfilaricide));
  $('#Macrofilaricide').slider('setValue',Number(ps.macrofilaricide));
  return {"mda" : $("#inputMDARounds").val(), "mdaSixMonths" : $("input:radio[name=mdaSixMonths]:checked").val(),
      "endemicity" : $('#endemicity').val(), "coverage": $("#MDACoverage").val(),
      "covN" : $('#bedNetCoverage').val(), "v_to_hR" : $('#insecticideCoverage').val(),
      "vecCap" : $('#vectorialCapacity').val(), "vecComp" : $('#vectorialCompetence').val(),
      "vecD" : $('#vectorialDeathRate').val(), "mdaRegimen" : $("input[name=mdaRegimenRadios]:checked").val(),
      "sysComp" : $('#sysAdherence').val(), "rhoBComp" : $('#brMda').val(), "rhoCN"  : $('#bedNetMda').val(),
      "species" : $("input[name=speciesRadios]:checked").val(),
      "macrofilaricide" : $('#Macrofilaricide').val(), "microfilaricide" : $('#Microfilaricide').val()
    }
}

$(document).ready(function(){
  //first remove previous session data.
  //SessionData.deleteSession();
  var width = $('#map').width(), height=350;
  var tooltip = d3.select('#map').append('div')
      .style("visibility", "hidden")
      .attr("id","tooltip")
      .html('');
  var canvas = d3.select("#map").append("svg")
        .attr("width", width)
        .attr("height", height);

  ScenarioIndex.setIndex(0);
  if (SessionData.ran(0)){
    resetSlider();
  }
  createScenarioBoxes();
  scenarioComparisonSelectVisibility();
  drawComparisonPlot();
  $('#sel-comp-stat').change(drawComparisonPlot);
  $('#add-new-scenario').on('click',addScenarioButton);
  $('#run_scenario').on('click',modalConfirmation);
  //Draw scenario boxes.
  $('#map-progress-bar').hide();
  $( "#sel-stat" ).change(drawMap);




  queue()
      .defer(d3.json, "./assets/EthiopiaNew.json") //ETH_IUs.json
      .defer(d3.csv, "./assets/ETH_prev.csv")
      .await(ready);

  //d3.csv('/assets/ETH_prev.csv',function(d){ glob_prevs = d}); // for debugging purposes.


  function ready(error, data, prev_datas) {
            d3.select('#map').select('img').remove();
            glob_data = data; //debug this.
            glob_prevs = prev_datas;
            console.log(data.features.length + ' ' + glob_prevs.length);
            //var prevs = new Array(data.geometries.length); //data.geometries.length
            //for (i=0; i< prevs.length; i++){
            //  console.log(i);
            //  prevs[i] = glob_prevs[i].meanpMF;
            //}
            console.log(glob_data);
            var group = canvas.selectAll("g")
                .data(data.features) //data.geometries
                .enter()
                .append("g");
            //var projection = d3.geo.albers()
            //                    .center([0, 9.1])
            //                    .rotate([40.4, 0])
            //                    .parallels([0, 20])
            //                    .scale(1200 * 5)
            //                    .translate([width / 2, height / 2]);

            //var path = d3.geo.path()
            //    .projection(projection);




            var projection = d3.geo.mercator().center([40.4,9.1]).translate([width / 2, height / 2]);
            var projection2 = d3.geo.equirectangular()
                              .center([40.4,8.0]) //40.4,4.0
                              .scale(1500)
                              .translate([width / 2, height / 2])
                              .precision(.1);
            var path = d3.geo.path().projection(projection2);
            var areas = group.append("path")
                .attr("d", path)
                .attr("id",function(d,i){return i})
                .attr("class", function(d,i) {

                  return colorIU(data.features[i].properties.endemicity,
                                 data.features[i].properties.prev,
                                 data.features[i].properties.pop,1.0,1.0,1.0);
                })
                .attr("data-prev",function(d,i){
                  if(i<glob_prevs.length){
                    return data.features[i].properties.prev;
                  }else{
                    return Math.random();
                  }
                })
                .on('mousemove', function(d,i) {
                    tooltip.style("visibility", "visible").html("<h5 class='text-center'> "
                    + data.features[i].properties.ADMIN1 + ", " + data.features[i].properties.ADMIN2 + ", "
                    + data.features[i].properties.ADMIN3 + ", "
                    + "prevalence : " + Math.round(100*data.features[i].properties.prev) + "%. "
                    + "Population size : " + numberWithCommas(Math.round(data.features[i].properties.pop))
                    + " </h5>");
                })
                .on('mouseout', function() {
                    tooltip.style("visibility", "hidden");
                });
        }



});
